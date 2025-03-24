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
    <>
      <header className="dashboard-header">
        <div className="logo">
          <div className="logo-icon">
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
    </>
  );
}