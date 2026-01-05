import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '../../routes/RoutePaths';
import { Element } from 'react-scroll';
import { Button, Container, Row, Col } from 'react-bootstrap';
import '../../App.css';
import '../../styles/home/Home.css';

const Home = () => {
    const navigate = useNavigate();

    const moveToChats = () => {
        navigate(RoutePaths.chats());
    };

    return (
        <div className="Home">
            <Element name="home" className="startSection">
                <div className="Home-logo-container">
                    <img src={require('../../img/logo.png')} alt="Home-logo" className="Home-logo" /> 
                    ChatLab
                </div>
                <h2>YOUR WEB APP FOR COMMUNICATING WITH PEOPLE</h2>
                <h4>Integrate with others by making new contacts!</h4>
            </Element>
            <Element name="forPlayers" className="blackSection">
                <h1><i className="bi bi-chat-fill"></i> Chats</h1>
                <h5>Choose the specific Real-Time technology that best suits your preferences and enjoy your conversations.</h5>
                <p></p>
                <Container className="links">
                    <Row>
                        <Col><Button variant="info" onClick={moveToChats}>My Chats</Button></Col>
                    </Row>
                </Container>
            </Element>
        </div>
    );
}

export default Home;