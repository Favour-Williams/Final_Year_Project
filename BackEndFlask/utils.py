import random
import string
import sqlite3
from contextlib import contextmanager
from app import db

# Database utilities
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

def get_db_connection():
    conn = sqlite3.connect('boneDetection.db')
    conn.row_factory = sqlite3.Row  
    return conn

# Function to generate a unique username
def generate_unique_username(last_name):
    from BackEndFlask.models import User
    
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