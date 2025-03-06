import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/Inputs";
import Button from "../components/Button";
import axios from "axios";

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

    // Automatically generate username when firstName or lastName changes
    useEffect(() => {
        if (formData.firstName && formData.lastName) {
            let generatedUserName = `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`;
            setFormData((prev) => ({ ...prev, userName: generatedUserName }));
        }
    }, [formData.firstName, formData.lastName]);

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

                {/* Remove password fields since they are auto-set */}
                
                <Button text="Create User" type="submit" />
            </form>
        </div>
    );
}

export default SignUpPage;
