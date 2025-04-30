from flask import Blueprint, request, jsonify, send_file, current_app
import os
import io
import json
import base64
import random
import shutil
import zipfile
import uuid
import time
import math
import threading
import traceback
import concurrent.futures
from werkzeug.utils import secure_filename
from tempfile import mkdtemp
from datetime import datetime
import cv2
import numpy as np
from app import db
from models.image import ImageCorrection
from services.model_loader import load_active_model, locate_fracture_in_image
import tensorflow as tf
dataset_routes = Blueprint('dataset', __name__, url_prefix='')

# Store processing sessions
processing_sessions = {}

@dataset_routes.route('/extract-dataset', methods=['POST'])
def extract_dataset():
    try:
        # Get the training percentage from the request
        data = request.json
        training_percentage = data.get('training_percentage', 80)
        
        # Validate percentage
        if not 0 < training_percentage < 100:
            return jsonify({'error': 'Training percentage must be between 1 and 99'}), 400
            
        # Create temporary directory for dataset
        temp_dir = mkdtemp()
        dataset_dir = os.path.join(temp_dir, 'dataset')
        
        # Create directory structure
        os.makedirs(os.path.join(dataset_dir, 'training', 'fractured'), exist_ok=True)
        os.makedirs(os.path.join(dataset_dir, 'training', 'non_fractured'), exist_ok=True)
        os.makedirs(os.path.join(dataset_dir, 'testing', 'fractured'), exist_ok=True)
        os.makedirs(os.path.join(dataset_dir, 'testing', 'non_fractured'), exist_ok=True)
        
        # Get all images from database
        fractured_images = ImageCorrection.query.filter_by(correction_type='fractured').all()
        non_fractured_images = ImageCorrection.query.filter_by(correction_type='no-fracture').all()
        
        # Randomly shuffle images
        random.shuffle(fractured_images)
        random.shuffle(non_fractured_images)
        
        # Calculate split indices
        fractured_train_count = int(len(fractured_images) * training_percentage / 100)
        non_fractured_train_count = int(len(non_fractured_images) * training_percentage / 100)
        
        # Split and save images directly from binary data
        # Fractured - Training
        for i, img in enumerate(fractured_images[:fractured_train_count]):
            # Use annotated image if available, otherwise use original
            image_data = img.annotated_image if img.annotated_image else img.original_image
            if image_data:
                # Create a unique filename based on image ID
                dest_filename = f"img_{img.image_id}_{img.id}.jpg"
                dest_path = os.path.join(dataset_dir, 'training', 'fractured', dest_filename)
                with open(dest_path, 'wb') as f:
                    f.write(image_data)
        
        # Fractured - Testing
        for i, img in enumerate(fractured_images[fractured_train_count:]):
            image_data = img.annotated_image if img.annotated_image else img.original_image
            if image_data:
                dest_filename = f"img_{img.image_id}_{img.id}.jpg"
                dest_path = os.path.join(dataset_dir, 'testing', 'fractured', dest_filename)
                with open(dest_path, 'wb') as f:
                    f.write(image_data)
        
        # Non-Fractured - Training
        for i, img in enumerate(non_fractured_images[:non_fractured_train_count]):
            if img.original_image:
                dest_filename = f"img_{img.image_id}_{img.id}.jpg"
                dest_path = os.path.join(dataset_dir, 'training', 'non_fractured', dest_filename)
                with open(dest_path, 'wb') as f:
                    f.write(img.original_image)
        
        # Non-Fractured - Testing
        for i, img in enumerate(non_fractured_images[non_fractured_train_count:]):
            if img.original_image:
                dest_filename = f"img_{img.image_id}_{img.id}.jpg"
                dest_path = os.path.join(dataset_dir, 'testing', 'non_fractured', dest_filename)
                with open(dest_path, 'wb') as f:
                    f.write(img.original_image)
        
        # Create a metadata file with dataset information
        metadata = {
            'dataset_info': {
                'training_percentage': training_percentage,
                'testing_percentage': 100 - training_percentage,
                'total_images': len(fractured_images) + len(non_fractured_images),
                'fractured_images': {
                    'total': len(fractured_images),
                    'training': fractured_train_count,
                    'testing': len(fractured_images) - fractured_train_count
                },
                'non_fractured_images': {
                    'total': len(non_fractured_images),
                    'training': non_fractured_train_count,
                    'testing': len(non_fractured_images) - non_fractured_train_count
                },
                'created_at': datetime.now().isoformat()
            }
        }
        
        with open(os.path.join(dataset_dir, 'dataset_metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Create a zip file of the dataset
        zip_path = os.path.join(temp_dir, 'x-ray-dataset.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for root, dirs, files in os.walk(dataset_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, os.path.relpath(file_path, temp_dir))
        
        # Return the zip file
        return send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'x-ray-dataset-{training_percentage}pct-training.zip'
        )
        
    except Exception as e:
        current_app.logger.error(f"Error extracting dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary directory when done
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            current_app.logger.warning(f"Error cleaning up temp directory: {str(e)}")


@dataset_routes.route('/upload-xrays', methods=['POST'])
def upload_xrays():
    try:
        # Check if files were uploaded
        if 'files' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('files')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No files selected'}), 400
        
        # Get threshold parameter if provided
        threshold = float(request.form.get('threshold', 0.3))
        
        # Create a session ID
        session_id = str(uuid.uuid4())
        UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
        session_upload_folder = os.path.join(UPLOAD_FOLDER, session_id)
        os.makedirs(session_upload_folder, exist_ok=True)
        
        # Save all uploaded files
        file_paths = []
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(session_upload_folder, filename)
                file.save(file_path)
                file_paths.append(file_path)
        
        # Check if we have an active model before proceeding
        with current_app.app_context():
            from models.training import ModelTraining
            MODEL_PATH = current_app.config['MODEL_PATH']
            active_model = ModelTraining.query.filter_by(is_active=True).first()
            if not active_model and not os.path.exists(MODEL_PATH):
                return jsonify({
                    'error': 'No active model available. Please train and activate a model first.'
                }), 400
        
        # Initialize processing session
        processing_sessions[session_id] = {
            "status": "processing",
            "progress": 0,
            "created_at": datetime.now().isoformat(),
            "file_count": len(file_paths)
        }
        
        # Start processing thread
        processing_thread = threading.Thread(
            target=process_files,
            args=(session_id, file_paths, threshold)
        )
        processing_thread.daemon = True
        processing_thread.start()
        
        return jsonify({
            'session_id': session_id,
            'message': f'Processing {len(file_paths)} files with threshold {threshold}'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@dataset_routes.route('/processing-status/<session_id>', methods=['GET'])
def processing_status(session_id):
    if session_id not in processing_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = processing_sessions[session_id]
    response = {
        'status': session['status'],
        'progress': session['progress']
    }
    
    # Include stats if processing completed
    if session['status'] == 'completed' and 'stats' in session:
        response['stats'] = session['stats']
    
    # Include error if processing failed
    if session['status'] == 'failed' and 'error' in session:
        response['error'] = session['error']
    
    return jsonify(response)


@dataset_routes.route('/download-results/<session_id>', methods=['GET'])
def download_results(session_id):
    if session_id not in processing_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = processing_sessions[session_id]
    if session['status'] != 'completed':
        return jsonify({'error': 'Processing not completed yet'}), 400
    
    if not os.path.exists(session['zip_path']):
        return jsonify({'error': 'Result file not found'}), 404
    
    # Return the zip file with streaming enabled
    return send_file(
        session['zip_path'],
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'sorted_xrays_{session_id[:8]}.zip'
    )


@dataset_routes.route('/upload_chunk', methods=['POST'])
def upload_chunk():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    path = request.form.get('path', '')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Extract directory structure from the path
    relative_path = os.path.dirname(path)
    
    # Create directory if it doesn't exist
    UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
    upload_path = os.path.join(UPLOAD_FOLDER, relative_path)
    os.makedirs(upload_path, exist_ok=True)
    
    # Save the file
    filename = os.path.basename(path)
    file.save(os.path.join(upload_path, secure_filename(filename)))
    
    # Print for debugging
    print(f"Saved file to: {os.path.join(upload_path, secure_filename(filename))}")
    
    return jsonify({'success': True, 'message': 'Chunk uploaded successfully'})


# Helper function to check allowed file types
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def predict_image(image_path, model, threshold=0.5):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Error: Image not found or invalid format.")
    
    processed_image = image.copy()
    
    resized_image = cv2.resize(image, (224, 224)) / 255.0
    resized_image = np.expand_dims(resized_image, axis=0)  # Add batch dimension
    
    prediction = model.predict(resized_image)[0][0]
    category = "fracture" if prediction > threshold else "no_fracture"
    
    return processed_image, category, float(prediction)


def batch_predict(image_paths, model, batch_size=16, threshold=0.5):
    results = []
    
    # Process images in batches
    for i in range(0, len(image_paths), batch_size):
        batch_paths = image_paths[i:i+batch_size]
        batch_images = []
        valid_indices = []
        
        # Load and preprocess all images in current batch
        for idx, path in enumerate(batch_paths):
            try:
                image = cv2.imread(path)
                if image is not None:
                    # Keep original image for later
                    processed_image = image.copy()
                    # Preprocess for model
                    resized = cv2.resize(image, (224, 224)) / 255.0
                    batch_images.append(resized)
                    valid_indices.append(idx)
                else:
                    print(f"Warning: Could not read image at {path}")
            except Exception as e:
                print(f"Error preprocessing image {path}: {str(e)}")
        
        if batch_images:
            try:
                # Convert to numpy array for batch prediction
                batch_array = np.array(batch_images)
                # Predict all images in batch at once
                predictions = model.predict(batch_array, verbose=0)
                
                # Process results
                for j, pred_idx in enumerate(valid_indices):
                    if j < len(predictions):
                        path = batch_paths[pred_idx]
                        prediction = predictions[j][0]
                        category = "fracture" if prediction > threshold else "no_fracture"
                        original_image = cv2.imread(path)
                        results.append((path, original_image, category, float(prediction)))
            except Exception as e:
                print(f"Error during batch prediction: {str(e)}")
    
    return results


def process_files(session_id, file_paths, threshold=0.3):
    try:
        # Create session folders
        RESULTS_FOLDER = current_app.config['RESULTS_FOLDER']
        session_folder = os.path.join(RESULTS_FOLDER, session_id)
        fracture_folder = os.path.join(session_folder, "fractured")
        no_fracture_folder = os.path.join(session_folder, "non_fractured")
        location_folder = os.path.join(session_folder, "locationed")
        os.makedirs(fracture_folder, exist_ok=True)
        os.makedirs(no_fracture_folder, exist_ok=True)
        os.makedirs(location_folder, exist_ok=True)
        
        # Get model and track which model was used
        model, feature_model = load_active_model()
        
        # Get model info for the stats
        model_info = {"model_id": None, "model_accuracy": None}
        with current_app.app_context():
            from models.training import ModelTraining
            active_model = ModelTraining.query.filter_by(is_active=True).first()
            if active_model:
                model_info = {
                    "model_id": active_model.id,
                    "model_accuracy": round(active_model.accuracy * 100, 2) if active_model.accuracy else None,
                    "model_f1": round(active_model.f1_score, 4) if active_model.f1_score else None,
                    "model_timestamp": active_model.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                }
        
        # Track statistics
        stats = {
            "fracture_count": 0,
            "no_fracture_count": 0,
            "located_count": 0,  # Track located fractures
            "total": len(file_paths),
            "start_time": time.time(),
            "model": model_info,
            "threshold": threshold
        }
        
        # Determine optimal batch size and number of workers
        total_files = len(file_paths)
        batch_size = min(16, max(1, math.ceil(total_files / 10))) 
        max_workers = min(os.cpu_count() or 4, 8)  
        
        # Function to process a batch of files
        def process_batch(batch_paths):
            results = batch_predict(batch_paths, model, batch_size=len(batch_paths), threshold=threshold)
            batch_results = []
            
            for path, img, category, confidence in results:
                filename = os.path.basename(path)
                if category == "fracture":
                    # Save original image in fracture folder
                    save_path = os.path.join(fracture_folder, filename)
                    cv2.imwrite(save_path, img)
                    
                    # Process image to locate fracture
                    try:
                        located_img = locate_fracture_in_image(img, model, feature_model)
                        location_save_path = os.path.join(location_folder, filename)
                        cv2.imwrite(location_save_path, located_img)
                        batch_results.append((category, save_path, True))  # True indicates location was processed
                    except Exception as e:
                        print(f"Error locating fracture in {filename}: {str(e)}")
                        batch_results.append((category, save_path, False))  # False indicates location failed
                else:
                    save_path = os.path.join(no_fracture_folder, filename)
                    cv2.imwrite(save_path, img)
                    batch_results.append((category, save_path, None))  # None indicates no location needed
            
            return batch_results
        
        # Split files into batches for parallel processing
        file_batches = [file_paths[i:i+batch_size] for i in range(0, len(file_paths), batch_size)]
        processed_files = 0
        
        # Process batches in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_batch = {executor.submit(process_batch, batch): i for i, batch in enumerate(file_batches)}
            
            for future in concurrent.futures.as_completed(future_to_batch):
                batch_results = future.result()
                
                # Update statistics
                for category, _, location_processed in batch_results:
                    if category == "fracture":
                        stats["fracture_count"] += 1
                        if location_processed:
                            stats["located_count"] += 1
                    else:
                        stats["no_fracture_count"] += 1
                
                # Update progress
                processed_files += len(batch_results)
                progress = int((processed_files / total_files) * 100)
                processing_sessions[session_id]["progress"] = progress
        
        # Create zip file
        zip_path = os.path.join(RESULTS_FOLDER, f"{session_id}.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for root, _, files in os.walk(session_folder):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, session_folder)
                    zipf.write(file_path, arcname)
        
        # Calculate processing time
        stats["processing_time"] = time.time() - stats["start_time"]
        
        # Update session status
        processing_sessions[session_id].update({
            "status": "completed",
            "progress": 100,
            "zip_path": zip_path,
            "stats": stats
        })
        
        # Clean TensorFlow memory
        import gc
        gc.collect()
        tf.keras.backend.clear_session()
        
    except Exception as e:
        traceback_str = traceback.format_exc()
        print(f"Processing error: {str(e)}\n{traceback_str}")
        processing_sessions[session_id].update({
            "status": "failed",
            "error": str(e)
        })
    finally:
        # Clean up uploaded files
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass


# Start cleanup thread for old sessions
def cleanup_old_sessions(max_age_hours=24):
    current_time = datetime.now()
    sessions_to_remove = []
    
    for session_id, session in processing_sessions.items():
        try:
            created_at = datetime.fromisoformat(session['created_at'])
            age_hours = (current_time - created_at).total_seconds() / 3600
            
            if age_hours > max_age_hours:
                # Clean up files
                if 'zip_path' in session and os.path.exists(session['zip_path']):
                    os.remove(session['zip_path'])
                
                RESULTS_FOLDER = current_app.config['RESULTS_FOLDER']
                session_folder = os.path.join(RESULTS_FOLDER, session_id)
                if os.path.exists(session_folder):
                    shutil.rmtree(session_folder)
                
                sessions_to_remove.append(session_id)
        except Exception as e:
            print(f"Error cleaning up session {session_id}: {str(e)}")
    
    # Remove old sessions
    for session_id in sessions_to_remove:
        del processing_sessions[session_id]


def start_cleanup_thread():
    def cleanup_thread():
        while True:
            time.sleep(3600)  # Run every hour
            cleanup_old_sessions()
    
    # Start cleanup thread
    thread = threading.Thread(target=cleanup_thread)
    thread.daemon = True
    thread.start()


# Initialize cleanup thread
start_cleanup_thread()