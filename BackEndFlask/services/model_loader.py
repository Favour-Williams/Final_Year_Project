import os
import io
import zipfile
import shutil
import tempfile
import traceback
import numpy as np
import tensorflow as tf
from datetime import datetime
from flask import current_app
from app import db
import cv2
# Global model instances
model = None
feature_model = None
# Global model cache to avoid reloading
global_model_cache = {"model": None, "feature_model": None, "last_loaded": None}

def generate_heatmap(input_image, feature_model, last_conv_layer_weights):
    """Generate a heatmap for the input image using the feature model."""
    # Get the output of the last conv layer
    last_conv_output = feature_model.predict(input_image)
    
    # Reshape to [width, height, channels]
    last_conv_output = last_conv_output[0]
    
    # Create the heatmap
    heatmap = np.zeros((last_conv_output.shape[0], last_conv_output.shape[1]))
    
    # Weight the channels by importance (from the dense layer weights)
    for i, w in enumerate(last_conv_layer_weights):
        heatmap += w * last_conv_output[:, :, i]
    
    # Normalize the heatmap
    heatmap = np.maximum(heatmap, 0)
    heatmap /= np.max(heatmap) if np.max(heatmap) > 0 else 1
    
    return heatmap

def load_active_model():
    """Load the currently active model from the database"""
    global model, feature_model, global_model_cache
    
    # Check if we have a cached model that's still valid
    if (global_model_cache["model"] is not None and 
        global_model_cache["feature_model"] is not None):
        print("Using cached models")
        model = global_model_cache["model"]
        feature_model = global_model_cache["feature_model"]
        return model, feature_model
    
    # Create an application context for database access
    try:
        # Find the active model in the database
        from models.training import ModelTraining
        active_model = ModelTraining.query.filter_by(is_active=True).first()
        
        if not active_model:
            print("Warning: No active model found in database")
            return None, None
        
        # load from blobs if available
        if active_model.main_model_blob and active_model.feature_model_blob:
            print(f"Loading model (ID: {active_model.id}) from database blobs")
            
            # Function to extract model from blob
            def load_model_from_blob(blob_data):
                # Create temporary directory
                temp_dir = tempfile.mkdtemp()
                
                try:
                    # Extract zip to temporary directory
                    zip_bytes = io.BytesIO(blob_data)
                    with zipfile.ZipFile(zip_bytes, 'r') as zip_ref:
                        zip_ref.extractall(temp_dir)
                    
                    # Load the model
                    loaded_model = tf.keras.models.load_model(temp_dir, compile=False)
                    return loaded_model
                finally:
                    # Clean up temporary directory
                    shutil.rmtree(temp_dir)
            
            # Load models from blobs
            model = load_model_from_blob(active_model.main_model_blob)
            feature_model = load_model_from_blob(active_model.feature_model_blob)
            
            if hasattr(current_app, 'model_requires_compilation') and current_app.model_requires_compilation:
                model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                feature_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            
            print(f"Successfully loaded active model (ID: {active_model.id}) from blobs")
            
            # Cache the models
            global_model_cache["model"] = model
            global_model_cache["feature_model"] = feature_model
            global_model_cache["last_loaded"] = datetime.now()
            
            return model, feature_model
            
        # Fall back to file-based loading if blobs are not available
        elif active_model.model_path:
            model_path = active_model.model_path
            
            # Check if model directories exist
            main_model_path = os.path.join(model_path, "main_model")
            feature_model_path = os.path.join(model_path, "feature_model")
            
            if not os.path.exists(main_model_path) or not os.path.exists(feature_model_path):
                print(f"Error: Model files not found at {model_path}")
                return None, None
            
            # Load the models
            model = tf.keras.models.load_model(main_model_path, compile=False)
            feature_model = tf.keras.models.load_model(feature_model_path, compile=False)
            
            # Only compile
            if hasattr(current_app, 'model_requires_compilation') and current_app.model_requires_compilation:
                model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                feature_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            
            print(f"Successfully loaded active model (ID: {active_model.id}) from file system")
            
            # Cache the models
            global_model_cache["model"] = model
            global_model_cache["feature_model"] = feature_model
            global_model_cache["last_loaded"] = datetime.now()
            
            return model, feature_model
        else:
            print("Error: Active model has neither blob data nor file path")
            return None, None
            
    except Exception as e:
        print(f"Error loading active model: {str(e)}")
        print(traceback.format_exc())
        return None, None


def locate_fracture_in_image(image, model, feature_model):
    """Locate fractures in an image using the model and feature model."""
    # Preserve original dimensions for visualization
    original_height, original_width = image.shape[:2]
    result_image = image.copy()
    
    # Preprocess for prediction
    resized_image = cv2.resize(image, (224, 224))
    preprocessed_image = resized_image / 255.0
    input_image = np.expand_dims(preprocessed_image, axis=0)
    
    # Make prediction
    prediction = float(model.predict(input_image)[0][0])
    
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
    
    # Remove the highest point, keeping the other 2 (matching locate_fracture behavior)
    top_points = top_points[:-1]
    
    # Scale coordinates and create bounding boxes
    x_scale = original_width / 224
    y_scale = original_height / 224
    
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
        
        # Draw rectangle
        cv2.rectangle(result_image, (x1_orig, y1_orig), (x2_orig, y2_orig), (0, 255, 0), 3)
        
    return result_image