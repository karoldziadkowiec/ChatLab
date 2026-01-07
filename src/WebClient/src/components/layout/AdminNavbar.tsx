import React from 'react';
import { NavLink } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import '../../App.css';
import '../../styles/layout/AdminNavbar.css';

const AdminNavbarComponent = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="sticky-top">
      <Container>
        <img src={require('../../img/logo.png')} alt="logo" className="logo" />
        <Navbar.Brand as={NavLink} to={RoutePaths.adminDashboard()}>ChatLab</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto blue-links2">
            <Nav.Link as={NavLink} to={RoutePaths.adminDashboard()}><i className="bi bi-grid"></i> Dashboard</Nav.Link>
            <Nav.Link as={NavLink} to={RoutePaths.adminUsers()}><i className="bi bi-people-fill"></i> Users</Nav.Link>
            <Nav.Link as={NavLink} to={RoutePaths.adminChats()}><i className="bi bi-chat-text-fill"></i> Chats</Nav.Link>
            <NavDropdown title={<><i className="bi bi-graph-up-arrow"></i> Raports & Stats</>} id="basic-nav-dropdown">
              <NavDropdown.Item as={NavLink} to={RoutePaths.adminRaportsUsers()}><i className="bi bi-people-fill"></i> Users</NavDropdown.Item>
              <NavDropdown.Item as={NavLink} to={RoutePaths.adminRaportsChats()}><i className="bi bi-chat-text-fill"></i> Chats</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title={<><i className="bi bi-gear-fill"></i> Service</>} id="basic-nav-dropdown">
              <NavDropdown.Item as={NavLink} to={RoutePaths.adminSupport()}><i className="bi bi-cone-striped"></i> Reported Problems</NavDropdown.Item>
              <NavDropdown.Item as={NavLink} to={RoutePaths.adminCommunicationTechnologies()}><i className="bi bi-tools"></i> Communication Technologies</NavDropdown.Item>
              <NavDropdown.Item as={NavLink} to={RoutePaths.adminMakeAnAdmin()}><i className="bi bi-universal-access-circle"></i> Make an Admin</NavDropdown.Item>
            </NavDropdown>
          </Nav>
          <Nav className="ms-auto blue-links2">
            <Nav.Link as={NavLink} to={RoutePaths.chats()}><i className="bi bi-chat-fill"></i>My Chats</Nav.Link>
            <NavDropdown title={<><i className="bi bi-person-circle"></i> My Profile</>} id="basic-nav-dropdown">
              <NavDropdown.Item as={NavLink} to={RoutePaths.myProfile()}><i className="bi bi-person-fill"></i> Profile</NavDropdown.Item>
              <NavDropdown.Item as={NavLink} to={RoutePaths.support()}><i className="bi bi-wrench-adjustable"></i> Support</NavDropdown.Item>
              <NavDropdown.Item onClick={AccountService.logout} as={NavLink} to={RoutePaths.login()}><i className="bi bi-box-arrow-left"></i> Log out</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AdminNavbarComponent;