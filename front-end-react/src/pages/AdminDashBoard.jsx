import React from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate hook

function LandingPage() {
  const navigate = useNavigate();  // Initialize navigate hook

  // Functions to handle button clicks
  const handleCreateUser = () => {
    navigate('/createUser');  // Navigate to login page
  };



  return (
    <div>
        <h1>Welcome to Our Website</h1>
        <div>
          <button onClick={handleCreateUser}>Create doctor</button>  
        </div>
    </div>
  );
}

export default LandingPage;