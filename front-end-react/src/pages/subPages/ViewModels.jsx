import React, { useState, useEffect } from 'react';
import '../../styles/viewmodels.css';

export default function ViewModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);
  const [activatingModelId, setActivatingModelId] = useState(null);

  // Fetch all models when component mounts
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:5000/api/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setModels(data);
      setError(null);
    } catch (err) {
      setError('Error loading models: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modelId) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/models/${modelId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete model');
        }
        
        // Refresh the model list
        fetchModels();
      } catch (err) {
        setError('Error deleting model: ' + err.message);
      }
    }
  };

  const handleActivate = async (modelId) => {
    try {
      setActivating(true);
      setActivatingModelId(modelId);
      
      // Add a slight delay to ensure the loading overlay is visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch(`http://127.0.0.1:5000/api/models/${modelId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate model');
      }

      // Update the models list to reflect the new active model
      await fetchModels();
    } catch (err) {
      setError('Error activating model: ' + err.message);
    } finally {
      setActivating(false);
      setActivatingModelId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  return (
    <div className="view-models-container">
      <h1>Trained Models</h1>
      
      {loading && <p>Loading models...</p>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!loading && models.length === 0 && (
        <p>No models found. Train a model to see it here.</p>
      )}
      
      {activating && (
        <div className="activation-overlay">
          <div className="activation-content">
            <div className="spinner"></div>
            <p>Activating Model #{activatingModelId}...</p>
            <p>Please wait while the model is being set as active.</p>
          </div>
        </div>
      )}
      
      {models.length > 0 && (
        <table className="models-table">
          <thead>
            <tr>
              <th>Model ID</th>
              <th>Date Created</th>
              <th>Main Model</th>
              <th>Feature Model</th>
              <th>Accuracy</th>
              <th>Loss</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id} className={model.is_active ? 'active-model' : ''}>
                <td>{model.id}</td>
                <td>{formatDate(model.timestamp)}</td>
                <td>{model.main_model_filename || 'main_model.h5'}</td>
                <td>{model.feature_model_filename || 'feature_model.h5'}</td>
                <td>{(model.accuracy * 100).toFixed(2)}%</td>
                <td>{model.loss.toFixed(4)}</td>
                <td>{model.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button
                    onClick={() => handleActivate(model.id)}
                    disabled={model.is_active || activating}
                    className={model.is_active ? 'active-button' : 'activate-button'}
                  >
                    {model.is_active ? 'Active' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    disabled={model.is_active || activating}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}