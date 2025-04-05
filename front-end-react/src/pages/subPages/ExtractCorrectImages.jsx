import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import './extract-images.css';

export default function ExtractCorrectImages() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); 
  const navigate = useNavigate();
  
  // Dataset extraction state
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [trainingPercentage, setTrainingPercentage] = useState(80);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    const fetchCorrectedImages = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:5000/corrections', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        setCorrections(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching corrected images:', err);
        setError('Failed to load corrected images');
        setLoading(false);
      }
    };

    fetchCorrectedImages();
  }, []);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const getFilteredCorrections = () => {
    if (filter === 'all') {
      return corrections;
    }
    return corrections.filter(correction => correction.correction_type === filter);
  };

  // Updated to use the new endpoints that serve images from the database
  const getImageUrl = (correction) => {
    if (correction.annotated_image_url) {
      return `http://127.0.0.1:5000${correction.annotated_image_url}`;
    }
    return `http://127.0.0.1:5000${correction.original_image_url}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleExtractButtonClick = () => {
    setShowExtractionModal(true);
  };

  const handleCloseModal = () => {
    setShowExtractionModal(false);
    setExtractionStatus('');
  };

  const handleExtractDataset = async () => {
    setIsExtracting(true);
    setExtractionStatus('Preparing dataset extraction...');
    
    try {
      // Extract the dataset with the specified training percentage
      const response = await axios.post('http://127.0.0.1:5000/extract-dataset', {
        training_percentage: trainingPercentage
      }, {
        responseType: 'blob' // Important for handling the downloaded file
      });
      
      // Create a download link for the zip file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `x-ray-dataset-${trainingPercentage}pct-training.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExtractionStatus('Dataset extracted and downloaded successfully!');
    } catch (err) {
      console.error('Error extracting dataset:', err);
      setExtractionStatus(`Failed to extract dataset: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  if (loading) return <div className="loading-container">Loading corrected images...</div>;
  if (error) return <div className="error-container">{error}</div>;

  const filteredCorrections = getFilteredCorrections();

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
      <div className="extract-images-container">
        <div className="header">
          <h1 className="text-2xl font-bold mb-6"> Corrected X-Ray Images</h1>
          <div className="filter-controls">
              <button 
                className={filter === 'all' ? 'active' : ''} 
                onClick={() => handleFilterChange('all')}
              >
                All Images
              </button>
              <button 
                className={filter === 'fractured' ? 'active' : ''} 
                onClick={() => handleFilterChange('fractured')}
                data-type="fractured"
              >
                Fractured
              </button>
              <button 
                className={filter === 'no-fracture' ? 'active' : ''} 
                onClick={() => handleFilterChange('no-fracture')}
                data-type="no-fracture" 
              >
                No Fracture
              </button>
              <button 
                className="extract-button"
                onClick={handleExtractButtonClick}
              >
                Extract Dataset
              </button>
            </div>
        </div>

        <div className="stats-summary">
          <div className="stat-box">
            <h3>Total Corrections</h3>
            <p>{corrections.length}</p>
          </div>
          <div className="stat-box">
            <h3>Fractures</h3>
            <p>{corrections.filter(c => c.correction_type === 'fractured').length}</p>
          </div>
          <div className="stat-box">
            <h3>No Fractures</h3>
            <p>{corrections.filter(c => c.correction_type === 'no-fracture').length}</p>
          </div>
        </div>

        {filteredCorrections.length === 0 ? (
          <div className="no-results">No images found for the selected filter.</div>
        ) : (
          <div className="image-grid">
            {filteredCorrections.map((correction) => (
              <div key={correction.id} className={`image-card ${correction.correction_type}`}>
                <div className="image-container">
                  {/* Use the new image URL format */}
                  <img 
                    src={getImageUrl(correction)} 
                    alt={`X-ray ${correction.id}`} 
                  />
                  <div className="image-type-badge">
                    {correction.correction_type === 'fractured' ? 'Fracture' : 'No Fracture'}
                  </div>
                </div>
                <div className="image-details">
                  <p><strong>Doctor User Name:</strong> {correction.doctor_id}</p>
                  <p><strong>Original Prediction:</strong> {correction.original_prediction ? 'Fracture' : 'No Fracture'}</p>
                  <p><strong>Date:</strong> {formatDate(correction.timestamp)}</p>
                  {correction.fracture_locations && (
                    <p><strong>Annotations:</strong> Yes</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showExtractionModal && (
          <div className="modal-overlay">
            <div className="extraction-modal">
              <h2>Extract Dataset</h2>
              <p>Images will be organized into the following structure:</p>
              <ul>
                <li>dataset/training/fractured</li>
                <li>dataset/training/non_fractured</li>
                <li>dataset/testing/fractured</li>
                <li>dataset/testing/non_fractured</li>
              </ul>
              
              <div className="percentage-control">
                <label htmlFor="training-percentage">Training Set Percentage:</label>
                <input
                  type="range"
                  id="training-percentage"
                  min="50"
                  max="90"
                  step="5"
                  value={trainingPercentage}
                  onChange={(e) => setTrainingPercentage(parseInt(e.target.value))}
                />
                <span>{trainingPercentage}% Training / {100 - trainingPercentage}% Testing</span>
              </div>
              
              {extractionStatus && (
                <div className={`extraction-status ${isExtracting ? 'extracting' : ''}`}>
                  {extractionStatus}
                </div>
              )}
              
              <div className="modal-buttons">
                <button 
                  className="cancel-button" 
                  onClick={handleCloseModal}
                  disabled={isExtracting}
                >
                  Cancel
                </button>
                <button 
                  className="extract-button"
                  onClick={handleExtractDataset}
                  disabled={isExtracting}
                >
                  {isExtracting ? 'Extracting...' : 'Extract and Download'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}