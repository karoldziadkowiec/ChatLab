import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import CommunicationTechnologyService from '../../services/api/CommunicationTechnologyService';
import CommunicationTechnologyConst from "../../models/enums/CommunicationTechnologyConst";
import ChatHubSocketIO from '../../services/chatSocketIO/ChatHubSocketIO';
import ChatModel from '../../models/interfaces/Chat';
import Message from '../../models/interfaces/Message';
import UserDTO from '../../models/dtos/UserDTO';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import '../../App.css';
import '../../styles/chat/Chat.css';

const ChatSocketIO = () => {
    const [technologyName, setTechnologyName] = useState<string | null>(null);
    const [technologyId, setTechnologyId] = useState<number | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<ChatModel | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHubSocketIO, setChatHubSocketIO] = useState<ChatHubSocketIO | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState<boolean>(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState<boolean>(false);
    const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const id = await AccountService.getId();
                if (id) setUserId(id);
            } catch (error) {
                console.error('Failed to fetch userId:', error);
                toast.error('Failed to load userId.');
            }
        };

        const fetchChatData = async (chatId: number) => {
            try {
                const _chatData = await ChatService.getChatById(chatId);
                setChatData(_chatData);

                if (_chatData.user1Id === userId) {
                    setUser(_chatData.user1);
                    setReceiver(_chatData.user2);
                } else {
                    setUser(_chatData.user2);
                    setReceiver(_chatData.user1);
                }

                const _messages = await MessageService.getMessagesForChat(chatId);
                setMessages(_messages);

                const techName = CommunicationTechnologyConst.SocketIO;
                setTechnologyName(techName);
                try {
                    const _technologyId = await CommunicationTechnologyService.getCommunicationTechnologyId(techName);
                    setTechnologyId(_technologyId);
                } catch (e) {
                    console.error('Failed to resolve communication technology id:', e);
                }
            } catch (error) {
                console.error('Failed to fetch chat data:', error);
                toast.error('Failed to load chat data.');
            }
        };

        if (id) {
            fetchUserData();
            fetchChatData(Number(id));
        }
    }, [id, userId]);

    useEffect(() => {
        if (!id || !userId) return;
        const hub = new ChatHubSocketIO();
        // Pass Authorization header to Socket.IO so server can call CoreService
        AccountService.getAuthorizationHeader()
            .then((authHeader) => {
                hub.setAuthorization(authHeader);
                return hub.connect(Number(id), userId);
            })
            .then(() => {
                setChatHubSocketIO(hub);
                const onMessage = (incoming: Message) => {
                    setMessages(prev => {
                        // Avoid duplicates when ack + broadcast both arrive
                        if (prev.some(m => m.id === incoming.id)) return prev;
                        return [...prev, incoming];
                    });
                    scrollToBottom();
                };
                hub.onMessage(onMessage);
                // Store listener for cleanup
                (hub as any)._onMessageRef = onMessage;
            })
            .catch((err) => {
                console.error('Socket.IO connect error:', err);
                toast.error('Failed to connect to Socket.IO.');
            });

        return () => {
            const ref = (hub as any)._onMessageRef as ((m: Message) => void) | undefined;
            if (ref) {
                hub.offMessage(ref);
                (hub as any)._onMessageRef = undefined;
            }
            hub.disconnect();
            setChatHubSocketIO(null);
        };
    }, [userId, id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (!chatData || !(chatData.user1Id === userId || chatData.user2Id === userId)) {
        return <div><p><strong><h2>No chat found...</h2></strong></p></div>;
    }

    const handleSendMessage = async () => {
    if (!chatHubSocketIO || newMessage.trim() === '') {
        toast.error('Message cannot be sent');
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

            const createdMessage = await chatHubSocketIO.sendMessage(messageSendDTO);

            if (createdMessage) {
                setMessages(prev => {
                    if (prev.some(m => m.id === createdMessage.id)) return prev;
                    return [...prev, createdMessage];
                });
                chatHubSocketIO.setLastMessageId(createdMessage.id);
            } else {
            }

            setNewMessage('');
            scrollToBottom();

            const endTime = performance.now();
            const timeTaken = endTime - startTime;
            console.log(`Czas wysyłania wiadomości dla SocketIO: ${Math.round(timeTaken)} ms`);
        } else {
            toast.error('Unable to send message. Missing required data.');
        }
    } catch (error) {
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
            const _messages = await MessageService.getMessagesForChat(chatData.id);
            setMessages(_messages);
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message.');
        }
    };

    return (
        <div className="Chat">
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - Socket.IO</h1>
            <div className="chat-container">
                <div className="chat-header sticky-top">
                    <div className="chat-header__left">
                        <div className="chat-avatar">
                            {`${receiver?.firstName?.[0] ?? ''}${receiver?.lastName?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div className="chat-title">
                            <div className="chat-name">{receiver ? `${receiver.firstName} ${receiver.lastName}` : 'Receiver'}</div>
                            <div className="chat-subtitle">Chat via Socket.IO</div>
                        </div>
                    </div>
                    <Button variant="danger" size='sm' onClick={() => setShowDeleteChatRoomModal(true)}>
                        <i className="bi bi-trash"></i>
                    </Button>
                </div>
                <div className="messages">
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const isMe = `${message.senderId}` === `${userId}`;
                            return (
                                <div key={message.id ?? `${message.chatId}-${message.timestamp}-${message.content}`}
                                     className={`msg ${isMe ? 'msg--me' : 'msg--other'}`}>
                                    <div className={`msg-bubble ${isMe ? 'msg-bubble--me' : 'msg-bubble--other'}`}>
                                        <div className="msg-content">{message.content}</div>
                                        <div className="msg-footer">
                                            <span className="msg-time">{TimeService.formatDateToEURWithHour(message.timestamp)} ({message.communicationTechnology?.name ?? technologyName ?? 'Socket.IO'})</span>
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

export default ChatSocketIO;