import os

def configure_app(app):
    # Base directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "boneDetection.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Mail configuration
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = 'williamsfavour012345@gmail.com'
    app.config['MAIL_PASSWORD'] = 'pnpq mapj lfvi hiue'
    app.config['MAIL_DEFAULT_SENDER'] = 'williamsfavour012345@gmail.com'
    
    # Security
    app.config['SECRET_KEY'] = 'favour$'
    
    # Upload folders
    app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'temp_uploads')
    app.config['RESULTS_FOLDER'] = os.path.join(BASE_DIR, 'sorted_results')
    app.config['MODEL_SAVE_FOLDER'] = os.path.join(BASE_DIR, 'saved_models')
    app.config['MODEL_PATH'] = "bone_fracture_detection_mobilenet_v222.h5"
    
    # Create necessary directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['MODEL_SAVE_FOLDER'], exist_ok=True)