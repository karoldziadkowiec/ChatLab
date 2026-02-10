import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from "../../services/api/AccountService";
import TimeService from "../../services/time/TimeService";
import ChatService from "../../services/api/ChatService";
import MessageService from "../../services/api/MessageService";
import CommunicationTechnologyService from '../../services/api/CommunicationTechnologyService';
import ChatHubWebSockets from "../../services/chatWebSockets/ChatHubWebSockets";
import CommunicationTechnologyConst from "../../models/enums/CommunicationTechnologyConst";
import Chat from "../../models/interfaces/Chat";
import Message from "../../models/interfaces/Message";
import UserDTO from "../../models/dtos/UserDTO";
import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import '../../App.css';
import "../../styles/chat/Chat.css";

const ChatWebSockets = () => {
    const [technologyName, setTechnologyName] = useState<string | null>(null);
    const [technologyId, setTechnologyId] = useState<number | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<Chat | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [wsClient, setWsClient] = useState<ChatHubWebSockets | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [newMessage, setNewMessage] = useState("");

    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
    const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

    // Load user + chat metadata
    useEffect(() => {
        const load = async () => {
            try {
                const _userId = await AccountService.getId();
                if (_userId)
                    setUserId(_userId);

                if (id) {
                    const chat = await ChatService.getChatById(Number(id));
                    setChatData(chat);

                    if (chat.user1Id === _userId) {
                        setUser(chat.user1);
                        setReceiver(chat.user2);
                    } else {
                        setUser(chat.user2);
                        setReceiver(chat.user1);
                    }

                    const msgs = await MessageService.getMessagesForChat(Number(id));
                    setMessages(msgs);

                    const techName = CommunicationTechnologyConst.WebSockets;
                    setTechnologyName(techName);
                    try {
                        const _technologyId = await CommunicationTechnologyService.getCommunicationTechnologyId(techName);
                        setTechnologyId(_technologyId);
                    } catch (e) {
                        console.error('Failed to resolve communication technology id:', e);
                    }
                }
            } catch (error) {
                toast.error("Failed to load chat data");
            }
        };

        load();
    }, [id]);

    // Open WebSocket connection
    useEffect(() => {
        if (id && userId) {
            const client = new ChatHubWebSockets(Number(id), userId, (msg) => {
                setMessages(prev => {
                    // Deduplicate by message id
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            });

            client.connect()
                .then(() => setWsClient(client))
                .catch(err => toast.error("Cannot connect to WebSocket"));

            return () => client.disconnect();
        }
    }, [id, userId]);


    useEffect(() => {
        if (messagesEndRef.current)
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages]);


    const handleSendMessage = async () => {
        if (!wsClient || !newMessage.trim() || !chatData || !user || !receiver) {
            toast.error("Message cannot be sent");
            return;
        }

        try {
            if (chatData?.id && user?.id && receiver?.id && technologyId) {
                const startTime = performance.now();
                
                const messageSendDTO: MessageSendDTO = {
                    chatId: chatData.id,
                    senderId: user.id,
                    receiverId: receiver.id,
                    communicationTechnologyId: technologyId,
                    content: newMessage
                };

                wsClient.send(messageSendDTO);
                setNewMessage("");
                // Do not refresh via REST — the message will arrive via WS

                const endTime = performance.now();
                const timeTaken = endTime - startTime;
                console.log(`Czas wysyłania wiadomości dla WebSockets: ${Math.round(timeTaken)} ms`);
            }
            else {
                toast.error('Unable to send message. Missing required data.');
            }
        }
        catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message.');
        }
};

    const handleDeleteChatRoom = async () => {
        if (!chatData)
            return;

        try {
            await ChatService.deleteChat(chatData.id);
            setShowDeleteChatRoomModal(false);
            toast.success('Your chat room has been deleted successfully.');
            navigate(RoutePaths.chats());
        }
        catch (error) {
            console.error('Failed to delete chat room:', error);
            toast.error('Failed to delete chat room.');
        }
    };

    const handleShowDeleteMessageModal = (messageId: number) => {
        setDeleteMessageId(messageId);
        setShowDeleteMessageModal(true);
    };

    const handleDeleteMessage = async () => {
        if (!userId || !deleteMessageId)
            return;

        try {
            await MessageService.deleteMessage(deleteMessageId);
            toast.success('Message has been deleted successfully.');
            setShowDeleteMessageModal(false);
            setDeleteMessageId(null);
            // Refresh the chat data
            const _messages = await MessageService.getMessagesForChat(chatData!.id);
            setMessages(_messages);
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message.');
        }
    };


    if (!chatData || !user || !receiver) {
        return <div>No chat found...</div>;
    }


    return (
        <div className="Chat">
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - WebSockets</h1>
            <div className="chat-container">
                <div className="chat-header sticky-top">
                    <div className="chat-header__left">
                        <div className="chat-avatar">
                            {`${receiver?.firstName?.[0] ?? ''}${receiver?.lastName?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div className="chat-title">
                            <div className="chat-name">{receiver ? `${receiver.firstName} ${receiver.lastName}` : 'Receiver'}</div>
                            <div className="chat-subtitle">Chat via WebSockets</div>
                        </div>
                    </div>
                    <Button variant="danger" size='sm' onClick={() => setShowDeleteChatRoomModal(true)}>
                        <i className="bi bi-trash"></i>
                    </Button>
                </div>
                <div className="messages">
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const isMe = message.senderId === userId;
                            return (
                                <div key={message.id} className={`msg ${isMe ? 'msg--me' : 'msg--other'}`}>
                                    <div className={`msg-bubble ${isMe ? 'msg-bubble--me' : 'msg-bubble--other'}`}>
                                        <div className="msg-content">{message.content}</div>
                                        <div className="msg-footer">
                                            <span className="msg-time">{TimeService.formatDateToEURWithHour(message.timestamp)} ({message.communicationTechnology?.name ?? technologyName ?? 'WebSockets'})</span>
                                            {isMe && (
                                                <Button variant="outline-danger" size='sm' className="msg-delete" onClick={() => handleShowDeleteMessageModal(message.id)}>
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div>
                            <p><strong>You're starting a new conversation</strong></p>
                            <p>Type your first message below.</p>
                        </div>
                    )}
                    {/* Scrolling down */}
                    <div ref={messagesEndRef} />
                </div>

                <div className="message-input">
                    <div className="message-input__inner">
                        <input
                            className="message-input__field"
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button variant="dark" onClick={handleSendMessage} className="message-input__send">
                            <i className="bi bi-send-fill"></i>
                        </Button>
                    </div>
                </div>
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

            {/* Delete Message Modal */}
            <Modal show={showDeleteMessageModal} onHide={() => setShowDeleteMessageModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to delete this message?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteMessageModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteMessage}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ChatWebSockets;