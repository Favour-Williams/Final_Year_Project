import React, { useState } from 'react';
import Input from '../components/Inputs';
import Button from '../components/Button';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; 
import '../styles/login.css'

function LogInPage() {
  const [formData, setFormData] = useState({
    userName: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate(); 

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    let formErrors = {};
    let isValid = true;

    if (!formData.userName) {
      formErrors.userName = 'User name is required';
      isValid = false;
    }
    if (!formData.password) {
      formErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
        try {
            const response = await axios.post('http://127.0.0.1:5000/login', formData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Login successful', response.data);
            localStorage.setItem('userId', response.data.id);
            
            if (response.data.role === 'admin') {
                
                navigate('/admin');
            } else if (response.data.role === 'doctor') {
                
                navigate(`/doctorDashboard`, { state: response.data });
            }
        } catch (error) {
            console.error('Error logging in:', error);
            setLoginError('Invalid username or password');
        }
    } else {
        console.log('Form validation failed', errors);
    }
  };


  return (
    <div>
      <nav className="nav">
        <div className="logo">
        <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
      </nav>



      <div className="login-container">
        <h1 className="login-title">Log In to Your Account</h1>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
          <label className="input-label" htmlFor="userName">User Name</label>
            <input 
              id="userName"
              className={`input-field ${errors.userName ? 'error' : ''}`}
              type="text"
              name="userName"
              placeholder="Enter User Name"
              value={formData.userName}
              onChange={handleChange}
            />
            {errors.userName && <p className="error-message">{errors.userName}</p>}
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input 
              id="password"
              className={`input-field ${errors.password ? 'error' : ''}`}
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          
          {loginError && <p className="error-message">{loginError}</p>}
          
          <p className="forgot-password-link">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          
          <Button 
            text={"Log In"} 
            type={"submit"} 
            classes={"btn btn-primary login-button"}
          />
        </form>
      </div>


           {/* Footer */}
           <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <div className="footer-logo">
                <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <span className="footer-logo-text">BoneDetect AI</span>
              </div>
              <p className="footer-description">Revolutionizing bone fracture detection through advanced deep learning technology.</p>
            </div>
            <div className="footer-links">
              <div className="footer-links-column">
                <h3>Product</h3>
                <div>
                  <a href="#" className="footer-link">Features</a>
                  
                </div>
              </div>
              <div className="footer-links-column">
                <h3>Company</h3>
                <div>
                  <a href="#" className="footer-link">About</a>
                  
                  <a href="#" className="footer-link">Contact</a>
                </div>
              </div>
              
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">© 2025 BoneDetect AI. All rights reserved.</p>
            <div className="footer-social">
              <a href="#" className="social-link">
                <span className="sr-only">Twitter</span>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="social-link">
                <span className="sr-only">LinkedIn</span>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LogInPage;
