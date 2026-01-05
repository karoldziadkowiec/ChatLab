import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RoutePaths } from '../../routes/RoutePaths';
import UserService from '../../services/api/UserService';
import TimeService from '../../services/time/TimeService';
import '../../App.css';
import '../../styles/admin/AdminRaportsUsers.css';

const AdminRaportsUsers = () => {
    const navigate = useNavigate();
    const [userCount, setUserCount] = useState<number>(0);
    const [userCreationData, setUserCreationData] = useState<{ date: string, count: number }[]>([]);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const _users = await UserService.getUsers();

                if (_users.length > 0) {
                    const firstUserDate = new Date(Math.min(..._users.map(user => new Date(user.creationDate).getTime()))).toISOString().split('T')[0];
                    const todayDate = new Date().toISOString().split('T')[0];

                    const dateRange = TimeService.generateDateRange(firstUserDate, todayDate);

                    const creationCounts: { [key: string]: number } = {};
                    _users.forEach(user => {
                        const creationDate = new Date(user.creationDate).toISOString().split('T')[0];
                        creationCounts[creationDate] = (creationCounts[creationDate] || 0) + 1;
                    });

                    const formattedData = dateRange.map(date => ({
                        date,
                        count: creationCounts[date] || 0,
                    }));

                    setUserCreationData(formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                    setUserCount(_users.length);
                }
            }
            catch (error) {
                console.error('Failed to fetch user data:', error);
                toast.error('Failed to load user data.');
            }
        };

        fetchUserData();
    }, []);

    const changeMonth = (direction: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };

    const usersFilteredData = userCreationData.filter(item => item.date.startsWith(TimeService.formatDateToMonth(currentMonth)));

    const exportDataToCSV = async () => {
        await UserService.exportUsersToCsv();
    };

    return (
        <div className="AdminRaportsUsers">
            <h1><i className="bi bi-people-fill"></i> Users - Raports & Stats</h1>
            <p></p>
            <h3>Users count: <strong>{userCount}</strong></h3>
            <p></p>
            <Button variant="primary" className="button-spacing" onClick={() => navigate(RoutePaths.adminUsers())}>
                <i className="bi bi-info-circle"></i> Show Users
            </Button>
            <Button variant="success" onClick={exportDataToCSV}>
                <i className="bi bi-download"></i> Export to CSV
            </Button>
            <p></p>

            {/* Histogram */}
            <h5>Creation dates for {TimeService.formatDateToMonth(currentMonth)}</h5>
            <div className="histogram-container">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={usersFilteredData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
                <Button variant="dark" className="button-spacing" onClick={() => changeMonth(-1)}>
                    <i className="bi bi-arrow-left"></i>
                </Button>
                <Button variant="dark" onClick={() => changeMonth(1)}>
                    <i className="bi bi-arrow-right"></i>
                </Button>
            </div>
        </div>
    );
};

export default AdminRaportsUsers;