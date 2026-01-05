import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import UserService from '../../services/api/UserService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import ChatModel from '../../models/interfaces/Chat';
import '../../App.css';
import '../../styles/chat/Chats.css';

const Chats = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [userChats, setUserChats] = useState<ChatModel[]>([]);
    const [lastMessageDates, setLastMessageDates] = useState<Map<number, string>>(new Map());
    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState<boolean>(false);
    const [deleteChatRoomId, setDeleteChatRoomId] = useState<number | null>(null);

    useEffect(() => {
        if (location.state && location.state.toastMessage) {
            toast.success(location.state.toastMessage);
        }

        const fetchUserChats = async () => {
            try {
                const _userId = await AccountService.getId();
                setUserId(_userId);

                if (_userId) {
                    const _userChats = await UserService.getUserChats(_userId);
                    setUserChats(_userChats);

                    await fetchLastMessageDates(_userId, _userChats);
                }
            }
            catch (error) {
                console.error('Failed to fetch user\'s chats:', error);
                toast.error('Failed to load user\'s chats.');
            }
        };

        fetchUserChats();
    }, [location]);

    const fetchLastMessageDates = async (userId: string, chats: ChatModel[]) => {
        const dates = new Map<number, string>();
        for (const chat of chats) {
            try {
                const date = await MessageService.getLastMessageDateForChat(chat.id);
                dates.set(chat.id, date === '0001-01-01T00:00:00' ? '-' : date);
            }
            catch (error) {
                console.error(`Failed to fetch last message date for chat ${chat.id}:`, error);
            }
        }
        setLastMessageDates(dates);
    };

    const moveToSpecificChatPage = (chatId: number) => {
        navigate(RoutePaths.chatSignalR(chatId), { state: { chatId } });
    };

    const moveToSpecificChatWSPage = (chatId: number) => {
        navigate(RoutePaths.chatWS(chatId), { state: { chatId } });
    };

    const moveToSpecificChatPollingPage = (chatId: number) => {
        navigate(RoutePaths.chatPolling(chatId), { state: { chatId } });
    };

    const moveToSpecificChatSSEPage = (chatId: number) => {
        navigate(RoutePaths.chatSSE(chatId), { state: { chatId } });
    };

    const handleShowDeleteChatRoomModal = (chatRoomId: number) => {
        setDeleteChatRoomId(chatRoomId);
        setShowDeleteChatRoomModal(true);
    };

    const handleDeleteChatRoom = async () => {
        if (!userId || !deleteChatRoomId)
            return;

        try {
            await ChatService.deleteChat(deleteChatRoomId);
            toast.success('Your chat room has been deleted successfully.');
            setShowDeleteChatRoomModal(false);
            setDeleteChatRoomId(null);
            // Refresh the chat data
            const _userChats = await UserService.getUserChats(userId);
            setUserChats(_userChats);
            await fetchLastMessageDates(userId, _userChats);
        }
        catch (error) {
            console.error('Failed to delete chat room:', error);
            toast.error('Failed to delete chat room.');
        }
    };

    return (
        <div className="Chats">
            <h1><i className="bi bi-chat-fill"></i> My Chats</h1>
            <p></p>

            <div className="table-responsive">
                <Table striped bordered hover variant="light">
                    <thead className="table-dark">
                        <tr>
                            <th>User</th>
                            <th>Last message</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {userChats.length > 0 ? (
                            userChats.map((chat, index) => (
                                <tr key={index}>
                                    <td className="chat-room-row">
                                        {chat.user1Id === userId ? (
                                            `${chat.user2.firstName} ${chat.user2.lastName}`
                                        ) : (
                                            `${chat.user1.firstName} ${chat.user1.lastName}`
                                        )}
                                    </td>
                                    <td className="chat-room-row">
                                        {TimeService.formatDateToEURWithHour(lastMessageDates.get(chat.id) || '') || 'No messages'}
                                    </td>
                                    <td className="chat-room-row">
                                        <Button variant="info" className="button-spacing" onClick={() => moveToSpecificChatPage(chat.id)}>
                                            <i className="bi bi-chat-fill"></i>
                                            SignalR
                                        </Button>
                                        <Button variant="warning" className="button-spacing" onClick={() => moveToSpecificChatWSPage(chat.id)}>
                                            <i className="bi bi-chat-fill"></i>
                                            WebSockets
                                        </Button>
                                        <Button variant="secondary" className="button-spacing" onClick={() => moveToSpecificChatPollingPage(chat.id)}>
                                            <i className="bi bi-chat-fill"></i>
                                            Polling
                                        </Button>
                                        <Button variant="success" className="button-spacing" onClick={() => moveToSpecificChatSSEPage(chat.id)}>
                                            <i className="bi bi-chat-fill"></i>
                                            SSE
                                        </Button>
                                        <Button variant="danger" onClick={() => handleShowDeleteChatRoomModal(chat.id)}>
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="text-center">No chat room available</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Delete Chat Room Modal */}
            <Modal show={showDeleteChatRoomModal} onHide={() => setShowDeleteChatRoomModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to delete this chat room?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteChatRoomModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteChatRoom}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Chats;