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
    navigate('/doctorDashboard/predict', { 
      state: { 
        doctorId: doctorInfo?.id,
        doctorName: doctorInfo?.user_name 
      } 
    });
  };

  const handleSortFile = () => {
    navigate('/doctorDashboard/sort', { 
      state: { 
        doctorId: doctorInfo?.id,
        doctorName: doctorInfo?.user_name 
      } 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo">
        <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </button>
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
      </div>

      
      <div className="doctor-info-card">
        <h2>Doctor Information</h2>
        <div className="doctor-info-content">
          <div className="info-item">
            <div className="info-row">
              <svg xmlns="http://www.w3.org/2000/svg" className="info-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <strong className="info-label">Full Name:</strong>
              <span className="info-value">{doctorInfo?.first_name} {doctorInfo?.last_name} {doctorInfo?.other_name || ''}</span>
            </div>
          </div>
          <div className="info-item">
            <div className="info-row">
              <svg xmlns="http://www.w3.org/2000/svg" className="info-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <strong className="info-label">Username:</strong>
              <span className="info-value">{doctorInfo?.user_name}</span>
            </div>
          </div>
          <div className="info-item">
            <div className="info-row">
              <svg xmlns="http://www.w3.org/2000/svg" className="info-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <strong className="info-label">Email:</strong>
              <span className="info-value">{doctorInfo?.email}</span>
            </div>
          </div>
          <div className="info-item">
            <div className="info-row">
              <svg xmlns="http://www.w3.org/2000/svg" className="info-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <strong className="info-label">Phone:</strong>
              <span className="info-value">{doctorInfo?.phone_number}</span>
            </div>
          </div>
          <div className="info-item">
            <div className="info-row">
              <svg xmlns="http://www.w3.org/2000/svg" className="info-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <strong className="info-label">ID:</strong>
              <span className="info-value">{doctorInfo?.id}</span>
            </div>
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
    </div>
  );
}

export default DoctorDashboard;