import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { NavLink } from 'react-router-dom';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import CurrentTimeDisplay from '../../services/time/CurrentTimeDisplay';
import '../../App.css';
import '../../styles/layout/Navbar.css';

const NavbarComponent = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="sticky-top">
      <Container>
        <img src={require('../../img/logo.png')} alt="logo" className="logo" />
        <Navbar.Brand as={NavLink} to={RoutePaths.home()}>ChatLab</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto blue-links">
            <Nav.Link as={NavLink} to={RoutePaths.home()}><i className="bi bi-house-fill"></i> Home</Nav.Link>
            <Nav.Link as={NavLink} to={RoutePaths.community()}><i className="bi bi-people"></i> Community</Nav.Link>
          </Nav>
          <Nav className="ms-auto blue-links">
            <Nav.Link as={NavLink} to={RoutePaths.chats()}><i className="bi bi-chat-fill"></i> My Chats </Nav.Link>
            <Nav.Link as={NavLink} to={RoutePaths.myFriends()}><i className="bi bi-people-fill"></i> My Friends </Nav.Link>
            <NavDropdown title={<><i className="bi bi-person-circle"></i> Account</>} id="basic-nav-dropdown" className="sidebar-dropdown">              
              <NavDropdown.Item as={NavLink} to={RoutePaths.myProfile()}><i className="bi bi-person-fill"></i> My Profile</NavDropdown.Item>
              <NavDropdown.Item as={NavLink} to={RoutePaths.support()}><i className="bi bi-wrench-adjustable"></i> Support</NavDropdown.Item>
              <NavDropdown.Item onClick={AccountService.logout} as={NavLink} to={RoutePaths.login()}><i className="bi bi-box-arrow-left"></i> Log out</NavDropdown.Item>
            </NavDropdown>
            <Navbar.Text> <CurrentTimeDisplay/> </Navbar.Text>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;