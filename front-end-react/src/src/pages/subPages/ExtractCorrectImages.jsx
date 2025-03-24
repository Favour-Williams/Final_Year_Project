import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './extract-images.css';

export default function ExtractCorrectImages() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'fractured', or 'no-fracture'
  
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

  const getImageUrl = (imagePath) => {
    // Convert relative path to full URL
    return `http://127.0.0.1:5000/images/${imagePath}`;
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
    <div className="extract-images-container">
      <div className="header">
        <h1>Corrected X-Ray Images</h1>
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
          >
            Fractured
          </button>
          <button 
            className={filter === 'no-fracture' ? 'active' : ''} 
            onClick={() => handleFilterChange('no-fracture')}
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
                {correction.annotated_image_path ? (
                  <img 
                    src={getImageUrl(correction.annotated_image_path)} 
                    alt={`Annotated X-ray ${correction.id}`} 
                  />
                ) : (
                  <img 
                    src={getImageUrl(correction.image_path)} 
                    alt={`X-ray ${correction.id}`} 
                  />
                )}
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
  );
}