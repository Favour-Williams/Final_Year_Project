from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import re
import uuid
from datetime import datetime, timedelta
from flask_mail import Message
from app import db, mail
from models.user import User, PasswordReset

auth_routes = Blueprint('auth', __name__, url_prefix='')

@auth_routes.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data['userName']
        password = data['password']

        user = User.query.filter_by(user_name=username).first()

        if user and check_password_hash(user.password, password):
            # Password is correct, send back user details with role
            return jsonify({
                'id': user.id,
                'role': 'admin' if user.user_name == 'admin' else 'doctor',
                'message': 'Login successful'
            })
        else:
            return jsonify({'error': 'Invalid username or password'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_routes.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': 'If the email exists, a reset link will be sent'}), 200
            
        # Generate a unique token
        token = str(uuid.uuid4())
        
        # Calculate expiration,24 hours from now
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


@auth_routes.route('/api/reset-password', methods=['POST'])
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


@auth_routes.route('/api/verify-reset-token/<token>', methods=['GET'])
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