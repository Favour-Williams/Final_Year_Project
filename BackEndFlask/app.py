import os
import re
import io
import cv2
import uuid
import json
import time
import shutil
import random
import string
import base64
import zipfile
import sqlite3
import tempfile
import datetime
import threading
import traceback
import numpy as np
import tensorflow as tf
from flask_cors import CORS
from tempfile import mkdtemp
from threading import Thread
from datetime import datetime
import matplotlib.pyplot as plt
from flask_migrate import Migrate
from flask_mail import Mail, Message
from contextlib import contextmanager
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_file
from sklearn.metrics import precision_score, recall_score, f1_score
from werkzeug.security import generate_password_hash, check_password_hash
from model.cnnModel import build_model, generate_heatmap, train_cnn, load_data

# Initialize the Flask app
app = Flask(__name__)

# Mail configuration
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:5000"]}})

app.config['MAIL_SERVER'] = 'smtp.gmail.com'  
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'williamsfavour012345@gmail.com'  
app.config['MAIL_PASSWORD'] = 'pnpq mapj lfvi hiue'  
app.config['MAIL_DEFAULT_SENDER'] = 'williamsfavour012345@gmail.com'  
mail = Mail(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "boneDetection.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
# migrate = Migrate(app, db)

app.config['SECRET_KEY'] = 'your-secret-key'
CORRECTIONS_FOLDER = os.path.join(BASE_DIR, "static/corrections")
os.makedirs(CORRECTIONS_FOLDER, exist_ok=True)

# User model to represent user data in the database
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    other_name = db.Column(db.String(50))
    user_name = db.Column(db.String(50), unique=True, nullable=False)
    phone_number = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
with app.app_context():
    db.create_all()
class PasswordReset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    used = db.Column(db.Boolean, default=False)
with app.app_context():
    db.create_all()
class ImageCorrection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.String(100), nullable=False)
    doctor_id = db.Column(db.String(100), nullable=False)
    original_prediction = db.Column(db.Boolean, nullable=False)
    correction_type = db.Column(db.String(20), nullable=False)  # "fractured" or "no-fracture"
    fracture_locations = db.Column(db.Text, nullable=True)  # JSON string of rectangle coordinates
    
    # Binary storage for images instead of file paths
    original_image = db.Column(db.LargeBinary, nullable=False)  # Stores the actual image binary data
    annotated_image = db.Column(db.LargeBinary, nullable=True)  # Stores the annotated image if available
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()
##########################################################################################################################


class ModelTraining(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    epochs = db.Column(db.Integer, nullable=False)
    accuracy = db.Column(db.Float)
    loss = db.Column(db.Float)
    precision = db.Column(db.Float)
    recall = db.Column(db.Float)
    f1_score = db.Column(db.Float)
    training_time = db.Column(db.Float)
    model_path = db.Column(db.String(255))  # Keep for backward compatibility
    main_model_blob = db.Column(db.LargeBinary)  # New column for main model blob
    feature_model_blob = db.Column(db.LargeBinary)  # New column for feature model blob
    is_active = db.Column(db.Boolean, default=False)
    accuracy_history = db.Column(db.Text)  # Stored as JSON string
    loss_history = db.Column(db.Text)  # Stored as JSON string
    val_accuracy_history = db.Column(db.Text)  # Stored as JSON string
    val_loss_history = db.Column(db.Text)  # Stored as JSON string
    precision_history = db.Column(db.Text)  # Stored as JSON string
    recall_history = db.Column(db.Text)  # Stored as JSON string
    f1_history = db.Column(db.Text)  # Stored as JSON string
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'epochs': self.epochs,
            'accuracy': round(self.accuracy, 4) if self.accuracy else None,
            'loss': round(self.loss, 4) if self.loss else None,
            'precision': round(self.precision, 4) if self.precision else None,
            'recall': round(self.recall, 4) if self.recall else None,
            'f1_score': round(self.f1_score, 4) if self.f1_score else None,
            'training_time': round(self.training_time, 2) if self.training_time else None,
            'model_path': self.model_path,
            'is_active': self.is_active,
            'has_model_blob': self.main_model_blob is not None,  # Add indicator for blob availability
            'accuracy_history': json.loads(self.accuracy_history) if self.accuracy_history else None,
            'loss_history': json.loads(self.loss_history) if self.loss_history else None,
            'val_accuracy_history': json.loads(self.val_accuracy_history) if self.val_accuracy_history else None,
            'val_loss_history': json.loads(self.val_loss_history) if self.val_loss_history else None,
            'precision_history': json.loads(self.precision_history) if self.precision_history else None,
            'recall_history': json.loads(self.recall_history) if self.recall_history else None,
            'f1_history': json.loads(self.f1_history) if self.f1_history else None
        }

# Ensure database tables are created
with app.app_context():
    db.create_all()

class ImagePrediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_data = db.Column(db.LargeBinary, nullable=False)  # Stores the actual image binary data
    image_name = db.Column(db.String(100), nullable=False)
    upload_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    prediction = db.Column(db.Float, nullable=False)  # Raw prediction value (0-1)
    classification = db.Column(db.Boolean, nullable=False)  # True for fracture, False for no fracture
    confidence = db.Column(db.Float, nullable=False)  # Confidence percentage
    processing_time = db.Column(db.Float, nullable=False)  # Time taken for prediction in seconds
    doctor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # For fracture localization (nullable since not all images will have fractures)
    localization_boxes = db.Column(db.JSON)  # Stores the bounding boxes as JSON
    annotated_image = db.Column(db.LargeBinary)  # Stores the annotated image with boxes
    
    # Relationship
    doctor = db.relationship('User', backref=db.backref('predictions', lazy=True))

with app.app_context():
    db.create_all()




# Route for home
@app.route('/', methods=['GET'])
def home():
    return "SQLite connected successfully."

# Route for login
def get_db_connection():
    conn = sqlite3.connect('boneDetection.db')
    conn.row_factory = sqlite3.Row  
    return conn




##########################################################################################################################
# Login route
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data['userName']
        password = data['password']

        user = User.query.filter_by(user_name=username).first()

        if user and check_password_hash(user.password, password):  # Use check_password_hash instead
            # Password is correct, send back user details with role
            return jsonify({
                'id': user.id,
                'role': 'admin' if user.user_name == 'admin' else 'doctor',  # Modify role checking
                'message': 'Login successful'
            })
        else:
            return jsonify({'error': 'Invalid username or password'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Return user data excluding password
        return jsonify({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'other_name': user.other_name,
            'user_name': user.user_name,
            'phone_number': user.phone_number,
            'email': user.email
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

##########################################################################################################################
@contextmanager
def get_db_session():
    session = db.session
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

# Function to generate a unique username
def generate_unique_username(last_name):
    # Get first 4 letters of last name (or fewer if last name is shorter)
    last_name_prefix = last_name.lower()[:4]
    
    # Generate a username with random numbers
    while True:
        # Generate 4 random numbers
        random_numbers = ''.join(random.choices(string.digits, k=4))
        
        # Combine prefix and random numbers
        username = f"{last_name_prefix}{random_numbers}"
        
        # Check if username exists
        if not User.query.filter_by(user_name=username).first():
            return username
        

##########################################################################################################################
# Update the create_user route
@app.route('/admin/create-user', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        
        # Check if user already exists
        existing_user = User.query.filter(
            (User.email == data['email'])
        ).first()
        
        if existing_user:
            return jsonify({'error': 'Email already exists'}), 400
        
        # Generate unique username if not provided or if provided username already exists
        user_name = data.get('userName')
        if not user_name or User.query.filter_by(user_name=user_name).first():
            user_name = generate_unique_username(data['lastName'])
        
        # Default password (hashed)
        default_password = "1234567890"
        hashed_password = generate_password_hash(default_password)
        
        # Create new user
        new_user = User(
            first_name=data['firstName'],
            last_name=data['lastName'],
            other_name=data.get('otherName', ''),
            user_name=user_name,
            phone_number=data['phoneNumber'],
            email=data['email'],
            password=hashed_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Get new user ID
        user_id = new_user.id
        
        # Send welcome email
        try:
            msg = Message(
                'Welcome to the System',
                recipients=[data['email']]
            )
            msg.body = f"""
            Welcome {data['firstName']} {data['lastName']},
            
            Your account has been created by an administrator.
            Your login credentials are:
            Username: {user_name}
            Password: {default_password}
            
            Please change your password after your first login.
            """
            mail.send(msg)
        except Exception as e:
            print(f"Error sending email: {str(e)}")
        
        return jsonify({'message': 'User created successfully', 'userId': user_id}), 201
    
    except Exception as e:
        print("Error details:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': 'An error occurred while creating the user: ' + str(e)}), 500

##########################################################################################################################
@app.route('/submit-correction', methods=['POST'])
def submit_correction():
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Required fields
        image_id = data.get('imageId')
        doctor_id = data.get('doctorId')
        original_prediction = data.get('originalPrediction', {})
        correction_type = data.get('correctionType')
        rectangles = data.get('rectangles', [])  # Updated from circles to rectangles to match front-end
        image_data = data.get('imageData')  # Base64 encoded image
        annotated_image_data = data.get('annotatedImageData')  # Base64 encoded annotated image
        
        # Validation
        if not image_id or not doctor_id or not correction_type or not image_data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Process original image
        try:
            # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Convert base64 to binary
            original_image_binary = base64.b64decode(image_data)
        except Exception as e:
            app.logger.error(f"Error processing original image: {str(e)}")
            return jsonify({'error': f'Failed to process image: {str(e)}'}), 500
        
        # Process annotated image if provided
        annotated_image_binary = None
        if annotated_image_data:
            try:
                # Remove data URL prefix if present
                if ',' in annotated_image_data:
                    annotated_image_data = annotated_image_data.split(',')[1]
                
                # Convert base64 to binary
                annotated_image_binary = base64.b64decode(annotated_image_data)
            except Exception as e:
                app.logger.error(f"Error processing annotated image: {str(e)}")
                # Continue even if annotated image fails - we still have the original
        
        # Convert rectangles to JSON string if present
        fracture_locations = json.dumps(rectangles) if rectangles else None
        
        # Create new correction record with binary data
        correction = ImageCorrection(
            image_id=image_id,
            doctor_id=doctor_id,
            original_prediction=original_prediction.get('fracture_detected', False),
            correction_type=correction_type,
            fracture_locations=fracture_locations,
            original_image=original_image_binary,
            annotated_image=annotated_image_binary,
            timestamp=datetime.utcnow()
        )
        
        # Save to database
        db.session.add(correction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Correction submitted successfully. Thank you for your feedback!',
            'correction_id': correction.id
        })
        
    except Exception as e:
        app.logger.error(f"Error in submit_correction: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
##########################################################################################################################
# Add this route to your Flask app to fetch all corrections
@app.route('/corrections', methods=['GET'])
def get_corrections():
    try:
        # Query all image corrections from the database
        corrections = ImageCorrection.query.order_by(ImageCorrection.timestamp.desc()).all()
        
        # Convert to list of dictionaries
        corrections_list = []
        for correction in corrections:
            correction_data = {
                'id': correction.id,
                'image_id': correction.image_id,
                'doctor_id': correction.doctor_id,
                'original_prediction': correction.original_prediction,
                'correction_type': correction.correction_type,
                'timestamp': correction.timestamp.isoformat(),
                # Add URLs for fetching images
                'original_image_url': f'/correction-image/{correction.id}/original',
                'annotated_image_url': f'/correction-image/{correction.id}/annotated' if correction.annotated_image else None
            }
            
            # Include fracture locations if available
            if correction.fracture_locations:
                correction_data['fracture_locations'] = json.loads(correction.fracture_locations)
                
            corrections_list.append(correction_data)
            
        return jsonify(corrections_list)
        
    except Exception as e:
        app.logger.error(f"Error fetching corrections: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Route to serve images from the stored paths
@app.route('/correction-image/<int:correction_id>/<image_type>', methods=['GET'])
def serve_correction_image(correction_id, image_type):
    try:
        # Get the correction record
        correction = ImageCorrection.query.get_or_404(correction_id)
        
        if image_type == 'original' and correction.original_image:
            return send_file(
                io.BytesIO(correction.original_image),
                mimetype='image/png'
            )
        elif image_type == 'annotated' and correction.annotated_image:
            return send_file(
                io.BytesIO(correction.annotated_image),
                mimetype='image/png'
            )
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        app.logger.error(f"Error serving image: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
##########################################################################################################################
# Route to get all doctors (non-admin users)
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    try:
        with get_db_session() as session:
            doctors = session.query(User).filter(User.user_name != 'admin').all()
            doctors_list = []
            for doctor in doctors:
                doctors_list.append({
                    'id': doctor.id,
                    'firstName': doctor.first_name,
                    'lastName': doctor.last_name,
                    'otherName': doctor.other_name,
                    'userName': doctor.user_name,
                    'phoneNumber': doctor.phone_number,
                    'email': doctor.email
                })
            return jsonify(doctors_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

##########################################################################################################################
# Route to delete a user
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        with get_db_session() as session:
            user = session.query(User).get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if user.user_name == 'admin':
                return jsonify({'error': 'Cannot delete admin user'}), 403
                
            session.delete(user)
            return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
##########################################################################################################################
# Route to update a user
@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.get_json()
        with get_db_session() as session:
            user = session.query(User).get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Check if updating username or email to something that already exists
            if data.get('userName') and data['userName'] != user.user_name:
                existing_user = session.query(User).filter(User.user_name == data['userName']).first()
                if existing_user:
                    return jsonify({'error': 'Username already taken'}), 400
                    
            if data.get('email') and data['email'] != user.email:
                existing_user = session.query(User).filter(User.email == data['email']).first()
                if existing_user:
                    return jsonify({'error': 'Email already registered'}), 400
            
            # Update user fields if provided in the request
            if 'firstName' in data:
                user.first_name = data['firstName']
            if 'lastName' in data:
                user.last_name = data['lastName']
            if 'otherName' in data:
                user.other_name = data['otherName']
            if 'userName' in data:
                user.user_name = data['userName']
            if 'phoneNumber' in data:
                user.phone_number = data['phoneNumber']
            if 'email' in data:
                user.email = data['email']
            if 'password' in data and data['password'].strip():
                user.password = generate_password_hash(data['password'])
                
            return jsonify({
                'message': 'User updated successfully',
                'user': {
                    'id': user.id,
                    'firstName': user.first_name,
                    'lastName': user.last_name,
                    'otherName': user.other_name,
                    'userName': user.user_name,
                    'phoneNumber': user.phone_number,
                    'email': user.email
                }
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

##########################################################################################################################
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal whether the email exists for security
            return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200
            
        # Generate a unique token
        token = str(uuid.uuid4())
        
        # Calculate expiration (24 hours from now)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Save the reset request
        password_reset = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        
        db.session.add(password_reset)
        db.session.commit()
        
        # Create reset link
        reset_link = f"http://localhost:5173/reset-password/{token}"
        
        # Send email with reset link
        try:
            msg = Message(
                'Password Reset Request',
                recipients=[email]
            )
            msg.body = f"""
            Hello {user.first_name},
            
            You have requested to reset your password. Click the link below to set a new password:
            {reset_link}
            
            This link will expire in 24 hours.
            
            If you did not request this password reset, please ignore this email.
            """
            mail.send(msg)
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return jsonify({'error': 'Failed to send reset email'}), 500
            
        return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to validate token and reset password
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('newPassword')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
            
        # Validate password complexity on the server side as well
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
            
        if not re.search(r'[A-Z]', new_password):
            return jsonify({'error': 'Password must contain at least one uppercase letter'}), 400
            
        if not re.search(r'[a-z]', new_password):
            return jsonify({'error': 'Password must contain at least one lowercase letter'}), 400
            
        if not re.search(r'[0-9]', new_password):
            return jsonify({'error': 'Password must contain at least one number'}), 400
            
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', new_password):
            return jsonify({'error': 'Password must contain at least one special character'}), 400
            
        # Find the reset request
        reset_request = PasswordReset.query.filter_by(
            token=token,
            used=False
        ).first()
        
        if not reset_request:
            return jsonify({'error': 'Invalid or expired token'}), 400
            
        # Check if token is expired
        if reset_request.expires_at < datetime.utcnow():
            return jsonify({'error': 'Reset link has expired'}), 400
            
        # Get the user
        user = User.query.get(reset_request.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Hash the password before storing
        hashed_password = generate_password_hash(new_password)
        
        # Update password with hashed version
        user.password = hashed_password
        
        # Mark token as used
        reset_request.used = True
        
        db.session.commit()
        
        return jsonify({'message': 'Password has been reset successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to verify token validity (for frontend validation)
@app.route('/api/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    try:
        reset_request = PasswordReset.query.filter_by(
            token=token,
            used=False
        ).first()
        
        if not reset_request or reset_request.expires_at < datetime.utcnow():
     
            return jsonify({'valid': False}), 200
            
        return jsonify({'valid': True}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
##########################################################################################################################
MODEL_PATH = "bone_fracture_detection_mobilenet_v222.h5"
model = None
feature_model = None

def load_active_model():
    """Load the currently active model from the database"""
    global model, feature_model
    
    # Create an application context for database access
    with app.app_context():
        try:
            # Find the active model in the database
            active_model = ModelTraining.query.filter_by(is_active=True).first()
            
            if not active_model:
                print("Warning: No active model found in database")
                return False
            
            # First try to load from blobs if available
            if active_model.main_model_blob and active_model.feature_model_blob:
                print(f"Loading model (ID: {active_model.id}) from database blobs")
                
                # Function to extract model from blob
                def load_model_from_blob(blob_data):
                    import io
                    import zipfile
                    import tempfile
                    import shutil
                    
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
                
                # Only compile if needed for inference
                if hasattr(app, 'model_requires_compilation') and app.model_requires_compilation:
                    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                    feature_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                
                print(f"Successfully loaded active model (ID: {active_model.id}) from blobs")
                return True
                
            # Fall back to file-based loading if blobs are not available
            elif active_model.model_path:
                model_path = active_model.model_path
                
                # Check if model directories exist
                main_model_path = os.path.join(model_path, "main_model")
                feature_model_path = os.path.join(model_path, "feature_model")
                
                if not os.path.exists(main_model_path) or not os.path.exists(feature_model_path):
                    print(f"Error: Model files not found at {model_path}")
                    return False
                
                # Load the models with optimized options
                # 1. Use TF's optimized loading options
                model = tf.keras.models.load_model(main_model_path, compile=False)
                feature_model = tf.keras.models.load_model(feature_model_path, compile=False)
                
                # Only compile if needed for inference
                if hasattr(app, 'model_requires_compilation') and app.model_requires_compilation:
                    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                    feature_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
                
                print(f"Successfully loaded active model (ID: {active_model.id}) from file system")
                return True
            else:
                print("Error: Active model has neither blob data nor file path")
                return False
                
        except Exception as e:
            import traceback
            print(f"Error loading active model: {str(e)}")
            print(traceback.format_exc())
            return False
# Load active model at startup
load_active_model()

@app.route('/predict', methods=['POST'])
def predict():

    doctor_id = request.form.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor identification required'}), 401
    
    doctor = User.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404

    # Check if model is loaded
    if model is None:
        # Try to load model if not already loaded
        if not load_active_model():
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
        # Read the file again for storage (since we already read it for prediction)
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

@app.route('/locate', methods=['POST'])
def locate_fracture():

    doctor_id = request.form.get('doctor_id')
    if not doctor_id:
        return jsonify({'error': 'Doctor identification required'}), 401
    
    doctor = User.query.get(doctor_id)
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
    
    # Check if model is loaded
    if model is None or feature_model is None:
        # Try to load model if not already loaded
        if not load_active_model():
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
    
    # Remove the highest point, keeping the other 2
    top_points = top_points[:-1]  # Remove the highest scoring point
    
    # Scale coordinates and create bounding boxes
    x_scale = original_width / 224
    y_scale = original_height / 224
    
    boxes = []
    result_image = original_image.copy()
    
    for i, (center_x, center_y) in enumerate(top_points):
        # Define a region around each point
        region_size = 15  # pixels on each side in the heatmap space
        
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
        
        # Draw rectangle - bright green
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
##########################################################################################################################
@app.route('/history/<doctor_id>', methods=['GET'])
def get_prediction_history(doctor_id):
    try:
        # Convert doctor_id to integer if it's a number
        try:
            doctor_id = int(doctor_id)
        except ValueError:
            # If not a number, handle accordingly (e.g., for "unknown")
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
@app.route('/predictions/<int:prediction_id>', methods=['DELETE'])
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
##########################################################################################################################    
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorted_results')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
# Store processing sessions
processing_sessions = {}
# Global model cache to avoid reloading
global_model_cache = {"model": None, "feature_model": None, "last_loaded": None}

def predict1(image_path, model, threshold=0.5):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Error: Image not found or invalid format.")
    
    processed_image = image.copy()  # Keep original for saving later
    
    
    resized_image = cv2.resize(image, (224, 224)) / 255.0
    resized_image = np.expand_dims(resized_image, axis=0)  # Add batch dimension
    
    prediction = model.predict(resized_image)[0][0]
    category = "fracture" if prediction > threshold else "no_fracture"
    
    return processed_image, category, float(prediction)

# New batch prediction function for faster processing
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
                        # Re-read original image to avoid storing all in memory
                        original_image = cv2.imread(path)
                        results.append((path, original_image, category, float(prediction)))
            except Exception as e:
                print(f"Error during batch prediction: {str(e)}")
    
    return results

def load_models1():
    global global_model_cache
    
    # Check if we have a cached model that's still valid
    if global_model_cache["model"] is not None and global_model_cache["feature_model"] is not None:
        print("Using cached models")
        return global_model_cache["model"], global_model_cache["feature_model"]
    
    # Get the active model from the database
    with app.app_context():
        active_model = ModelTraining.query.filter_by(is_active=True).first()
        
        if active_model and active_model.model_path and os.path.exists(active_model.model_path):
            # Use the path stored in the database
            model_path = os.path.join(active_model.model_path, "main_model")
            feature_model_path = os.path.join(active_model.model_path, "feature_model")
            
            # Load the main model
            if os.path.exists(model_path):
                model = tf.keras.models.load_model(model_path)
                print(f"Loaded active model (ID: {active_model.id}) from {model_path}")
            else:
                raise FileNotFoundError(f"Active model not found at {model_path}")
                
            # Load the feature model
            if os.path.exists(feature_model_path):
                feature_model = tf.keras.models.load_model(feature_model_path)
                print(f"Loaded feature model from {feature_model_path}")
            else:
                # If feature model isn't found, recreate it from the main model
                input_shape = model.input_shape[1:4]
                _, feature_model = build_model(input_shape)
                # Copy weights from the loaded model to the feature model
                for i, layer in enumerate(model.layers):
                    if i < len(feature_model.layers):
                        feature_model.layers[i].set_weights(layer.get_weights())
                print(f"Feature model recreated from main model")
        else:
            # Fallback to default model if no active model is set
            if os.path.exists(MODEL_PATH):
                print(f"No active model in database, using default model: {MODEL_PATH}")
                model = tf.keras.models.load_model(MODEL_PATH)
                
                # Recreate the feature model
                input_shape = model.input_shape[1:4]
                _, feature_model = build_model(input_shape)
                # Copy weights from the loaded model to the feature model
                for i, layer in enumerate(model.layers):
                    if i < len(feature_model.layers):
                        feature_model.layers[i].set_weights(layer.get_weights())
            else:
                # If no model exists at all, create and warn
                print("Warning: No active model in database and default model not found at " 
                      f"{MODEL_PATH}. Using untrained model.")
                model, feature_model = build_model()
    
    # Cache the models
    global_model_cache["model"] = model
    global_model_cache["feature_model"] = feature_model
    global_model_cache["last_loaded"] = datetime.now()
    
    # Return the models
    return model, feature_model
def locate_fracture_in_image(image, model, feature_model):
    """
    Locates fractures in an X-ray image and returns an annotated image with bounding boxes.
    Matches the style and behavior of locate_fracture() function.
    
    Args:
        image: The original X-ray image (BGR format from OpenCV)
        model: The main classification model
        feature_model: The feature extraction model
        
    Returns:
        An annotated image with bounding boxes around potential fracture locations
    """
    # Preserve original dimensions for visualization
    original_height, original_width = image.shape[:2]
    result_image = image.copy()
    
    # Preprocess for prediction
    resized_image = cv2.resize(image, (224, 224))
    preprocessed_image = resized_image / 255.0
    input_image = np.expand_dims(preprocessed_image, axis=0)
    
    # Make prediction (though we don't use the result, we keep the flow similar)
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
        region_size = 15  # pixels on each side in the heatmap space
        
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
        
        # Draw rectangle - bright green (matching locate_fracture)
        cv2.rectangle(result_image, (x1_orig, y1_orig), (x2_orig, y2_orig), (0, 255, 0), 3)
        
        # Add confidence score text (optional - not present in locate_fracture)
        # score = float(heatmap[center_y, center_x])
        # confidence_text = f"{score:.2f}"
        # cv2.putText(result_image, confidence_text, (x1_orig, y1_orig-5), 
        #             cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    return result_image
# Updated process_files function with parallel processing
def process_files(session_id, file_paths, threshold=0.3):
    try:
        # Create session folders
        session_folder = os.path.join(RESULTS_FOLDER, session_id)
        fracture_folder = os.path.join(session_folder, "fracture")
        no_fracture_folder = os.path.join(session_folder, "no_fracture")
        location_folder = os.path.join(session_folder, "location")  # New folder for located fractures
        os.makedirs(fracture_folder, exist_ok=True)
        os.makedirs(no_fracture_folder, exist_ok=True)
        os.makedirs(location_folder, exist_ok=True)  # Create location folder
        
        # Get model and track which model was used
        model, feature_model = load_models1()
        
        # Get model info for the stats
        model_info = {"model_id": None, "model_accuracy": None}
        with app.app_context():
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
        
        import concurrent.futures
        from concurrent.futures import ThreadPoolExecutor
        import math
        
        # Determine optimal batch size and number of workers
        total_files = len(file_paths)
        batch_size = min(16, max(1, math.ceil(total_files / 10)))  # Adjust based on total files
        max_workers = min(os.cpu_count() or 4, 8)  # Limit to reasonable number to avoid memory issues
        
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
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
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

# Upload route for multiple X-ray files - optimized
@app.route('/upload-xrays', methods=['POST'])
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
        with app.app_context():
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
        processing_thread.daemon = True  # Make thread exit when main thread exits
        processing_thread.start()
        
        return jsonify({
            'session_id': session_id,
            'message': f'Processing {len(file_paths)} files with threshold {threshold}'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Helper function to check allowed file types
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Get processing status
@app.route('/processing-status/<session_id>', methods=['GET'])
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

# Download results with streaming support for faster downloads
@app.route('/download-results/<session_id>', methods=['GET'])
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

# Cleanup old sessions periodically
def cleanup_old_sessions():
    current_time = datetime.now()
    sessions_to_remove = []
    
    for session_id, session in processing_sessions.items():
        # Parse the created_at timestamp
        created_at = datetime.fromisoformat(session['created_at'])
        # If session is older than 24 hours, mark for removal
        if (current_time - created_at).total_seconds() > 86400:  # 24 hours
            sessions_to_remove.append(session_id)
            # Clean up any zip files
            if 'zip_path' in session and os.path.exists(session['zip_path']):
                try:
                    os.remove(session['zip_path'])
                except:
                    pass
    
    # Remove old sessions
    for session_id in sessions_to_remove:
        del processing_sessions[session_id]

# Setup periodic cleanup
import threading
import time

def cleanup_thread():
    while True:
        time.sleep(3600)  # Run every hour
        cleanup_old_sessions()

# Start cleanup thread when app starts
cleanup_thread = threading.Thread(target=cleanup_thread)
cleanup_thread.daemon = True
cleanup_thread.start()

##########################################################################################################################
@app.route('/extract-dataset', methods=['POST'])
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
        app.logger.error(f"Error extracting dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        # Cleanup temporary directory when done
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            app.logger.warning(f"Error cleaning up temp directory: {str(e)}")
    
###########################################################################################################################


@app.route('/upload_chunk', methods=['POST'])
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
    upload_path = os.path.join(UPLOAD_FOLDER, relative_path)
    os.makedirs(upload_path, exist_ok=True)
    
    # Save the file
    filename = os.path.basename(path)
    file.save(os.path.join(upload_path, secure_filename(filename)))
    
    # Print for debugging
    print(f"Saved file to: {os.path.join(upload_path, secure_filename(filename))}")
    
    return jsonify({'success': True, 'message': 'Chunk uploaded successfully'})

MODEL_SAVE_FOLDER = 'saved_models'

# Ensure model save directory exists
os.makedirs(MODEL_SAVE_FOLDER, exist_ok=True)

# Dictionary to track training progress
training_progress = {
    'status': 'idle',
    'progress': 0,
    'error': None
}

# Route to start model training
@app.route('/api/train', methods=['POST'])
def train_model():
    try:
        # Get training parameters
        dataset_path = request.form.get('dataset_path')
        epochs = int(request.form.get('epochs', 10))
        batch_size = int(request.form.get('batch_size', 32))
        
        # Start training in a background thread to avoid blocking the response
        import threading
        training_thread = threading.Thread(
            target=run_training_process,
            args=(dataset_path, epochs, batch_size)
        )
        training_thread.daemon = True
        training_thread.start()
        
        return jsonify({'message': 'Training started successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to get training progress
@app.route('/api/training_progress', methods=['GET'])
def get_training_progress():
    return jsonify(training_progress)

def run_training_process(dataset_path, epochs, batch_size):
    """Run the training process and store results in the database"""
    global training_progress
    
    training_progress = {
        'status': 'in_progress',
        'progress': 0,
        'error': None
    }
    
    # Create an application context for this thread
    with app.app_context():
        try:
            # Setup full paths
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
            import tempfile
            temp_dir = tempfile.mkdtemp()
            
            # Save models to temporary directory
            temp_main_model_path = os.path.join(temp_dir, "main_model")
            temp_feature_model_path = os.path.join(temp_dir, "feature_model")
            
            model.save(temp_main_model_path)
            feature_model.save(temp_feature_model_path)
            
            # Serialize models to blobs using TensorFlow's SavedModel format
            import io
            import zipfile
            
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
            import shutil
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
                model_path=model_path,  # Keep for backward compatibility
                main_model_blob=main_model_blob,  # Store main model as blob
                feature_model_blob=feature_model_blob,  # Store feature model as blob
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
            import traceback
            print(f"Training error: {str(e)}")
            print(traceback.format_exc())
            
            training_progress['status'] = 'failed'
            training_progress['error'] = str(e)
            return {'error': str(e)}

# Route to get all trained models
@app.route('/api/models', methods=['GET'])
def get_models():
    models = ModelTraining.query.order_by(ModelTraining.timestamp.desc()).all()
    return jsonify([model.to_dict() for model in models])

# Route to get a specific model's metrics
@app.route('/api/models/<int:model_id>', methods=['GET'])
def get_model(model_id):
    model = ModelTraining.query.get_or_404(model_id)
    return jsonify(model.to_dict())

@app.route('/api/models/<int:model_id>', methods=['DELETE'])
def delete_model(model_id):
    try:
        model = ModelTraining.query.get_or_404(model_id)
        
        # Don't allow deletion of active model
        if model.is_active:
            return jsonify({'error': 'Cannot delete the active model'}), 400
        
        # Delete model files if they exist (for backward compatibility)
        if model.model_path and os.path.exists(model.model_path):
            # Check for model directories instead of specific files
            main_model_path = os.path.join(model.model_path, "main_model")
            feature_model_path = os.path.join(model.model_path, "feature_model")
            
            # Delete directories if they exist
            import shutil
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
        import traceback
        print(f"Error deleting model {model_id}: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Route to set a model as active
@app.route('/api/models/<int:model_id>/activate', methods=['POST'])
def activate_model(model_id):
    try:
        model = ModelTraining.query.get_or_404(model_id)
        
        if model.is_active:
            return jsonify({'success': True, 'message': f'Model {model_id} is already active'})
        
        # Check if we have the model data (either as blob or file)
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
            with app.app_context():
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
        import threading
        thread = threading.Thread(target=load_model_in_background)
        thread.daemon = True
        thread.start()
        
        # Return success response immediately
        return jsonify({'success': True, 'message': f'Model {model_id} activation in progress'})
    except Exception as e:
        import traceback
        print(f"Error activating model {model_id}: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
##########################################################################################################################
# Clean up old sessions (run periodically or on startup)
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
                
                session_folder = os.path.join(RESULTS_FOLDER, session_id)
                if os.path.exists(session_folder):
                    shutil.rmtree(session_folder)
                
                sessions_to_remove.append(session_id)
        except Exception as e:
            print(f"Error cleaning up session {session_id}: {str(e)}")
    
    # Remove old sessions
    for session_id in sessions_to_remove:
        del processing_sessions[session_id]

if __name__ == '__main__':

    app.run(debug=True)
