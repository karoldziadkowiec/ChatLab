import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Form, Button, Card, Container, Modal } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from "../../services/api/AccountService";
import TimeService from "../../services/time/TimeService";
import ChatService from "../../services/api/ChatService";
import MessageService from "../../services/api/MessageService";
import ChatWebSocket from "../../services/chatWebSockets/ChatHub";
import Chat from "../../models/interfaces/Chat";
import Message from "../../models/interfaces/Message";
import UserDTO from "../../models/dtos/UserDTO";
import MessageSendDTO from "../../models/dtos/MessageSendDTO";
import '../../App.css';
import "../../styles/chat/Chat.css";

const ChatWebSockets = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [userId, setUserId] = useState<string | null>(null);
    const [chatData, setChatData] = useState<Chat | null>(null);
    const [user, setUser] = useState<UserDTO | null>(null);
    const [receiver, setReceiver] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [wsClient, setWsClient] = useState<ChatWebSocket | null>(null);

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
                if (_userId) setUserId(_userId);

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
            const client = new ChatWebSocket(Number(id), (msg) => {
                setMessages(prev => [...prev, msg]);
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
            if (chatData?.id && user?.id && receiver?.id) {
                const startTime = performance.now();
                
                const messageSendDTO: MessageSendDTO = {
                    chatId: chatData.id,
                    senderId: user.id,
                    receiverId: receiver.id,
                    content: newMessage
                };

                wsClient.send(messageSendDTO);
                setNewMessage("");

                const updated = await MessageService.getMessagesForChat(chatData.id);
                setMessages(updated);

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
            <h1><i className="bi bi-chat-dots-fill"></i> Chat - WebSocket</h1>
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

export default ChatWebSockets;