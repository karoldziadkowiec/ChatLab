import React, { useEffect, useState } from 'react';
import { To, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, Row, Col, Button } from 'react-bootstrap';
import CurrentTimeDisplay from '../../services/time/CurrentTimeDisplay';
import { RoutePaths } from '../../routes/RoutePaths';
import UserService from '../../services/api/UserService';
import ChatService from '../../services/api/ChatService';
import ProblemService from '../../services/api/ProblemService';
import '../../App.css';
import '../../styles/admin/AdminDashboard.css';

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [userCount, setUserCount] = useState<number>(0);
    const [chatCount, setChatCount] = useState<number>(0);
    const [unsolvedReportedProblemCount, setUnsolvedReportedProblemCount] = useState<number>(0);

    useEffect(() => {
        if (location.state && location.state.toastMessage) {
            toast.success(location.state.toastMessage);
        }

        const fetchCountData = async () => {
            try {
                const _userCount = await UserService.getUserCount();
                setUserCount(_userCount);

                const _chatCount = await ChatService.getChatCount();
                setChatCount(_chatCount);

                const _unsolvedReportedProblemCount = await ProblemService.getUnsolvedProblemCount();
                setUnsolvedReportedProblemCount(_unsolvedReportedProblemCount);
            }
            catch (error) {
                console.error('Failed to fetch count data:', error);
            }
        };

        fetchCountData();
    }, [location]);

    const refreshData = async () => {
        const _userCount = await UserService.getUserCount();
        setUserCount(_userCount);

        const _chatCount = await ChatService.getChatCount();
        setChatCount(_chatCount);

        const _unsolvedReportedProblemCount = await ProblemService.getUnsolvedProblemCount();
        setUnsolvedReportedProblemCount(_unsolvedReportedProblemCount);
    };

    const handleCardClick = (route: To) => {
        navigate(route);
    };

    return (
        <div className="AdminDashboard">
            <h1><i className="bi bi-grid"></i> Dashboard</h1>
            <p></p>
            <CurrentTimeDisplay/>
            <p></p>
            <Button variant="dark" onClick={refreshData}>
                <i className="bi bi-arrow-repeat"></i> Refresh
            </Button>
            <p></p>
            <Row>
                <Col md={6} className="mb-4">
                    <Card bg="primary" text="white" onClick={() => handleCardClick(RoutePaths.adminUsers())} className="clickable-card">
                        <Card.Body>
                            <Card.Title><i className="bi bi-people-fill"></i></Card.Title>
                            <Card.Title>Users</Card.Title>
                            <Card.Text>
                                <h4>{userCount}</h4>
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} className="mb-4">
                    <Card bg="danger" text="white" onClick={() => handleCardClick(RoutePaths.adminSupport())} className="clickable-card">
                        <Card.Body>
                            <Card.Title><i className="bi bi-cone-striped"></i></Card.Title>
                            <Card.Title>Reported Problems</Card.Title>
                            <Card.Text>
                                <h4>{unsolvedReportedProblemCount}</h4>
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={12} className="mb-4">
                    <Card bg="info" text="white" onClick={() => handleCardClick(RoutePaths.adminChats())} className="clickable-card">
                        <Card.Body>
                            <Card.Title><i className="bi bi-chat-text-fill"></i></Card.Title>
                            <Card.Title>Chats</Card.Title>
                            <Card.Text>
                                <h4>{chatCount}</h4>
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default AdminDashboard;