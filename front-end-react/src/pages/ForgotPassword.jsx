import React, { useState } from 'react';
import Input from '../components/Inputs';
import Button from '../components/Button';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/ForgotPassword.css';

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
              <Link to="/login" className="back-to-login">Back to Login</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ForgotPassword;