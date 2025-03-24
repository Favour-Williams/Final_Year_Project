import React, { useState } from 'react';
import CorrectionButton from './CorrectionButton';
import LocateButton from './LocateButton';
import '../../styles/PredictXray.css';

export default function PredictXray() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // For demonstration purposes, assuming the logged-in doctor has an ID
  const doctorId = "doctor_123"; // In a real app, this would come from authentication

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create a preview URL for the image
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select an X-ray image first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('xray_image', file);

      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const result = await response.json();
      setPrediction(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="predict-xray-container">
      <h1 className="predict-xray-title">X-ray Fracture Detection</h1>
      
      <form onSubmit={handleSubmit} className="predict-xray-form">
        <div className="input-group">
          <label className="input-label">Upload X-ray Image</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="predict-button"
        >
          {loading ? 'Processing...' : 'Predict'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="result-grid">
        {/* Preview uploaded image */}
        {previewUrl && (
          <div className="preview-container">
            <h2 className="preview-title">Uploaded Image</h2>
            <img 
              src={previewUrl} 
              alt="X-ray preview" 
              className="preview-image"
            />
          </div>
        )}

        {/* Show prediction results */}
        {prediction && (
          <div className={`prediction-container ${prediction.fracture_detected ? 'fracture' : 'no-fracture'}`}>
            <h2 className="prediction-title">Prediction Result</h2>
            <div className="prediction-result">
              {prediction.fracture_detected ? 'Fracture Detected' : 'No Fracture Detected'}
            </div>
            <div className="prediction-confidence">
              Confidence: {(prediction.confidence * 100).toFixed(2)}%
            </div>
            <div className="prediction-time">
              Processed in {prediction.processing_time.toFixed(2)} seconds
            </div>
            
            {/* Add the correction button */}
            <CorrectionButton 
              imageData={previewUrl} 
              prediction={prediction} 
              doctorId={doctorId} 
            />
            
            {/* Add the locate button for fracture localization */}
            <LocateButton 
              imageFile={file}
              predictionResult={prediction} 
            />
          </div>
        )}
      </div>
    </div>
  );
}