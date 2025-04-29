import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/viewmodels.css';

export default function ViewModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);
  const [activatingModelId, setActivatingModelId] = useState(null);
  const [activationProgress, setActivationProgress] = useState(0);
  const navigate = useNavigate();

  const POLL_INTERVAL = 200;
  const MAX_ACTIVATION_TIME = 7000;

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
      setActivationProgress(0);
      
      // Make the API call to activate the model
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

      // Start progress animation
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / MAX_ACTIVATION_TIME) * 100, 99);
        setActivationProgress(progress);
        
        if (elapsed >= MAX_ACTIVATION_TIME) {
          clearInterval(progressInterval);
          finishActivation();
        }
      }, POLL_INTERVAL);
      
      setTimeout(() => {
        clearInterval(progressInterval);
        finishActivation();
      }, MAX_ACTIVATION_TIME);

    } catch (err) {
      setError('Error activating model: ' + err.message);
      setActivating(false);
      setActivatingModelId(null);
    }
  };

  const finishActivation = async () => {
    setActivationProgress(100);
    
    // Small delay to show 100% completion before refreshing
    setTimeout(async () => {
      // Update the models list to reflect the new active model
      await fetchModels();
      setActivating(false);
      setActivatingModelId(null);
    }, 300);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; 
  };

  // Format metrics to display with 2 decimal places and percentage
  const formatMetric = (value) => {
    return value !== null && value !== undefined 
      ? `${(value * 100).toFixed(2)}%` 
      : 'N/A';
  };

  // Generate mock training history data for visualization
  // In a real app, this would come from your API
  const generateTrainingData = (model) => {
    const epochs = model.epochs || 10;
    const finalAccuracy = model.accuracy || 0.85;
    const finalLoss = model.loss || 0.15;
    const finalPrecision = model.precision || 0.84;
    const finalRecall = model.recall || 0.86;
    const finalF1 = model.f1_score || 0.85;
    
    const data = [];
    
    for (let i = 0; i <= epochs; i++) {
      // Create a curve that gradually improves and stabilizes
      const progress = i / epochs;
      const easing = 1 - Math.pow(1 - progress, 3); // Cubic easing
      
      data.push({
        epoch: i,
        accuracy: 0.5 + (finalAccuracy - 0.5) * easing,
        loss: 0.5 - (0.5 - finalLoss) * easing,
        precision: 0.5 + (finalPrecision - 0.5) * easing,
        recall: 0.5 + (finalRecall - 0.5) * easing,
        f1_score: 0.5 + (finalF1 - 0.5) * easing,
      });
    }
    
    return data;
  };

  // Find active model
  const activeModel = models.find(model => model.is_active);

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
    
      <div className="icon-background">
        <div className="bg-icon icon-1">👤</div>
        <div className="bg-icon icon-2">📱</div>
        <div className="bg-icon icon-3">💻</div>
        <div className="bg-icon icon-4">📧</div>
        <div className="bg-icon icon-5">🔑</div>
        <div className="bg-icon icon-6">⚙️</div>
        <div className="bg-icon icon-7">📊</div>
        <div className="bg-icon icon-8">📈</div>
        <div className="bg-icon icon-9">👑</div>
        <div className="bg-icon icon-10">🌟</div>
        <div className="bg-icon icon-11">🚀</div>
        <div className="bg-icon icon-12">💡</div>
        <div className="bg-icon icon-13">🎯</div>
        <div className="bg-icon icon-14">⭐</div>
        <div className="bg-icon icon-15">🔔</div>
        <div className="bg-icon icon-16">📝</div>
        <div className="bg-icon icon-17">🏆</div>
        <div className="bg-icon icon-18">👍</div>
        <div className="bg-icon icon-19">📂</div>
        <div className="bg-icon icon-20">🔍</div>
      </div>
      <div 
        className="back-arrow" 
        onClick={() => navigate(-1)} 
        title="Go back to previous page"
      ></div>
      <div className="view-models-container">
        <h1 className="text-2xl font-bold mb-6">Trained Models</h1>
        
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
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${activationProgress}%` }}
                ></div>
              </div>
              <p>{activationProgress.toFixed(0)}% complete</p>
            </div>
          </div>
        )}
        
        {models.length > 0 && (
          <div className="models-section">
            <table className="models-table">
              <thead>
                <tr>
                  <th>Model ID</th>
                  <th>Date Created</th>
                  <th>Epochs</th>
                  <th>Accuracy</th>
                  <th>Loss</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1 Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr 
                    key={model.id} 
                    className={model.is_active ? 'active-model' : ''}
                  >
                    <td>{model.id}</td>
                    <td>{formatDate(model.timestamp)}</td>
                    <td>{model.epochs}</td>
                    <td>{formatMetric(model.accuracy)}</td>
                    <td>{model.loss?.toFixed(4) || 'N/A'}</td>
                    <td>{formatMetric(model.precision)}</td>
                    <td>{formatMetric(model.recall)}</td>
                    <td>{formatMetric(model.f1_score)}</td>
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
            
            {activeModel && (
              <div className="performance-graphs">
                <h2 className="text-lg font-bold mb-2">Performance Metrics for Active Model #{activeModel.id}</h2>
                <div className="graph-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart 
                      data={generateTrainingData(activeModel)} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                        labelFormatter={(value) => `Epoch ${value}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="loss" name="Loss" stroke="#ff0000" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="precision" name="Precision" stroke="#82ca9d" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="recall" name="Recall" stroke="#ffc658" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="f1_score" name="F1 Score" stroke="#0088fe" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!activeModel && (
              <div className="no-active-model-message">
                <p>No active model selected. Activate a model to see its performance metrics.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}