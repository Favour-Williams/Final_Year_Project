from flask import Blueprint, request, jsonify, send_file, current_app
import base64
import json
import io
from app import db
from models.image import ImageCorrection
from datetime import datetime, timedelta


corrections_routes = Blueprint('corrections', __name__, url_prefix='')

@corrections_routes.route('/submit-correction', methods=['POST'])
def submit_correction():
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Required fields
        image_id = data.get('imageId')
        doctor_id = data.get('doctorId')
        original_prediction = data.get('originalPrediction', {})
        correction_type = data.get('correctionType')
        rectangles = data.get('rectangles', [])
        image_data = data.get('imageData')
        annotated_image_data = data.get('annotatedImageData')
        
        # Validation
        if not image_id or not doctor_id or not correction_type or not image_data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Process original image
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Convert base64 to binary
            original_image_binary = base64.b64decode(image_data)
        except Exception as e:
            current_app.logger.error(f"Error processing original image: {str(e)}")
            return jsonify({'error': f'Failed to process image: {str(e)}'}), 500
        
        # Process annotated image 
        annotated_image_binary = None
        if annotated_image_data:
            try:
                # Remove data URL prefix if present
                if ',' in annotated_image_data:
                    annotated_image_data = annotated_image_data.split(',')[1]
                
                # Convert base64 to binary
                annotated_image_binary = base64.b64decode(annotated_image_data)
            except Exception as e:
                current_app.logger.error(f"Error processing annotated image: {str(e)}")
               
        
        # Convert rectangles to JSON string if present
        fracture_locations = json.dumps(rectangles) if rectangles else None
        
        # Create new correction
        correction = ImageCorrection(
            image_id=image_id,
            doctor_id=doctor_id,
            original_prediction=original_prediction.get('fracture_detected', False),
            correction_type=correction_type,
            fracture_locations=fracture_locations,
            original_image=original_image_binary,
            annotated_image=annotated_image_binary,
            timestamp=datetime.utcnow()
        )
        
        # Save to database
        db.session.add(correction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Correction submitted successfully. Thank you for your feedback!',
            'correction_id': correction.id
        })
        
    except Exception as e:
        current_app.logger.error(f"Error in submit_correction: {str(e)}")
        return jsonify({'error': str(e)}), 500


@corrections_routes.route('/corrections', methods=['GET'])
def get_corrections():
    try:
        # Query all image corrections from the database
        corrections = ImageCorrection.query.order_by(ImageCorrection.timestamp.desc()).all()
        
        # Convert to list of dictionaries
        corrections_list = []
        for correction in corrections:
            correction_data = {
                'id': correction.id,
                'image_id': correction.image_id,
                'doctor_id': correction.doctor_id,
                'original_prediction': correction.original_prediction,
                'correction_type': correction.correction_type,
                'timestamp': correction.timestamp.isoformat(),
                # Add URLs for fetching images
                'original_image_url': f'/correction-image/{correction.id}/original',
                'annotated_image_url': f'/correction-image/{correction.id}/annotated' if correction.annotated_image else None
            }
            
            # Include fracture locations if available
            if correction.fracture_locations:
                correction_data['fracture_locations'] = json.loads(correction.fracture_locations)
                
            corrections_list.append(correction_data)
            
        return jsonify(corrections_list)
        
    except Exception as e:
        current_app.logger.error(f"Error fetching corrections: {str(e)}")
        return jsonify({'error': str(e)}), 500


@corrections_routes.route('/correction-image/<int:correction_id>/<image_type>', methods=['GET'])
def serve_correction_image(correction_id, image_type):
    try:
        # Get the correction record
        correction = ImageCorrection.query.get_or_404(correction_id)
        
        if image_type == 'original' and correction.original_image:
            return send_file(
                io.BytesIO(correction.original_image),
                mimetype='image/png'
            )
        elif image_type == 'annotated' and correction.annotated_image:
            return send_file(
                io.BytesIO(correction.annotated_image),
                mimetype='image/png'
            )
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        current_app.logger.error(f"Error serving image: {str(e)}")
        return jsonify({'error': str(e)}), 500