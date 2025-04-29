from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import random
import string
import traceback
from flask_mail import Message
from contextlib import contextmanager
from app import db, mail
from models.user import User

users_routes = Blueprint('users', __name__, url_prefix='')

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


@users_routes.route('/users/<int:user_id>', methods=['GET'])
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
    

@users_routes.route('/admin/create-user', methods=['POST'])
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


@users_routes.route('/api/doctors', methods=['GET'])
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


@users_routes.route('/api/users/<int:user_id>', methods=['DELETE'])
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


@users_routes.route('/api/users/<int:user_id>', methods=['PUT'])
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