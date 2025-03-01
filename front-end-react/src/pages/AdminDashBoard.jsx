import React from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate hook

function LandingPage() {
  const navigate = useNavigate();  // Initialize navigate hook

  // Functions to handle button clicks
  const handleCreateUser = () => {
    navigate('/admin/createUser');  // Navigate to login page
  };

  const handleViewDoctor = () => {
    navigate('/admin/view');  // Navigate to login page
  };

  const handleTrainModel = () => {
    navigate('/admin/train');  // Navigate to login page
  };


  return (
    <div>
        <h1>Welcome to Our Website</h1>
        <div>
          <button onClick={handleCreateUser}>Create Doctor</button>  
          <button onClick={handleViewDoctor}>View Doctor</button>  
          <button onClick={handleTrainModel}>Train Model</button>  
          <button></button>
        </div>
    </div>
  );
}

export default LandingPage;