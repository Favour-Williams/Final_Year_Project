import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ViewDoctors.css';
import { useNavigate } from "react-router-dom";

export default function ViewDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [doctorToUpdate, setDoctorToUpdate] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({
    firstName: '',
    lastName: '',
    otherName: '',
    userName: '',
    phoneNumber: '',
    email: '',
    password: ''
  });
  const [updateError, setUpdateError] = useState(null);

  // Fetch all doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Filter doctors when searchTerm or doctors change
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDoctors(doctors);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = doctors.filter(
        doctor => 
          doctor.userName.toLowerCase().includes(term) ||
          doctor.firstName.toLowerCase().includes(term) ||
          doctor.lastName.toLowerCase().includes(term)
      );
      setFilteredDoctors(filtered);
    }
  }, [searchTerm, doctors]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/doctors');
      setDoctors(response.data);
      setFilteredDoctors(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch doctors: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDeleteClick = (doctor) => {
    setDoctorToDelete(doctor);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!doctorToDelete) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/users/${doctorToDelete.id}`);
      // Remove the deleted doctor from the state
      const updatedDoctors = doctors.filter(doc => doc.id !== doctorToDelete.id);
      setDoctors(updatedDoctors);
      // Show success message
      alert(`Dr. ${doctorToDelete.firstName} ${doctorToDelete.lastName} has been deleted successfully.`);
    } catch (err) {
      setError('Failed to delete doctor: ' + (err.response?.data?.error || err.message));
      console.error('Error deleting doctor:', err);
    } finally {
      // Close confirmation dialog and reset doctorToDelete
      setShowDeleteConfirmation(false);
      setDoctorToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setDoctorToDelete(null);
  };

  const handleUpdateClick = (doctor) => {
    setDoctorToUpdate(doctor);
    setUpdateFormData({
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      otherName: doctor.otherName || '',
      userName: doctor.userName,
      phoneNumber: doctor.phoneNumber,
      email: doctor.email,
      password: '' // Password field starts empty for security reasons
    });
    setShowUpdateForm(true);
    setUpdateError(null);
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData({
      ...updateFormData,
      [name]: value
    });
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (!doctorToUpdate) return;
    
    try {
      setUpdateError(null);
      const response = await axios.put(
        `http://localhost:5000/api/users/${doctorToUpdate.id}`, 
        updateFormData
      );
      
      // Update the doctors list with the updated doctor
      const updatedDoctors = doctors.map(doc => 
        doc.id === doctorToUpdate.id ? response.data.user : doc
      );
      setDoctors(updatedDoctors);
      
      // Close the form and reset
      setShowUpdateForm(false);
      setDoctorToUpdate(null);
      
      // Show success message
      alert(`Dr. ${response.data.user.firstName} ${response.data.user.lastName} has been updated successfully.`);
    } catch (err) {
      setUpdateError(err.response?.data?.error || err.message);
      console.error('Error updating doctor:', err);
    }
  };

  const cancelUpdate = () => {
    setShowUpdateForm(false);
    setDoctorToUpdate(null);
    setUpdateError(null);
  };

  if (loading) {
    return <div className="loading">Loading doctors...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      <header className="dashboard-header">
        <div className="logo">
        <div className="footer-logo-icon">
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
      <div 
          className="back-arrow" 
          onClick={() => navigate(-1)} 
          title="Go back to previous page"
      ></div>

      <div className="doctors-container">
        <h1 className="doctors-title text-2xl font-bold mb-6">View Doctors</h1>
        
        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={clearSearch}>
                ×
              </button>
            )}
          </div>
          <div className="search-info">
            {searchTerm && (
              <p>
                Found {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'} 
                matching '{searchTerm}'
              </p>
            )}
          </div>
        </div>
        
        {filteredDoctors.length === 0 ? (
          <p className="no-doctors">
            {searchTerm 
              ? `No doctors found matching '${searchTerm}'.` 
              : 'No doctors found in the system.'}
          </p>
        ) : (
          <div className="doctors-list">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="doctor-item">
                <div className="doctor-info">
                  <h3>Dr. {doctor.firstName} {doctor.lastName}</h3>
                  <p><strong>Username:</strong> {doctor.userName}</p>
                  <p><strong>Email:</strong> {doctor.email}</p>
                  <p><strong>Phone:</strong> {doctor.phoneNumber}</p>
                </div>
                <div className="doctor-actions">
                  <button 
                    className="update-btn"
                    onClick={() => handleUpdateClick(doctor)}
                  >
                    Update
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteClick(doctor)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmation && doctorToDelete && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h2>Confirm Deletion</h2>
              <p>
                Are you sure you want to delete Dr. {doctorToDelete.firstName} {doctorToDelete.lastName}?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={cancelDelete}>
                  No, Cancel
                </button>
                <button className="confirm-btn" onClick={confirmDelete}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Form Dialog */}
        {showUpdateForm && doctorToUpdate && (
          <div className="modal-overlay">
            <div className="modal-dialog update-form-dialog">
              <h2>Update Doctor Information</h2>
              {updateError && <div className="form-error">{updateError}</div>}
              <form onSubmit={submitUpdate}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={updateFormData.firstName}
                      onChange={handleUpdateInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={updateFormData.lastName}
                      onChange={handleUpdateInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="otherName">Other Name (Optional)</label>
                  <input
                    type="text"
                    id="otherName"
                    name="otherName"
                    value={updateFormData.otherName}
                    onChange={handleUpdateInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="userName">Username</label>
                  <input
                    type="text"
                    id="userName"
                    name="userName"
                    value={updateFormData.userName}
                    onChange={handleUpdateInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={updateFormData.phoneNumber}
                    onChange={handleUpdateInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={updateFormData.email}
                    onChange={handleUpdateInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">
                    Password (Leave empty to keep current password)
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={updateFormData.password}
                    onChange={handleUpdateInputChange}
                    placeholder="Enter new password or leave empty"
                  />
                </div>
                
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={cancelUpdate}>
                    Cancel
                  </button>
                  <button type="submit" className="confirm-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}