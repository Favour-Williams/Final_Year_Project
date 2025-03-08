import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/admin-dashboard.css'; // You'll need to create this CSS file

function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get the admin ID from localStorage or sessionStorage
    // Alternatively, you can pass it via state when navigating from login
    const fetchAdminData = async () => {
      try {
        // Assuming you stored the user ID after login
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        
        if (!userId) {
          setError('Not authenticated. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        const response = await axios.get(`http://127.0.0.1:5000/users/${userId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        setAdminData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setError('Failed to load admin information');
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [navigate]);

  // Functions to handle button clicks (same as your LandingPage)
  const handleCreateUser = () => {
    navigate('/admin/createUser');
  };
  
  const handleViewDoctor = () => {
    navigate('/admin/view');
  };
  
  const handleTrainModel = () => {
    navigate('/admin/train');
  };
  
  const handleExtract = () => {
    navigate('/admin/extract');
  };

  const handleLogout = () => {
    // Clear stored credentials
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    // Navigate to login page
    navigate('/login');
  };

  if (loading) return <div className="loading">Loading admin data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <div className="logo">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>

      <div className="admin-container">
        <div className="admin-profile">
          <h2>Admin Profile</h2>
          {adminData && (
            <div className="profile-details">
              <p><strong>Name:</strong> {adminData.first_name} {adminData.last_name} {adminData.other_name || ''}</p>
              <p><strong>Username:</strong> {adminData.user_name}</p>
              <p><strong>Email:</strong> {adminData.email}</p>
              <p><strong>Phone:</strong> {adminData.phone_number}</p>
            </div>
          )}
        </div>

        <div className="admin-actions">
          <h2>Admin Actions</h2>
          <div className="action-buttons">
            <button onClick={handleCreateUser}>Create Doctor</button>
            <button onClick={handleViewDoctor}>View Doctors</button>
            <button onClick={handleTrainModel}>Train Model</button>
            <button onClick={handleExtract}>Corrected Images</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;