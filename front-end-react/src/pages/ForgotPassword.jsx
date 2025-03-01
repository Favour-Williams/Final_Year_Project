import React, { useState } from 'react';
import Input from '../components/Inputs';
import Button from '../components/Button';
import axios from 'axios';
import { Link } from 'react-router-dom';
// import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      await axios.post('http://127.0.0.1:5000/api/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h1>Forgot Password</h1>
      
      {isSubmitted ? (
        <div className="success-message">
          <div className="check-icon">✓</div>
          <h2>Email Sent</h2>
          <p>
            If an account exists with the email address <strong>{email}</strong>,
            you will receive a password reset link shortly.
          </p>
          <p>
            Please check your email and follow the instructions to reset your password.
            The link will expire in 24 hours.
          </p>
          <div className="navigation-links">
            <Link to="/" className="back-to-login">Back to Login</Link>
          </div>
        </div>
      ) : (
        <div className="form-container">
          <p className="instruction-text">
            Enter your email address below and we'll send you a link to reset your password.
          </p>
          
          <form onSubmit={handleSubmit}>
            <Input 
              text="Email Address" 
              placehold="Enter your email" 
              type="email" 
              name="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            
            {error && <p className="error-message">{error}</p>}
            
            <Button 
              text={isSubmitting ? "Sending..." : "Send Reset Link"} 
              type="submit" 
              disabled={isSubmitting} 
            />
          </form>
          
          <div className="navigation-links">
            <Link to="/" className="back-to-login">Back to Login</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;