import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/Inputs";
import Button from "../components/Button";
import axios from "axios";
import '../styles/createuser.css'
function SignUpPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        otherName: "",
        userName: "",
        phoneNumber: "",
        email: "",
    });

    const [errors, setErrors] = useState({});

    // Generate username when lastName changes (first 4 letters + random numbers)
    useEffect(() => {
        if (formData.lastName) {
            // Get first 4 letters of last name (or fewer if last name is shorter)
            const lastNamePrefix = formData.lastName.substring(0, 4).toLowerCase();
            
            // Generate 4 random numbers
            const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures 4 digits
            
            const generatedUserName = `${lastNamePrefix}${randomNumbers}`;
            setFormData((prev) => ({ ...prev, userName: generatedUserName }));
        }
    }, [formData.lastName]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const validateForm = () => {
        let formErrors = {};
        let isValid = true;

        if (!formData.firstName) {
            formErrors.firstName = "First name is required";
            isValid = false;
        }
        if (!formData.lastName) {
            formErrors.lastName = "Last name is required";
            isValid = false;
        }
        if (!formData.userName) {
            formErrors.userName = "User name is required";
            isValid = false;
        }
        if (!formData.phoneNumber || isNaN(formData.phoneNumber)) {
            formErrors.phoneNumber = "A valid phone number is required";
            isValid = false;
        }
        if (!formData.email) {
            formErrors.email = "Email is required";
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            formErrors.email = "Invalid email format";
            isValid = false;
        }

        setErrors(formErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            try {
                const response = await axios.post(
                    "http://127.0.0.1:5000/admin/create-user",
                    { ...formData }, // Send only the required fields
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                console.log("User creation successful", response.data);
                alert("User created successfully");

                // Reset form after successful submission
                setFormData({
                    firstName: "",
                    lastName: "",
                    otherName: "",
                    userName: "",
                    phoneNumber: "",
                    email: "",
                });
            } catch (error) {
                console.error("Error creating user:", error);
                alert(error.response?.data?.error || "An error occurred while creating the user.");
            }
        } else {
            console.log("Form validation failed", errors);
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

            <div 
                className="back-arrow" 
                onClick={() => navigate(-1)} 
                title="Go back to previous page"
                ></div>
            <div className="max-w-2xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Create New User</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        text="First Name"
                        placehold="Enter First Name"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

                    <Input
                        text="Last Name"
                        placehold="Enter Last Name"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

                    <Input
                        text="Other Names"
                        placehold="Enter Other Name"
                        type="text"
                        name="otherName"
                        value={formData.otherName}
                        onChange={handleChange}
                    />

                    <Input
                        text="User Name (Auto-Generated)"
                        placehold="User Name"
                        type="text"
                        name="userName"
                        value={formData.userName}
                        onChange={handleChange}
                        disabled // User cannot modify
                    />
                    {errors.userName && <p className="text-red-500 text-sm">{errors.userName}</p>}

                    <Input
                        text="Phone Number"
                        placehold="Enter number"
                        type="number"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                    />
                    {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber}</p>}

                    <Input
                        text="Email"
                        placehold="Enter Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                    
                    <Button text="Create User" type="submit" />
                </form>
            </div>
        </>
    );
}

export default SignUpPage;