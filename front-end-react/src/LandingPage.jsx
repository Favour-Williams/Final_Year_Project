import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sampleImage  from './images/download.png';
import sampleImage2  from './images/3.jpg';
import sampleImage3  from './images/1.jpg';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  useEffect(() => {
    // Trigger the image animation after page loads
    setTimeout(() => {
      setImagesLoaded(true);
    }, 300);
  }, []);

  const handleLogIn = () => {
    navigate('/login');
  };

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="nav">
        <div className="logo">
        <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
        <button 
          onClick={handleLogIn}
          className="btn btn-primary"
        >
          Log In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Advanced Bone Fracture Detection with <span>Deep Learning</span>
              </h1>
              <p className="hero-description">
                Our AI-powered platform provides rapid, accurate detection and analysis of bone fractures from X-ray images, helping healthcare professionals make faster and more informed decisions.
              </p>
              <div className="hero-cta">
                
                <button 
                  className="btn btn-secondary btn-large"
                  onClick={() => navigate('/learn-more')}
                >
                  Learn More
                </button>
              </div>
            </div>
            
            {/* Image Showcase */}
            <div className="image-showcase">
              <div className={`image-gallery ${imagesLoaded ? 'loaded' : ''}`}>
                {/* Main X-ray image */}
                <div className="image-main">
                  <img 
                    src={sampleImage2} 
                    alt="X-ray with bone detection" 
                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                  />
                  <div className="image-overlay"></div>
                
                </div>
                
                {/* Secondary images in a column */}
                <div className="image-secondary-container">
                  <div className="image-secondary">
                    <img 
                      src={sampleImage3} 
                      alt="X-ray sample" 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <div className="image-overlay"></div>
                  </div>
                  <div className="image-secondary">
                    <img 
                      src={sampleImage} 
                      alt="X-ray sample" 
                      style={{width: '100%', height: '100%', objectFit: 'cover'}}
                    />
                    <div className="image-overlay"></div>
                  </div>
                </div>
              </div>
              
              {/* Floating stats card */}
              <div className={`stats-card ${imagesLoaded ? 'loaded' : ''}`}>
                <div className="stats-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stats-text">
                  <p>Accuracy Rate</p>
                  <p>92.7%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="features">
        <div className="container">
          <h2 className="section-title">How Our AI Detection Works</h2>
          
          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="feature-title">Image Processing</h3>
              <p className="feature-description">Our advanced algorithms enhance and normalize X-ray images for optimal analysis.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon indigo">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="feature-title">AI Detection</h3>
              <p className="feature-description">Our neural network identifies fractures and abnormalities with precision and reliability.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon purple">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="feature-title">Results Analysis</h3>
              <p className="feature-description">Receive detailed reports.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Call to action */}
      <div className="cta">
        <div className="container">
          <h2 className="cta-title">Ready to transform your diagnostic workflow?</h2>
          <p className="cta-description">Join healthcare professionals BoneDetect AI</p>
          <button 
            className="btn btn-secondary btn-large"
            onClick={() => navigate('/login')}
          >
            Get Started Today
          </button>
        </div>
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
};

export default LandingPage;