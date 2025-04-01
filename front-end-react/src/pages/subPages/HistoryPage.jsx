import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/HistoryPage.css'

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const location = useLocation();
  const doctorId = location.state?.doctorId || "unknown";

  useEffect(() => {
    // Fetch prediction history when component mounts
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/history/${doctorId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch prediction history');
        }
        
        const data = await response.json();
        setPredictions(data.predictions);
      } catch (err) {
        setError(err.message || 'Error fetching history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [doctorId]);

  // Function to convert binary data to image URL
  const binaryToImageUrl = (binaryData) => {
    return `data:image/jpeg;base64,${binaryData}`;
  };
  
  // Function to open the localization popup
  const openLocalizationPopup = (prediction) => {
    setSelectedImage(prediction);
  };
  
  // Function to close the popup
  const closePopup = () => {
    setSelectedImage(null);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) return <div className="loading">Loading prediction history...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="history-container">
      <h1 className="history-title">X-ray Prediction History</h1>
      
      {predictions.length === 0 ? (
        <div className="no-predictions">No prediction history found.</div>
      ) : (
        <div className="prediction-history-grid">
          {predictions.map((prediction) => (
            <div 
              key={prediction.id} 
              className={`history-item ${prediction.classification ? 'fracture' : 'no-fracture'}`}
            >
              <div className="history-image-container">
                <img 
                  src={binaryToImageUrl(prediction.image_data)} 
                  alt={`X-ray ${prediction.id}`} 
                  className="history-image"
                />
              </div>
              
              <div className="history-details">
                <div className="history-filename">{prediction.image_name}</div>
                <div className="history-date">{formatDate(prediction.upload_date)}</div>
                <div className="history-classification">
                  {prediction.classification ? 'Fracture Detected' : 'No Fracture'}
                </div>
                <div className="history-confidence">
                  Confidence: {(prediction.confidence * 100).toFixed(2)}%
                </div>
                
                {prediction.classification && prediction.annotated_image && (
                  <button 
                    className="view-localization-btn"
                    onClick={() => openLocalizationPopup(prediction)}
                  >
                    View Fracture Location
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Localization Popup */}
      {selectedImage && (
        <div className="localization-popup-overlay" onClick={closePopup}>
          <div className="localization-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Fracture Localization</h2>
              <button className="close-popup" onClick={closePopup}>×</button>
            </div>
            
            <div className="popup-content">
              <div className="popup-images">
                <div className="original-image-container">
                  <h3>Original Image</h3>
                  <img 
                    src={binaryToImageUrl(selectedImage.image_data)} 
                    alt="Original X-ray" 
                    className="popup-image"
                  />
                </div>
                
                <div className="annotated-image-container">
                  <h3>Localized Fracture</h3>
                  <img 
                    src={binaryToImageUrl(selectedImage.annotated_image)} 
                    alt="Annotated X-ray" 
                    className="popup-image"
                  />
                </div>
              </div>
              
              <div className="popup-details">
                <div><strong>Prediction:</strong> Fracture Detected</div>
                <div><strong>Confidence:</strong> {(selectedImage.confidence * 100).toFixed(2)}%</div>
                <div><strong>Date:</strong> {formatDate(selectedImage.upload_date)}</div>
                {selectedImage.localization_boxes && (
                  <div>
                    <strong>Detected Fractures:</strong> {selectedImage.localization_boxes.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}