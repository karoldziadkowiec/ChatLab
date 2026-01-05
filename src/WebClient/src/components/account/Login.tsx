import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import axios from 'axios';
import LoginDTO from '../../models/dtos/LoginDTO';
import AccountService from '../../services/api/AccountService';
import '../../App.css';
import '../../styles/account/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Clearing AuthToken when the Login component is rendered
    const clearAuthToken = async () => {
      await AccountService.logout();
    };
    if (location.state && location.state.toastMessage)
      toast.info(location.state.toastMessage);

    clearAuthToken();
  }, [location]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const loginDTO: LoginDTO = { email, password };

    try {
      await AccountService.login(loginDTO);
      if (await AccountService.isRoleAdmin()) {
        navigate(RoutePaths.adminDashboard());
      }
      else {
        navigate(RoutePaths.home());
      }
    }
    catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 401) {
            toast.error('Invalid email or password.');
          }
          else if (error.response.status === 500) {
            toast.error('Internal server error. Please try again later.');
          }
          else {
            toast.error('Login failed. Please check your credentials and try again.');
          }
        }
        else if (error.request) {
          toast.error('No response from server. Please check your network connection.');
        }
        else {
          toast.error('Login request failed. Please try again.');
        }
      }
      else {
        toast.error('An unexpected error occurred during login. Please try again.');
      }
    }
  };

  const moveToRegistrationPage = () => {
    navigate(RoutePaths.registration());
  };

  return (
    <div className="Login">
      <div className="logo-container">
        <img src={require('../../img/logo.png')} alt="logo" className="logo" />
        ChatLab
      </div>
      <div className="login-container">
        <Form onSubmit={handleLogin}>
          <h2>Sign in</h2>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label className="white-label">E-mail</Form.Label>
            <Form.Control
              name="email"
              type="email"
              placeholder="Enter e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={50}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="formBasicPassword">
            <Form.Label className="white-label">Password</Form.Label>
            <Form.Control
              name="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={30}
              required
            />
          </Form.Group>
          <div className="d-grid">
            <Button variant="info" type="submit">
              <i className="bi bi-box-arrow-in-right"></i>
              Log in
            </Button>
            <p></p>
            <Button variant="outline-light" onClick={moveToRegistrationPage}>
              <i className="bi bi-person-plus-fill"></i>
              Register account
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Login;