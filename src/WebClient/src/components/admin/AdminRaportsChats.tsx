import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RoutePaths } from '../../routes/RoutePaths';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import TimeService from '../../services/time/TimeService';
import '../../App.css';
import '../../styles/admin/AdminRaportsChats.css';

const AdminRaportsChats = () => {
    const navigate = useNavigate();
    const [chatCount, setChatCount] = useState<number>(0);
    const [messageSendData, setMessageSendData] = useState<{ date: string, count: number }[]>([]);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    useEffect(() => {
        const fetchChatData = async () => {
            try {
                const _chatCount = await ChatService.getChatCount();
                const _messages = await MessageService.getAllMessages();

                if (_messages.length > 0) {
                    const firstUserDate = new Date(Math.min(..._messages.map(message => new Date(message.timestamp).getTime()))).toISOString().split('T')[0];
                    const todayDate = new Date().toISOString().split('T')[0];

                    const dateRange = TimeService.generateDateRange(firstUserDate, todayDate);

                    const creationCounts: { [key: string]: number } = {};
                    _messages.forEach(message => {
                        const creationDate = new Date(message.timestamp).toISOString().split('T')[0];
                        creationCounts[creationDate] = (creationCounts[creationDate] || 0) + 1;
                    });

                    const formattedData = dateRange.map(date => ({
                        date,
                        count: creationCounts[date] || 0,
                    }));

                    setMessageSendData(formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                    setChatCount(_chatCount);
                }
            }
            catch (error) {
                console.error('Failed to fetch chat data:', error);
                toast.error('Failed to load chat data.');
            }
        };

        fetchChatData();
    }, []);

    const changeMonth = (direction: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };

    const messageSendFilteredData = messageSendData.filter(item => item.date.startsWith(TimeService.formatDateToMonth(currentMonth)));

    const exportDataToCSV = async () => {
        await ChatService.exportChatsToCsv();
    };

    return (
        <div className="AdminRaportsChats">
            <h1><i className="bi bi-chat-text-fill"></i> Chats - Raports & Stats</h1>
            <p></p>
            <h3>Chat rooms count: <strong>{chatCount}</strong></h3>
            <p></p>
            <Button variant="primary" className="button-spacing" onClick={() => navigate(RoutePaths.adminChats())}>
                <i className="bi bi-info-circle"></i> Show Chats
            </Button>
            <Button variant="success" onClick={exportDataToCSV}>
                <i className="bi bi-download"></i> Export to CSV
            </Button>
            <p></p>

            {/* Histogram */}
            <h5>Message send dates for {TimeService.formatDateToMonth(currentMonth)}</h5>
            <div className="histogram-container">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={messageSendFilteredData}>
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

export default AdminRaportsChats;