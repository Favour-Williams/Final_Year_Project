import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import CorrectionButton from './CorrectionButton';
import LocateButton from './LocateButton';
import '../../styles/PredictXray.css';
import { useNavigate } from "react-router-dom";
export default function PredictXray() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const doctorId = location.state?.doctorId || "unknown";
  const doctorName = location.state?.doctorName || "unknown";

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
        formData.append('doctor_id', doctorId);  // Add doctor ID to the form data

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
    <>
      <header className="dashboard-header">
        <div className="logo">
        <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
      </header>

      <div class="icon-background">
        <div class="bg-icon icon-1">👤</div>
        <div class="bg-icon icon-2">📱</div>
        <div class="bg-icon icon-3">💻</div>
        <div class="bg-icon icon-4">📧</div>
        <div class="bg-icon icon-5">🔑</div>
        <div class="bg-icon icon-6">⚙️</div>
        <div class="bg-icon icon-7">📊</div>
        <div class="bg-icon icon-8">📈</div>
        <div class="bg-icon icon-9">👑</div>
        <div class="bg-icon icon-10">🌟</div>
        <div class="bg-icon icon-11">🚀</div>
        <div class="bg-icon icon-12">💡</div>
        <div class="bg-icon icon-13">🎯</div>
        <div class="bg-icon icon-14">⭐</div>
        <div class="bg-icon icon-15">🔔</div>
        <div class="bg-icon icon-16">📝</div>
        <div class="bg-icon icon-17">🏆</div>
        <div class="bg-icon icon-18">👍</div>
        <div class="bg-icon icon-19">📂</div>
        <div class="bg-icon icon-20">🔍</div>
      </div>

      <div 
        className="back-arrow" 
        onClick={() => navigate(-1)} 
        title="Go back to previous page"
      ></div>
      <div className="predict-xray-container">
        <div className="predict-xray-header">
          <h1 className="predict-xray-title text-2xl font-bold mb-6">X-ray Fracture Detection</h1>
          <Link 
            to="/history" 
            state={{ doctorId: doctorId, doctorName: doctorName }}
            className="history-link"
          >
            View History
          </Link>
        </div>
        
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
                doctorId={doctorName} 
              />
              
              {/* Add the locate button for fracture localization */}
              <LocateButton 
                imageFile={file}
                predictionResult={prediction}
                doctorId={doctorId}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}