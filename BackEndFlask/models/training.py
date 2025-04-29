from datetime import datetime
import json
from app import db

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
    model_path = db.Column(db.String(255))
    main_model_blob = db.Column(db.LargeBinary)
    feature_model_blob = db.Column(db.LargeBinary)
    is_active = db.Column(db.Boolean, default=False)
    accuracy_history = db.Column(db.Text)
    loss_history = db.Column(db.Text)
    val_accuracy_history = db.Column(db.Text)
    val_loss_history = db.Column(db.Text)
    precision_history = db.Column(db.Text)
    recall_history = db.Column(db.Text)
    f1_history = db.Column(db.Text)
    
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
            'has_model_blob': self.main_model_blob is not None,
            'accuracy_history': json.loads(self.accuracy_history) if self.accuracy_history else None,
            'loss_history': json.loads(self.loss_history) if self.loss_history else None,
            'val_accuracy_history': json.loads(self.val_accuracy_history) if self.val_accuracy_history else None,
            'val_loss_history': json.loads(self.val_loss_history) if self.val_loss_history else None,
            'precision_history': json.loads(self.precision_history) if self.precision_history else None,
            'recall_history': json.loads(self.recall_history) if self.recall_history else None,
            'f1_history': json.loads(self.f1_history) if self.f1_history else None
        }