from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from app import ModelTraining, app, db

def migrate_existing_models_to_blobs():
    """Migrate existing file-based models to blob storage"""
    print("Starting migration of existing models to blob storage...")
    
    with app.app_context():
        # Get all models that have a file path but no blobs
        models = ModelTraining.query.filter(
            ModelTraining.model_path.isnot(None),
            ModelTraining.main_model_blob.is_(None)
        ).all()
        
        print(f"Found {len(models)} models to migrate")
        
        import io
        import zipfile
        import os
        
        # Function to zip a directory into a bytes object
        def zip_directory_to_bytes(directory):
            if not os.path.exists(directory):
                print(f"Directory not found: {directory}")
                return None
                
            bytes_io = io.BytesIO()
            with zipfile.ZipFile(bytes_io, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, _, files in os.walk(directory):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, directory)
                        zipf.write(file_path, arcname)
            return bytes_io.getvalue()
        
        for i, model in enumerate(models, 1):
            print(f"Migrating model {model.id} ({i}/{len(models)})")
            
            main_model_path = os.path.join(model.model_path, "main_model")
            feature_model_path = os.path.join(model.model_path, "feature_model")
            
            # Check if the directories exist
            if not os.path.exists(main_model_path) or not os.path.exists(feature_model_path):
                print(f"Skipping model {model.id}: Model files not found at {model.model_path}")
                continue
            
            try:
                # Create blobs
                main_model_blob = zip_directory_to_bytes(main_model_path)
                feature_model_blob = zip_directory_to_bytes(feature_model_path)
                
                if main_model_blob and feature_model_blob:
                    # Save blobs to database
                    model.main_model_blob = main_model_blob
                    model.feature_model_blob = feature_model_blob
                    db.session.commit()
                    print(f"Successfully migrated model {model.id}")
                else:
                    print(f"Skipping model {model.id}: Failed to create blobs")
            except Exception as e:
                print(f"Error migrating model {model.id}: {str(e)}")
                db.session.rollback()
        
        print("Migration completed")

# Run the migration function
if __name__ == "__main__":
    migrate_existing_models_to_blobs()