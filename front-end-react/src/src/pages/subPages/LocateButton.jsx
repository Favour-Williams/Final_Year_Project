import React, { useState } from 'react';
import '../../styles/LocateButton.css';

export default function LocateButton({ imageFile, predictionResult }) {
  const [localization, setLocalization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleLocate = async () => {
    if (!imageFile || !predictionResult?.fracture_detected) {
      return;
    }

    setLoading(true);
    setError(null);
    setShowModal(true);
    
    try {
      const formData = new FormData();
      formData.append('xray_image', imageFile);

      const response = await fetch('http://127.0.0.1:5000/locate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to localize fracture');
      }

      const result = await response.json();
      setLocalization(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="locate-button-container">
      {predictionResult?.fracture_detected && (
        <button
          onClick={handleLocate}
          disabled={loading}
          className="locate-button"
        >
          {loading ? 'Localizing...' : 'Locate Fracture'}
        </button>
      )}

      {error && (
        <div className="locate-error">
          {error}
        </div>
      )}

      {showModal && (
        <div className="correction-modal-overlay" onClick={closeModal}>
          <div className="correction-modal-container" onClick={e => e.stopPropagation()}>
            <h2 className="correction-modal-title">Fracture Localization</h2>
            
            <div className="locate-modal-layout">
              {/* Original image on the left */}
              <div className="locate-upload-container">
                <h3 className="preview-title">Original X-ray</h3>
                {imageFile && (
                  <img 
                    src={URL.createObjectURL(imageFile)} 
                    alt="Original X-ray" 
                    className="preview-image"
                  />
                )}
              </div>
              
              {/* Localized result on the right */}
              <div className="locate-result-container">
                <h3 className="locate-result-title">Localization Result</h3>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <p>Processing image...</p>
                  </div>
                ) : localization ? (
                  <div>
                    <div className="locate-result-image-container">
                      <img 
                        src={localization.result_image} 
                        alt="Fracture localization" 
                        className="locate-result-image"
                      />
                    </div>
                    <p className="locate-result-info">
                      {localization.localization_boxes.length} potential fracture sites identified
                    </p>
                  </div>
                ) : error ? (
                  <div className="locate-error">
                    {error}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p>Waiting for analysis...</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="correction-actions">
              <button onClick={closeModal} className="correction-cancel-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}