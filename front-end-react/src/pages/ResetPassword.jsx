import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Input from '../components/Inputs';
import Button from '../components/Button';
import axios from 'axios';
// import './ResetPassword.css';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/verify-reset-token/${token}`);
        setTokenValid(response.data.valid);
      } catch (err) {
        console.error('Error verifying token:', err);
        setTokenValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setTokenValid(false);
      setIsLoading(false);
    }
  }, [token]);

  // Check password strength as user types
  useEffect(() => {
    const password = formData.newPassword;
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    });
  }, [formData.newPassword]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    let formErrors = {};
    let isValid = true;

    // Password validation
    if (!formData.newPassword) {
      formErrors.newPassword = 'New password is required';
      isValid = false;
    } else {
      // Check password requirements
      const { length, uppercase, lowercase, number, special } = passwordStrength;
      
      if (!length) {
        formErrors.newPassword = 'Password must be at least 8 characters';
        isValid = false;
      } else if (!uppercase) {
        formErrors.newPassword = 'Password must contain at least one uppercase letter';
        isValid = false;
      } else if (!lowercase) {
        formErrors.newPassword = 'Password must contain at least one lowercase letter';
        isValid = false;
      } else if (!number) {
        formErrors.newPassword = 'Password must contain at least one number';
        isValid = false;
      } else if (!special) {
        formErrors.newPassword = 'Password must contain at least one special character';
        isValid = false;
      }
    }

    if (!formData.confirmPassword) {
      formErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      formErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        await axios.post('http://127.0.0.1:5000/api/reset-password', {
          token,
          newPassword: formData.newPassword
        });
        
        setResetSuccess(true);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (err) {
        console.error('Error resetting password:', err);
        setErrors({ 
          form: err.response?.data?.error || 'An error occurred. Please try again.' 
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Function to render password strength indicators
  const renderPasswordStrengthIndicators = () => {
    const { length, uppercase, lowercase, number, special } = passwordStrength;
    
    return (
      <div className="password-requirements">
        <p>Password must have:</p>
        <ul>
          <li className={length ? "requirement-met" : "requirement"}>
            At least 8 characters
          </li>
          <li className={uppercase ? "requirement-met" : "requirement"}>
            At least 1 uppercase letter
          </li>
          <li className={lowercase ? "requirement-met" : "requirement"}>
            At least 1 lowercase letter
          </li>
          <li className={number ? "requirement-met" : "requirement"}>
            At least 1 number
          </li>
          <li className={special ? "requirement-met" : "requirement"}>
            At least 1 special character
          </li>
        </ul>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="reset-password-container">
        <div className="loading-message">
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="invalid-token-message">
          <h1>Invalid or Expired Link</h1>
          <p>This password reset link is invalid or has expired.</p>
          <p>Please request a new password reset link.</p>
          <Link to="/forgot-password" className="request-new-link">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="reset-password-container">
        <div className="success-message">
          <div className="check-icon">✓</div>
          <h1>Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>You will be redirected to the login page in a few seconds.</p>
          <Link to="/" className="back-to-login">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <h1>Reset Your Password</h1>
      
      <form onSubmit={handleSubmit} className="reset-password-form">
        {errors.form && <div className="form-error">{errors.form}</div>}
        
        <div className="form-group">
          <Input 
            text="New Password" 
            placehold="Enter new password" 
            type="password" 
            name="newPassword" 
            value={formData.newPassword} 
            onChange={handleChange} 
          />
          {errors.newPassword && <p className="error-message">{errors.newPassword}</p>}
          {formData.newPassword && renderPasswordStrengthIndicators()}
        </div>
        
        <div className="form-group">
          <Input 
            text="Confirm Password" 
            placehold="Confirm new password" 
            type="password" 
            name="confirmPassword" 
            value={formData.confirmPassword} 
            onChange={handleChange} 
          />
          {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
        </div>
        
        <Button 
          text={isSubmitting ? "Resetting..." : "Reset Password"} 
          type="submit" 
          disabled={isSubmitting} 
        />
      </form>
    </div>
  );
}

export default ResetPassword;