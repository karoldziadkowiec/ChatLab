import React, { useEffect, useState } from 'react';
import { To, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from 'react-bootstrap';
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
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <i className="bi bi-grid"></i>
                    <div>
                        <h1>Dashboard</h1>
                        <div className="dashboard-meta">Admin overview</div>
                    </div>
                </div>
                <Button variant="dark" onClick={refreshData} className="dashboard-refresh">
                    <i className="bi bi-arrow-repeat"></i> Refresh
                </Button>
            </div>
            <div className="dashboard-time">
                <CurrentTimeDisplay/>
            </div>
            <div className="dashboard-grid">
                <div className="stat-card is-users" onClick={() => handleCardClick(RoutePaths.adminUsers())}>
                    <div className="stat-card__icon"><i className="bi bi-people-fill"></i></div>
                    <div className="stat-card__title">Users</div>
                    <div className="stat-card__count">{userCount}</div>
                </div>
                <div className="stat-card is-problems" onClick={() => handleCardClick(RoutePaths.adminSupport())}>
                    <div className="stat-card__icon"><i className="bi bi-cone-striped"></i></div>
                    <div className="stat-card__title">Reported Problems</div>
                    <div className="stat-card__count">{unsolvedReportedProblemCount}</div>
                </div>
                <div className="stat-card is-chats" onClick={() => handleCardClick(RoutePaths.adminChats())}>
                    <div className="stat-card__icon"><i className="bi bi-chat-text-fill"></i></div>
                    <div className="stat-card__title">Chats</div>
                    <div className="stat-card__count">{chatCount}</div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;