from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
import os

# Initialize extensions first (without the app)
db = SQLAlchemy()
mail = Mail()

def create_app():
    # Initialize the Flask app
    app = Flask(__name__)
    
    # Load configuration
    from config import configure_app
    configure_app(app)
    
    # Initialize extensions with the app
    CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:5000"]}})
    db.init_app(app)
    mail.init_app(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Register blueprints
    from routes.main import main_routes
    from routes.auth import auth_routes
    from routes.users import users_routes
    from routes.prediction import prediction_routes
    from routes.corrections import corrections_routes
    from routes.training import training_routes
    from routes.dataset import dataset_routes
    
    app.register_blueprint(main_routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(users_routes)
    app.register_blueprint(prediction_routes)
    app.register_blueprint(corrections_routes)
    app.register_blueprint(training_routes)
    app.register_blueprint(dataset_routes)
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)