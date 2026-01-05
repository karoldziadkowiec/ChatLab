import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Form, Button, Card, Container, Modal } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import ChatPollingHub from '../../services/chatPolling/ChatHub';
import ChatModel from '../../models/interfaces/Chat';
import Message from '../../models/interfaces/Message';
import UserDTO from '../../models/dtos/UserDTO';
import MessageSendDTO from '../../models/dtos/MessageSendDTO';
import '../../App.css';
import '../../styles/chat/Chat.css';

const Chat = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<ChatModel | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHub, setChatHub] = useState<ChatPollingHub | null>(null);
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
        if (userId && id) {
            const hub = new ChatPollingHub((message: Message) => {
                setMessages((prevMessages) => [...prevMessages, message]);
            }, { pollIntervalMs: 1000 });

            hub.startConnection(Number(id))
                .then(() => setChatHub(hub))
                .catch(error => {
                    console.error('Failed to start polling chat service:', error);
                    toast.error('Failed to start chat service.');
                });

            return () => {
                hub.leaveChat().catch(error => {
                    console.error('Failed to stop polling chat service:', error);
                });
            };
        }
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
    if (!chatHub || newMessage.trim() === '') {
        toast.error('Message cannot be sent');
        return;
    }

    try {
        if (chatData?.id && user?.id && receiver?.id) {
            const startTime = performance.now();

            const messageSendDTO: MessageSendDTO = {
                chatId: chatData.id,
                senderId: user.id,
                receiverId: receiver.id,
                content: newMessage
            };

            const createdMessage = await chatHub.sendMessage(messageSendDTO);

            if (createdMessage) {
                setMessages(prev => [...prev, createdMessage]);
                chatHub.setLastMessageId(createdMessage.id);
            } else {
            }

            setNewMessage('');
            scrollToBottom();

            const endTime = performance.now();
            const timeTaken = endTime - startTime;
            console.log(`Czas wysyłania wiadomości dla Polling: ${Math.round(timeTaken)} ms`);
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
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - Polling</h1>
            <div className="chat-container">
                <Navbar bg="dark" variant="dark" className="sticky-top">
                    <Container>
                        <Navbar.Brand className="mx-auto chat-name">
                            <Row>
                                <Col xs="auto">
                                    {receiver ? `${receiver.firstName} ${receiver.lastName}` : 'Receiver'}
                                </Col>
                                <Col xs="auto">
                                    <Button variant="danger" size='sm' onClick={() => setShowDeleteChatRoomModal(true)}>
                                        <i className="bi bi-trash"></i>
                                    </Button>
                                </Col>
                            </Row>
                        </Navbar.Brand>
                    </Container>
                </Navbar>
                <div className="messages">
                    {messages.length > 0 ? (
                        messages.map((message, index) => (
                            <Row key={index} className="my-2">
                                <Col xs={message.senderId === userId ? { span: 7, offset: 5 } : 7}>
                                    <Row className="d-flex justify-content-between align-items-center">
                                        <Col xs="auto">
                                            {message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Sender'}
                                        </Col>
                                        <Col xs="auto">
                                            <div className="message-timestamp">
                                                {TimeService.formatDateToEURWithHour(message.timestamp)}
                                            </div>
                                        </Col>
                                        <Col xs="auto">
                                            {message.senderId === userId && (
                                                <>
                                                    <Button variant="secondary" size='sm' onClick={() => handleShowDeleteMessageModal(message.id)}>
                                                        <i className="bi bi-trash"></i>
                                                    </Button>
                                                </>
                                            )}
                                        </Col>
                                    </Row>
                                    <Card className={message.senderId === userId ? 'bg-primary text-white' : 'bg-light'}>
                                        <Card.Body>
                                            <Card.Text>{message.content}</Card.Text>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        ))
                    ) : (
                        <div>
                            <p><strong>You're starting a new conversation</strong></p>
                            <p>Type your first message below.</p>
                        </div>
                    )}
                    {/* Scrolling down */}
                    <div ref={messagesEndRef} />
                </div>

                <Form className="message-input">
                    <Form.Group as={Row}>
                        <Col xs={10}>
                            <Form.Control
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                        </Col>
                        <Col xs={2}>
                            <Button variant="dark" onClick={handleSendMessage} className="w-100">
                                <i className="bi bi-send-fill"></i>
                            </Button>
                        </Col>
                    </Form.Group>
                </Form>
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

export default Chat;