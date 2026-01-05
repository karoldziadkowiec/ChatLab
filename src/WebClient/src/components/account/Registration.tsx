import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Col, Row, Container } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import RegisterDTO from '../../models/dtos/RegisterDTO';
import '../../App.css';
import '../../styles/account/Registration.css';

const Registration: React.FC = () => {
    const navigate = useNavigate();
    const [registerDTO, setRegisterDTO] = useState<RegisterDTO>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        location: ''
    });

    useEffect(() => {
        // Clearing AuthToken when the Registration component is rendered
        const clearAuthToken = async () => {
            await AccountService.logout();
        };
        clearAuthToken();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRegisterDTO(prevRegisterDTO => ({
            ...prevRegisterDTO,
            [name]: value,
        }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            await AccountService.registerUser(registerDTO);
            toast.success('Your account has been successfully registered!');
            navigate(RoutePaths.login());
        } 
        catch (error) {
            toast.error('Registration failed. Please try again.');
        }
    };

    const validateForm = () => {
        const { email, password, confirmPassword, firstName, lastName, phoneNumber, location } = registerDTO;

        // Checking empty fields
        if (!email || !password || !confirmPassword || !firstName || !lastName || !phoneNumber || !location)
            return 'All fields are required.';

        // E-mail validation
        const emailError = emailValidator(email);
        if (emailError)
            return emailError;

        // Password validation
        const passwordError = passwordValidator(password);
        if (passwordError)
            return passwordError;

        // Passwords matcher
        if (password !== confirmPassword)
            return 'Passwords do not match.';

        // Checking phone number type
        if (isNaN(Number(phoneNumber)))
            return 'Phone number must be a number.';

        // Checking phone number length
        if (phoneNumber.length !== 9)
            return 'Phone number must contain exactly 9 digits.';

        return null;
    };

    const emailValidator = (email: string): string | null => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return 'Invalid email format. Must contain "@" and "."';

        return null;
    };

    const passwordValidator = (password: string): string | null => {
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
        if (!passwordRegex.test(password))
            return 'Password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character.';

        return null;
    };

    return (
        <div className="Registration">
            <div className="logo-container">
                <img src={require('../../img/logo.png')} alt="logo" className="logo" />
                ChatLab
            </div>
            <div className="registration-container">
                <Container>
                    <Row className="justify-content-md-center">
                        <Col md="6">
                            <h2>Sign Up</h2>
                            <Form onSubmit={handleRegister}>
                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label className="white-label">E-mail</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder="E-mail"
                                        value={registerDTO.email}
                                        onChange={handleChange}
                                        maxLength={50}
                                        required
                                    />
                                </Form.Group>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formPassword">
                                            <Form.Label className="white-label">Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="password"
                                                placeholder="Password"
                                                value={registerDTO.password}
                                                onChange={handleChange}
                                                minLength={7}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formConfirmPassword">
                                            <Form.Label className="white-label">Confirm Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="confirmPassword"
                                                placeholder="Confirm Password"
                                                value={registerDTO.confirmPassword}
                                                onChange={handleChange}
                                                minLength={7}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formFirstName">
                                            <Form.Label className="white-label">First Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                placeholder="First Name"
                                                value={registerDTO.firstName}
                                                onChange={handleChange}
                                                maxLength={20}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formLastName">
                                            <Form.Label className="white-label">Last Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                placeholder="Last Name"
                                                value={registerDTO.lastName}
                                                onChange={handleChange}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formPhoneNumber">
                                            <Form.Label className="white-label">Phone Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phoneNumber"
                                                placeholder="Phone Number"
                                                value={registerDTO.phoneNumber}
                                                onChange={handleChange}
                                                maxLength={9}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formLocation">
                                            <Form.Label className="white-label">Location</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="location"
                                                placeholder="Location"
                                                value={registerDTO.location}
                                                onChange={handleChange}
                                                maxLength={40}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button variant="info" type="submit" className="mb-3">
                                    <i className="bi bi-person-plus-fill"></i>
                                    Register account
                                </Button>
                                <Row>
                                    <Col>
                                        <Button variant="outline-light" onClick={() => navigate(RoutePaths.login())} className="mb-3">Back</Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    );
};

export default Registration;