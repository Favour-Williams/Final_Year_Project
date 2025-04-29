from datetime import datetime
from app import db

class ImageCorrection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.String(100), nullable=False)
    doctor_id = db.Column(db.String(100), nullable=False)
    original_prediction = db.Column(db.Boolean, nullable=False)
    correction_type = db.Column(db.String(20), nullable=False)
    fracture_locations = db.Column(db.Text, nullable=True)
    original_image = db.Column(db.LargeBinary, nullable=False)
    annotated_image = db.Column(db.LargeBinary, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class ImagePrediction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_data = db.Column(db.LargeBinary, nullable=False)
    image_name = db.Column(db.String(100), nullable=False)
    upload_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    prediction = db.Column(db.Float, nullable=False)
    classification = db.Column(db.Boolean, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    processing_time = db.Column(db.Float, nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    localization_boxes = db.Column(db.JSON)
    annotated_image = db.Column(db.LargeBinary)
    
    # foreign key
    doctor = db.relationship('User', backref=db.backref('predictions', lazy=True))