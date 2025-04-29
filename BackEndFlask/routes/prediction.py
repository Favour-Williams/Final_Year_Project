from flask import Blueprint, request, jsonify, current_app
import cv2
import numpy as np
import base64
import time
from datetime import datetime
import traceback
import tensorflow as tf
from app import db
from models.user import User
from models.image import ImagePrediction
from services.model_loader import load_active_model, generate_heatmap

prediction_routes = Blueprint('prediction', __name__, url_prefix='')

# Global model instances
model = None
feature_model = None

@prediction_routes.route('/predict', methods=['POST'])
def predict():
    global model, feature_model

    doctor_id = request.form.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor identification required'}), 401
    
    doctor = User.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404

    # Check if model is loaded
    if model is None:
        # Try to load model if not already loaded
        model, feature_model = load_active_model()
        if model is None:
            return jsonify({'error': 'No active model available. Please activate a model first.'}), 500
    
    if 'xray_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['xray_image']
    
    # Read and preprocess the image
    start_time = time.time()
    
    # Read image file into a numpy array
    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({'error': 'Invalid image format'}), 400
    
    # Preprocess
    resized_image = cv2.resize(image, (224, 224))
    preprocessed_image = resized_image / 255.0
    input_image = np.expand_dims(preprocessed_image, axis=0)
    
    # Make prediction
    prediction = float(model.predict(input_image)[0][0])
    
    end_time = time.time()
    processing_time = end_time - start_time
    
    # Boolean flag for fracture detection
    fracture_detected = prediction > 0.5
    
    try:
        # Read the file again for storage
        file.seek(0)
        image_bytes = file.read()
        
        new_prediction = ImagePrediction(
            image_data=image_bytes,
            image_name=file.filename,
            prediction=prediction,
            classification=fracture_detected,
            confidence=float(prediction) if fracture_detected else float(1 - prediction),
            processing_time=processing_time,
            doctor_id=doctor.id
        )
        
        db.session.add(new_prediction)
        db.session.commit()
        
    except Exception as e:
        print(f"Error saving prediction: {str(e)}")
        # Don't fail the request, just log the error
    
    return jsonify({
        'fracture_detected': bool(fracture_detected),
        'confidence': float(prediction) if fracture_detected else float(1 - prediction),
        'processing_time': processing_time,
        'prediction_id': new_prediction.id if 'new_prediction' in locals() else None
    })


@prediction_routes.route('/locate', methods=['POST'])
def locate_fracture():
    global model, feature_model

    doctor_id = request.form.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor identification required'}), 401
    
    doctor = User.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
    
    # Check if model is loaded
    if model is None or feature_model is None:
        # Try to load model if not already loaded
        model, feature_model = load_active_model()
        if model is None:
            return jsonify({'error': 'No active model available. Please activate a model first.'}), 500
    
    if 'xray_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['xray_image']
    
    # Read image file into a numpy array
    file_bytes = np.frombuffer(file.read(), np.uint8)
    original_image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if original_image is None:
        return jsonify({'error': 'Invalid image format'}), 400
    
    # Preserve original dimensions for visualization
    original_height, original_width = original_image.shape[:2]
    
    # Preprocess for prediction
    resized_image = cv2.resize(original_image, (224, 224))
    preprocessed_image = resized_image / 255.0
    input_image = np.expand_dims(preprocessed_image, axis=0)
    
    # Make prediction
    prediction = float(model.predict(input_image)[0][0])
    
    if prediction <= 0.5:
        return jsonify({
            'error': 'No fracture detected in this image',
            'fracture_detected': False
        }), 400
    
    # Get the weights from the last dense layer
    last_dense_layer = model.layers[-1]
    last_conv_layer_weights = last_dense_layer.get_weights()[0][:, 0]
    
    # Generate heatmap
    heatmap = generate_heatmap(input_image, feature_model, last_conv_layer_weights)
    
    # Find top 3 regions in the heatmap
    flattened = heatmap.flatten()
    # Get indices of top 3 values
    top_indices = np.argsort(flattened)[-3:]
    # Convert flat indices to 2D coordinates
    top_points = [(idx % heatmap.shape[1], idx // heatmap.shape[1]) for idx in top_indices]
    
    top_points = top_points[:-1]  
    
    # Scale coordinates and create bounding boxes
    x_scale = original_width / 224
    y_scale = original_height / 224
    
    boxes = []
    result_image = original_image.copy()
    
    for i, (center_x, center_y) in enumerate(top_points):
        # Define a region around each point
        region_size = 15 
        
        # Define region boundaries
        x1 = max(0, center_x - region_size)
        y1 = max(0, center_y - region_size)
        x2 = min(heatmap.shape[1] - 1, center_x + region_size)
        y2 = min(heatmap.shape[0] - 1, center_y + region_size)
        
        # Scale to original image size
        x1_orig = int(x1 * x_scale)
        y1_orig = int(y1 * y_scale)
        x2_orig = int(x2 * x_scale)
        y2_orig = int(y2 * y_scale)
        
        # Draw rectangle bright green
        cv2.rectangle(result_image, (x1_orig, y1_orig), (x2_orig, y2_orig), (0, 255, 0), 3)
        
        # Add to boxes list
        boxes.append({
            'x': x1_orig,
            'y': y1_orig,
            'width': x2_orig - x1_orig,
            'height': y2_orig - y1_orig,
            'score': float(heatmap[center_y, center_x])
        })
    
    # Encode the result image
    _, buffer = cv2.imencode('.png', result_image)
    img_str = base64.b64encode(buffer).decode('utf-8')
    
    prediction_id = request.form.get('prediction_id')
    if prediction_id:
        try:
            prediction_record = ImagePrediction.query.get(prediction_id)
            if prediction_record:
                # Store the localization data
                prediction_record.localization_boxes = boxes
                
                # Store the annotated image
                _, buffer = cv2.imencode('.png', result_image)
                prediction_record.annotated_image = buffer.tobytes()
                
                db.session.commit()
        except Exception as e:
            print(f"Error updating prediction with localization: {str(e)}")
    
    return jsonify({
        'fracture_detected': True,
        'localization_boxes': boxes,
        'result_image': f'data:image/png;base64,{img_str}',
        'prediction_id': prediction_id
    })


@prediction_routes.route('/history/<doctor_id>', methods=['GET'])
def get_prediction_history(doctor_id):
    try:
        # Convert doctor_id to integer if it's a number
        try:
            doctor_id = int(doctor_id)
        except ValueError:
            # If not a number
            pass
        
        # Query the database for predictions by the specified doctor
        predictions = ImagePrediction.query.filter_by(doctor_id=doctor_id).order_by(
            ImagePrediction.upload_date.desc()
        ).all()
        
        # Prepare the predictions data
        predictions_data = []
        for pred in predictions:
            # Convert binary image data to base64 for transmission
            image_base64 = base64.b64encode(pred.image_data).decode('utf-8')
            
            # Prepare the prediction data
            pred_data = {
                'id': pred.id,
                'image_name': pred.image_name,
                'upload_date': pred.upload_date.isoformat(),
                'prediction': pred.prediction,
                'classification': pred.classification,
                'confidence': pred.confidence,
                'processing_time': pred.processing_time,
                'image_data': image_base64,
                'localization_boxes': pred.localization_boxes
            }
            
            # Include the annotated image if it exists
            if pred.annotated_image:
                pred_data['annotated_image'] = base64.b64encode(pred.annotated_image).decode('utf-8')
            
            predictions_data.append(pred_data)
        
        return jsonify({
            'success': True,
            'predictions': predictions_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@prediction_routes.route('/predictions/<int:prediction_id>', methods=['DELETE'])
def delete_prediction(prediction_id):
    try:
        # Find the prediction
        prediction = ImagePrediction.query.get_or_404(prediction_id)
        
        # Delete the prediction
        db.session.delete(prediction)
        db.session.commit()
        
        return jsonify({'message': 'Prediction deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500