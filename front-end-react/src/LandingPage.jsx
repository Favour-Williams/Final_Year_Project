import React from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate hook

function LandingPage() {
  const navigate = useNavigate();  // Initialize navigate hook

  // Functions to handle button clicks
  const handleLogIn = () => {
    navigate('/login');  // Navigate to login page
  };



  return (
    <div>
        <h1>Welcome to Our Website</h1>
        <div>
          <button onClick={handleLogIn}>Log In</button>  {/* Navigate to /login */}
        </div>
    </div>
  );
}

export default LandingPage;
