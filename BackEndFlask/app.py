import os
import uuid
import shutil
import zipfile
import tempfile
import threading
import cv2
import traceback
import sqlite3
import time
import tempfile
import tensorflow as tf
import numpy as np

import datetime

# Add these to your imports
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from contextlib import contextmanager
from werkzeug.utils import secure_filename
from model.cnnModel import build_model
from model.predictImage import predict_image
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


# Initialize the Flask app
app = Flask(__name__)

# Mail configuration
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
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

##########################################################################################################################


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

        if user and user.password == password:  # Directly comparing plain text password
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

# Update the create_user route
@app.route('/admin/create-user', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        
        with get_db_session() as session:
            # Check if user exists
            existing_user = session.query(User).filter(
                (User.user_name == data['userName']) | 
                (User.email == data['email'])
            ).first()
            
            if existing_user:
                return jsonify({
                    'error': 'Username or email already exists'
                }), 400

            # Create new user
            new_user = User(
                first_name=data['firstName'],
                last_name=data['lastName'],
                other_name=data.get('otherName', ''),
                user_name=data['userName'],
                phone_number=data['phoneNumber'],
                email=data['email'],
                password=data['password']
            )
            
            session.add(new_user)
            session.commit()
            
            # Get the new user's ID
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
                Username: {data['userName']}
                Password: {data['password']}
                
                Please change your password after your first login.
                """
                mail.send(msg)
            except Exception as e:
                print(f"Error sending email: {str(e)}")

            return jsonify({
                'message': 'User created successfully',
                'userId': user_id
            }), 201
            
    except Exception as e:
        print("Error details:", str(e))
        print(traceback.format_exc())
        return jsonify({
            'error': 'An error occurred while creating the user: ' + str(e)
        }), 500
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
                user.password = data['password']
                
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
            
        # Update password
        user.password = new_password
        
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
model = None
def load_model():
    global model
    if model is None:
        print("Loading X-ray prediction model...")
        model = build_model(input_shape=(128, 128, 3))
        model.load_weights('bone_fracture_detection_model_v3.h5')
        print("Model loaded successfully")
    return model

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Check if an image was uploaded
        if 'xray_image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        file = request.files['xray_image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Create a temporary file to save the uploaded image
        start_time = time.time()
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename(file.filename))
        file.save(temp_path)
        
        # Load the model if not already loaded
        model = load_model()
        
        # Process image and get prediction
        # Modified predict_image function to return prediction values instead of printing
        # import cv2
        image = cv2.imread(temp_path)
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
            
        image = cv2.resize(image, (128, 128)) / 255.0
        image = np.expand_dims(image, axis=0)  # Add batch dimension
        
        prediction_value = float(model.predict(image)[0][0])
        threshold = 0.3
        fracture_detected = prediction_value > threshold
        
        # Clean up the temporary file
        os.remove(temp_path)
        os.rmdir(temp_dir)
        
        processing_time = time.time() - start_time
        
        # Return the prediction result
        return jsonify({
            'fracture_detected': bool(fracture_detected),
            'confidence': float(prediction_value),
            'processing_time': processing_time
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


##########################################################################################################################    
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sorted_results')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)
# Store processing sessions
processing_sessions = {}

def predict1(image_path, model, threshold=0.3):
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Error: Image not found or invalid format.")
    
    processed_image = image.copy()  # Keep original for saving later
    
    # Resize for prediction
    resized_image = cv2.resize(image, (128, 128)) / 255.0
    resized_image = np.expand_dims(resized_image, axis=0)  # Add batch dimension
    
    prediction = model.predict(resized_image)[0][0]
    category = "fracture" if prediction > threshold else "no_fracture"
    
    return processed_image, category, float(prediction)

# Process uploaded files in background
def process_files(session_id, file_paths, threshold=0.3):
    try:
        # Create session folders
        session_folder = os.path.join(RESULTS_FOLDER, session_id)
        fracture_folder = os.path.join(session_folder, "fracture")
        no_fracture_folder = os.path.join(session_folder, "no_fracture")
        os.makedirs(fracture_folder, exist_ok=True)
        os.makedirs(no_fracture_folder, exist_ok=True)
        
        # Get model
        model = load_model()
        
        # Track statistics
        stats = {
            "fracture_count": 0,
            "no_fracture_count": 0,
            "total": len(file_paths),
            "start_time": time.time()
        }
        
        # Process each file
        for i, file_path in enumerate(file_paths):
            try:
                # Update progress
                processing_sessions[session_id]["progress"] = int((i / len(file_paths)) * 100)
                
                # Predict and sort
                filename = os.path.basename(file_path)
                processed_image, category, confidence = predict1(file_path, model, threshold)
                
                # Determine destination folder
                if category == "fracture":
                    save_path = os.path.join(fracture_folder, filename)
                    stats["fracture_count"] += 1
                else:
                    save_path = os.path.join(no_fracture_folder, filename)
                    stats["no_fracture_count"] += 1
                
                # Save processed image
                cv2.imwrite(save_path, processed_image)
                
            except Exception as e:
                print(f"Error processing file {file_path}: {str(e)}")
                # Continue processing other files
        
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


##########################################################################################################################
# Upload route for multiple X-ray files
@app.route('/upload-xrays', methods=['POST'])
def upload_xrays():
    try:
        # Check if files were uploaded
        if 'files' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('files')
        if not files or files[0].filename == '':
            return jsonify({'error': 'No files selected'}), 400
        
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
            args=(session_id, file_paths)
        )
        processing_thread.start()
        
        return jsonify({
            'session_id': session_id,
            'message': f'Processing {len(file_paths)} files'
        })
    
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


##########################################################################################################################
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


##########################################################################################################################
# Download results
@app.route('/download-results/<session_id>', methods=['GET'])
def download_results(session_id):
    if session_id not in processing_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = processing_sessions[session_id]
    if session['status'] != 'completed':
        return jsonify({'error': 'Processing not completed yet'}), 400
    
    if not os.path.exists(session['zip_path']):
        return jsonify({'error': 'Result file not found'}), 404
    
    # Return the zip file
    return send_file(
        session['zip_path'],
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'sorted_xrays_{session_id[:8]}.zip'
    )


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
