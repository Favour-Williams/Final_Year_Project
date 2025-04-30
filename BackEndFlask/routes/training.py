from flask import Blueprint, request, jsonify, current_app
import os
import json
import threading
import time
import traceback
import tensorflow as tf
import tempfile
import zipfile
import io
import shutil
from datetime import datetime
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score
from app import db
from models.training import ModelTraining
from services.model_loader import load_active_model
from model.cnnModel import build_model, train_cnn, load_data

training_routes = Blueprint('training', __name__, url_prefix='')

# Dictionary to track training progress
training_progress = {
    'status': 'idle',
    'progress': 0,
    'error': None
}

@training_routes.route('/api/train', methods=['POST'])
def train_model():
    try:
        # Get training parameters
        dataset_path = request.form.get('dataset_path')
        epochs = int(request.form.get('epochs', 10))
        batch_size = int(request.form.get('batch_size', 32))
       
        training_thread = threading.Thread(
            target=run_training_process,
            args=(dataset_path, epochs, batch_size)
        )
        training_thread.daemon = True
        training_thread.start()
        
        return jsonify({'message': 'Training started successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@training_routes.route('/api/training_progress', methods=['GET'])
def get_training_progress():
    return jsonify(training_progress)


@training_routes.route('/api/models', methods=['GET'])
def get_models():
    models = ModelTraining.query.order_by(ModelTraining.timestamp.desc()).all()
    return jsonify([model.to_dict() for model in models])


@training_routes.route('/api/models/<int:model_id>', methods=['GET'])
def get_model(model_id):
    model = ModelTraining.query.get_or_404(model_id)
    return jsonify(model.to_dict())


@training_routes.route('/api/models/<int:model_id>', methods=['DELETE'])
def delete_model(model_id):
    try:
        model = ModelTraining.query.get_or_404(model_id)
        
        # Don't allow deletion of active model
        if model.is_active:
            return jsonify({'error': 'Cannot delete the active model'}), 400
        
        # Delete model files if they exist 
        if model.model_path and os.path.exists(model.model_path):
            main_model_path = os.path.join(model.model_path, "main_model")
            feature_model_path = os.path.join(model.model_path, "feature_model")
            
            # Delete directories if they exist
            if os.path.exists(main_model_path):
                shutil.rmtree(main_model_path)
            if os.path.exists(feature_model_path):
                shutil.rmtree(feature_model_path)
                
            # Try to remove the parent directory
            try:
                os.rmdir(model.model_path)
            except OSError as e:
                print(f"Notice: Could not remove directory {model.model_path}: {str(e)}")
                # Directory not empty, that's fine
                pass
        
        # Delete from database
        db.session.delete(model)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Model {model_id} deleted successfully'})
    except Exception as e:
        print(f"Error deleting model {model_id}: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@training_routes.route('/api/models/<int:model_id>/activate', methods=['POST'])
def activate_model(model_id):
    try:
        model = ModelTraining.query.get_or_404(model_id)
        
        if model.is_active:
            return jsonify({'success': True, 'message': f'Model {model_id} is already active'})
        
        # Check if we have the model data
        has_blob = model.main_model_blob is not None and model.feature_model_blob is not None
        has_files = False
        
        if model.model_path:
            main_model_path = os.path.join(model.model_path, "main_model")
            feature_model_path = os.path.join(model.model_path, "feature_model")
            has_files = os.path.exists(main_model_path) and os.path.exists(feature_model_path)
        
        if not (has_blob or has_files):
            return jsonify({'error': f'Model data not found for model {model_id}'}), 404
        
        # Use a separate thread to load the model to avoid blocking
        def load_model_in_background():
            # Deactivate all models
            with current_app.app_context():
                ModelTraining.query.update({ModelTraining.is_active: False})
                
                # Activate the selected model
                model = ModelTraining.query.get(model_id)
                if model:
                    model.is_active = True
                    db.session.commit()
                
                # Reload the newly activated model
                success = load_active_model()
                
                print(f"Background model loading completed: {'success' if success else 'failed'}")
        
        # Start the background thread
        thread = threading.Thread(target=load_model_in_background)
        thread.daemon = True
        thread.start()
        
        # Return success response immediately
        return jsonify({'success': True, 'message': f'Model {model_id} activation in progress'})
    except Exception as e:
        print(f"Error activating model {model_id}: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


def run_training_process(dataset_path, epochs, batch_size):
    """Run the training process and store results in the database"""
    global training_progress
    
    training_progress = {
        'status': 'in_progress',
        'progress': 0,
        'error': None
    }
    
    with current_app.app_context():
        try:
            # Setup full paths
            UPLOAD_FOLDER = current_app.config['UPLOAD_FOLDER']
            MODEL_SAVE_FOLDER = current_app.config['MODEL_SAVE_FOLDER']
            
            base_path = os.path.join(UPLOAD_FOLDER, dataset_path)
            train_path = os.path.join(base_path, 'training')
            test_path = os.path.join(base_path, 'testing')
            
            if not os.path.exists(train_path) or not os.path.exists(test_path):
                raise FileNotFoundError(f"Training or testing directory not found in {dataset_path}")
            
            # Load training and testing data
            training_progress['progress'] = 10
            X_train, y_train = load_data(train_path)
            X_test, y_test = load_data(test_path)
            
            # Build the model
            training_progress['progress'] = 20
            model, feature_model = build_model()
            
            # Train the model and measure training time
            training_progress['progress'] = 30
            start_time = time.time()
            
            # Custom callback to update progress
            class ProgressCallback(tf.keras.callbacks.Callback):
                def on_epoch_end(self, epoch, logs=None):
                    current_progress = 30 + int(70 * (epoch + 1) / epochs)
                    training_progress['progress'] = min(95, current_progress)
                    
            # Train with progress monitoring
            history = train_cnn(model, (X_train, y_train), epochs, batch_size, callbacks=[ProgressCallback()])
            
            training_time = time.time() - start_time
            
            # Evaluate the model
            training_progress['progress'] = 96
            test_loss, test_accuracy = model.evaluate(X_test, y_test)
            
            # Generate predictions for additional metrics
            y_pred_prob = model.predict(X_test)
            y_pred = (y_pred_prob > 0.5).astype(int).flatten()
            
            # Calculate additional metrics
            precision = precision_score(y_test, y_pred)
            recall = recall_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred)
            
            # Save models as blobs
            training_progress['progress'] = 97
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Create a temporary directory for saving models
            temp_dir = tempfile.mkdtemp()
            
            # Save models to temporary directory
            temp_main_model_path = os.path.join(temp_dir, "main_model")
            temp_feature_model_path = os.path.join(temp_dir, "feature_model")
            
            model.save(temp_main_model_path)
            feature_model.save(temp_feature_model_path)

            # Function to zip a directory into a bytes object
            def zip_directory_to_bytes(directory):
                bytes_io = io.BytesIO()
                with zipfile.ZipFile(bytes_io, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, _, files in os.walk(directory):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, directory)
                            zipf.write(file_path, arcname)
                return bytes_io.getvalue()
            
            # Convert models to blobs
            main_model_blob = zip_directory_to_bytes(temp_main_model_path)
            feature_model_blob = zip_directory_to_bytes(temp_feature_model_path)
            
            # Clean up temporary directory
            shutil.rmtree(temp_dir)
            
            # Extract history data
            acc_history = history.history.get('accuracy', [])
            loss_history = history.history.get('loss', [])
            val_acc_history = history.history.get('val_accuracy', [])
            val_loss_history = history.history.get('val_loss', [])
            
            # Create precision, recall, f1 history per epoch
            precision_history = []
            recall_history = []
            f1_history = []
            
            for epoch in range(epochs):
                epoch_y_pred = (model.predict(X_test) > 0.5).astype(int).flatten()
                precision_history.append(float(precision_score(y_test, epoch_y_pred)))
                recall_history.append(float(recall_score(y_test, epoch_y_pred)))
                f1_history.append(float(f1_score(y_test, epoch_y_pred)))
            
            # Create a file-based model path for backward compatibility
            model_path = os.path.join(MODEL_SAVE_FOLDER, f"fracture_model_{timestamp}")
            os.makedirs(model_path, exist_ok=True)
            
            # Store training information in database
            training_progress['progress'] = 98
            training_record = ModelTraining(
                epochs=epochs,
                accuracy=float(test_accuracy),
                loss=float(test_loss),
                precision=float(precision),
                recall=float(recall),
                f1_score=float(f1),
                training_time=float(training_time),
                model_path=model_path,
                main_model_blob=main_model_blob,
                feature_model_blob=feature_model_blob,
                accuracy_history=json.dumps(list(map(float, acc_history))),
                loss_history=json.dumps(list(map(float, loss_history))),
                val_accuracy_history=json.dumps(list(map(float, val_acc_history))) if val_acc_history else json.dumps([]),
                val_loss_history=json.dumps(list(map(float, val_loss_history))) if val_loss_history else json.dumps([]),
                precision_history=json.dumps(precision_history),
                recall_history=json.dumps(recall_history),
                f1_history=json.dumps(f1_history)
            )
            
            # Set this model as active if it's the first one or has better accuracy
            existing_active = ModelTraining.query.filter_by(is_active=True).first()
            if not existing_active or test_accuracy > existing_active.accuracy:
                # Deactivate current active model if exists
                if existing_active:
                    existing_active.is_active = False
                # Set new model as active
                training_record.is_active = True
                
            # Save to database
            db.session.add(training_record)
            db.session.commit()
            
            # Update progress to completed
            training_progress['status'] = 'completed'
            training_progress['progress'] = 100
            
            # Return success with model id
            return {
                'id': training_record.id,
                'accuracy': test_accuracy,
                'loss': test_loss,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'training_time': training_time
            }
            
        except Exception as e:
            print(f"Training error: {str(e)}")
            print(traceback.format_exc())
            
            training_progress['status'] = 'failed'
            training_progress['error'] = str(e)
            return {'error': str(e)}