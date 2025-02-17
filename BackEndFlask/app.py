from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
import traceback
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
from contextlib import contextmanager


# Initialize the Flask app
app = Flask(__name__)

# Mail configuration
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})
app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Use Gmail SMTP or your email provider
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'williamsfavour012345@gmail.com'  # Your email
app.config['MAIL_PASSWORD'] = 'pnpq mapj lfvi hiue'  # Use an App Password if using Gmail
app.config['MAIL_DEFAULT_SENDER'] = 'williamsfavour012345@gmail.com'  # Sender email
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




# Route for home
@app.route('/', methods=['GET'])
def home():
    return "SQLite connected successfully."

# Route for login
def get_db_connection():
    conn = sqlite3.connect('boneDetection.db')
    conn.row_factory = sqlite3.Row  
    return conn

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

# Add this initialization code



if __name__ == '__main__':

    app.run(debug=True)
