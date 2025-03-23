import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/doctor-dashboard.css';

function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we have the user ID from login state
    if (location.state && location.state.id) {
      fetchDoctorInfo(location.state.id);
    } else {
      // If no state, redirect to login
      setError('Session expired. Please log in again.');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [location.state, navigate]);

  const fetchDoctorInfo = async (userId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      setDoctorInfo(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching doctor info:', err);
      setError('Failed to load doctor information');
      setLoading(false);
    }
  };

  const handlePredictImage = () => {
    navigate('/doctorDashboard/predict');
  };

  const handleSortFile = () => {
    navigate('/doctorDashboard/sort');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        {loading ? (
          <div className="loading">Loading doctor information...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="doctor-dashboard">
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome, Dr. {doctorInfo?.first_name} {doctorInfo?.last_name}</h1>
              <p className="welcome-subtitle">Access your dashboard to manage bone detection results</p>
            </div>

            <div className="doctor-info-card">
              <h2>Doctor Information</h2>
              <div className="doctor-info-content">
                <div className="info-item">
                  <span className="info-label">Full Name:</span>
                  <span className="info-value">{doctorInfo?.first_name} {doctorInfo?.other_name ? doctorInfo.other_name + ' ' : ''}{doctorInfo?.last_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Username:</span>
                  <span className="info-value">{doctorInfo?.user_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{doctorInfo?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{doctorInfo?.phone_number}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">ID:</span>
                  <span className="info-value">{doctorInfo?.id}</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="action-button predict-btn" 
                onClick={handlePredictImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Predict Image
              </button>
              <button 
                className="action-button sort-btn" 
                onClick={handleSortFile}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Sort Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p className="footer-copyright">© 2025 BoneDetect AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default DoctorDashboard;