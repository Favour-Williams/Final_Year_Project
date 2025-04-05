import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../styles/HistoryPage.css'

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const doctorId = location.state?.doctorId || "unknown";

  useEffect(() => {
    // Fetch prediction history when component mounts
    fetchHistory();
  }, [doctorId]);
  
  const fetchHistory = async () => {
    try {
      setLoading(true);
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

  // Function to delete a prediction
  const handleDeletePrediction = async (predictionId) => {
    if (!window.confirm('Are you sure you want to delete this prediction?')) {
      return;
    }
    
    try {
      setDeleteLoading(predictionId);
      const response = await fetch(`http://127.0.0.1:5000/predictions/${predictionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete prediction');
      }
      
      // Update the UI by removing the deleted prediction
      setPredictions(predictions.filter(p => p.id !== predictionId));
    } catch (err) {
      setError(err.message || 'Error deleting prediction');
    } finally {
      setDeleteLoading(null);
    }
  };

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
      <div className="history-container">
        <h1 className="text-2xl font-bold mb-6">X-ray Prediction History</h1>
        
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
                  
                  <div className="history-actions">
                    {prediction.classification && prediction.annotated_image && (
                      <button 
                        className="view-localization-btn"
                        onClick={() => openLocalizationPopup(prediction)}
                      >
                        View Fracture Location
                      </button>
                    )}
                    
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeletePrediction(prediction.id)}
                      disabled={deleteLoading === prediction.id}
                    >
                      {deleteLoading === prediction.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
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
    </>
  );
}