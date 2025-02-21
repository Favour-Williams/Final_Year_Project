import React, { useState } from 'react';
import Input from '../components/Inputs';
import Button from '../components/Button';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import for navigation

function LogInPage() {
  const [formData, setFormData] = useState({
    userName: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate(); // Hook for navigation

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
      <h1>Log In Page</h1>
      <form onSubmit={handleSubmit}>
        <Input text={"User Name"} placehold={"Enter User Name"} type={"text"} name={"userName"} value={formData.userName} onChange={handleChange} />
        {errors.userName && <p style={{ color: 'red' }}>{errors.userName}</p>}
        
        <Input text={"Password"} placehold={"Enter password"} type={"password"} name={"password"} value={formData.password} onChange={handleChange} />
        {errors.password && <p style={{ color: 'red' }}>{errors.password}</p>}
        
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        
        <p><a href="#">Forgot password</a></p>
        <Button text={"Log In"} type={"submit"} />
      </form>
    </div>
  );
}

export default LogInPage;
