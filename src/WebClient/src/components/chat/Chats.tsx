import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Modal } from 'react-bootstrap';
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

    const moveToSpecificChatSingnalRPage = (chatId: number) => {
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

    const moveToSpecificChatSocketIOPage = (chatId: number) => {
        navigate(RoutePaths.chatSocketIO(chatId), { state: { chatId } });
    };

    const moveToSpecificChatGrpcPage = (chatId: number) => {
        navigate(RoutePaths.chatGRPC(chatId), { state: { chatId } });
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

            <div className="chat-list">
                {userChats.length > 0 ? (
                    userChats.map((chat, index) => {
                        const partner = chat.user1Id === userId ? chat.user2 : chat.user1;
                        const last = TimeService.formatDateToEURWithHour(lastMessageDates.get(chat.id) || '') || 'No messages';
                        const initials = `${partner.firstName?.[0] ?? ''}${partner.lastName?.[0] ?? ''}`.toUpperCase();
                        return (
                            <div key={index} className="chat-item">
                                <div className="chat-main" onClick={() => moveToSpecificChatSingnalRPage(chat.id)} role="button" tabIndex={0}>
                                    <div className="chat-avatar">{initials}</div>
                                    <div className="chat-text">
                                        <div className="chatlist-name">{partner.firstName} {partner.lastName}</div>
                                        <div className="chat-last">
                                            <i className="bi bi-clock"></i> {last}
                                        </div>
                                    </div>
                                </div>
                                <div className="chat-actions">
                                    <Button variant="info" className="button-spacing" title="Open SignalR chat" onClick={() => moveToSpecificChatSingnalRPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> SignalR</span>
                                    </Button>
                                    <Button variant="warning" className="button-spacing" title="Open WebSockets chat" onClick={() => moveToSpecificChatWSPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> WebSockets</span>
                                    </Button>
                                    <Button variant="secondary" className="button-spacing" title="Open Polling chat" onClick={() => moveToSpecificChatPollingPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> Polling</span>
                                    </Button>
                                    <Button variant="success" className="button-spacing" title="Open SSE chat" onClick={() => moveToSpecificChatSSEPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> SSE</span>
                                    </Button>
                                    <Button variant="dark" className="button-spacing" title="Open Socket.IO chat" onClick={() => moveToSpecificChatSocketIOPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> Socket.IO</span>
                                    </Button>
                                    <Button variant="primary" className="button-spacing" title="Open gRPC chat" onClick={() => moveToSpecificChatGrpcPage(chat.id)}>
                                        <i className="bi bi-chat-fill"></i>
                                        <span className="action-label"> gRPC</span>
                                    </Button>
                                    <span className="actions-separator" />
                                    <Button variant="danger" title="Delete chat" onClick={() => handleShowDeleteChatRoomModal(chat.id)}>
                                        <i className="bi bi-trash"></i>
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="no-chats">No chat room available</div>
                )}
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