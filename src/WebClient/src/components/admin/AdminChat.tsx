import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RoutePaths } from '../../routes/RoutePaths';
import { Row, Col, Button, Card, Container, Modal } from 'react-bootstrap';
import Navbar from 'react-bootstrap/Navbar';
import { toast } from 'react-toastify';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import ChatModel from '../../models/interfaces/Chat';
import Message from '../../models/interfaces/Message';
import UserDTO from '../../models/dtos/UserDTO';
import '../../App.css';
import '../../styles/admin/AdminChat.css';

const AdminChat = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [chatData, setChatData] = useState<ChatModel | null>(null);
    const [user1, setUser1] = useState<UserDTO | null>(null);
    const [user2, setUser2] = useState<UserDTO | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messagesCount, setMessagesCount] = useState<number>(0);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState<boolean>(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState<boolean>(false);
    const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);

    useEffect(() => {
        const fetchChatData = async (id: number) => {
            try {
                const _chatData = await ChatService.getChatById(id);
                setChatData(_chatData);

                setUser1(_chatData.user1);
                setUser2(_chatData.user2);

                const _messages = await MessageService.getMessagesForChat(id);
                setMessages(_messages);

                const _messagesCount = await MessageService.getMessagesForChatCount(id);
                setMessagesCount(_messagesCount);
            }
            catch (error) {
                console.error('Failed to fetch chat data:', error);
                toast.error('Failed to load chat data.');
            }
        };

        if (id) {
            fetchChatData(Number(id));
        }
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (!chatData) {
        return <div><p><strong><h2>No chat found...</h2></strong></p></div>;
    }

    const refreshData = async () => {
        const _messages = await MessageService.getMessagesForChat(Number(id));
        setMessages(_messages);

        const _messagesCount = await MessageService.getMessagesForChatCount(Number(id));
        setMessagesCount(_messagesCount);
    };

    const handleDeleteChatRoom = async () => {
        if (!chatData)
            return;

        try {
            await ChatService.deleteChat(chatData.id);
            setShowDeleteChatRoomModal(false);
            navigate(RoutePaths.adminChats(), { state: { toastMessage: "Chat room has been deleted successfully." } });
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
        if (!deleteMessageId)
            return;

        try {
            await MessageService.deleteMessage(deleteMessageId);
            toast.success('Message has been deleted successfully.');
            setShowDeleteMessageModal(false);
            setDeleteMessageId(null);
            const _messages = await MessageService.getMessagesForChat(chatData.id);
            setMessages(_messages);
            const _messagesCount = await MessageService.getMessagesForChatCount(chatData.id);
            setMessagesCount(_messagesCount);
        }
        catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message.');
        }
    };

    return (
        <div className="AdminChat">
            <h1><i className="bi bi-chat-dots"></i> Manage Chat</h1>
            <h4>Messages count: <strong>{messagesCount}</strong></h4>
            <div className="chat-container">
                <Navbar bg="dark" variant="dark" className="sticky-top">
                    <Container>
                        <Navbar.Brand className="mx-auto chat-name">
                            <Row>
                                <Col xs="auto">
                                    {user1?.firstName} {user1?.lastName} - {user2?.firstName} {user2?.lastName}
                                </Col>
                                <Col xs="auto">
                                    <Button variant="info" size='sm' className="button-spacing" onClick={refreshData}>
                                        <i className="bi bi-arrow-repeat"></i>
                                    </Button>
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
                                <Col xs={12} sm={message.senderId === user2?.id ? { span: 7, offset: 5 } : 7}>
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
                                            <Button variant="secondary" size='sm' onClick={() => handleShowDeleteMessageModal(message.id)}>
                                                <i className="bi bi-trash"></i>
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Card className={message.senderId === user2?.id ? 'bg-primary text-white' : 'bg-light'}>
                                        <Card.Body>
                                            <Card.Text>{message.content}</Card.Text>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        ))
                    ) : (
                        <div>
                            <p><strong>It's a new conversation</strong></p>
                            <p>Waiting for first message...</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

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
}

export default AdminChat;