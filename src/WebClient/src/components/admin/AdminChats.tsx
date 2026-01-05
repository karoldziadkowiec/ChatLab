import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Form, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import MessageService from '../../services/api/MessageService';
import ChatModel from '../../models/interfaces/Chat';
import '../../App.css';
import '../../styles/admin/AdminChats.css';

const AdminChats = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [chatRooms, setChatRooms] = useState<ChatModel[]>([]);
    const [lastMessageDates, setLastMessageDates] = useState<Map<number, string>>(new Map());
    const [messagesCounters, setMessagesCounters] = useState<Map<number, number>>(new Map());
    const [showDeleteChatRoomModal, setShowDeleteChatRoomModal] = useState<boolean>(false);
    const [deleteChatRoomId, setDeleteChatRoomId] = useState<number | null>(null);
    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
    // Sorting
    const [sortCriteria, setSortCriteria] = useState('lastMessageDesc');
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    useEffect(() => {
        if (location.state && location.state.toastMessage) {
            toast.success(location.state.toastMessage);
        }

        const fetchChats = async () => {
            try {
                const _chatRooms = await ChatService.getChats();
                setChatRooms(_chatRooms);

                await fetchDataForSpecificChatRoom(_chatRooms);
            }
            catch (error) {
                console.error('Failed to fetch chats:', error);
                toast.error('Failed to load chats.');
            }
        };

        fetchChats();
    }, [location]);

    const fetchDataForSpecificChatRoom = async (chats: ChatModel[]) => {
        const dates = new Map<number, string>();
        const counters = new Map<number, number>();

        for (const chat of chats) {
            try {
                const date = await MessageService.getLastMessageDateForChat(chat.id);
                dates.set(chat.id, date === '0001-01-01T00:00:00' ? '-' : date);

                const counter = await MessageService.getMessagesForChatCount(chat.id);
                counters.set(chat.id, counter);
            }
            catch (error) {
                console.error(`Failed to fetch last message date for chat ${chat.id}:`, error);
            }
        }
        setLastMessageDates(dates);
        setMessagesCounters(counters);
    };

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const moveToSpecificChatPage = (chatId: number) => {
        navigate(`/admin/chat/${chatId}`, { state: { chatId } });
    };

    const handleShowDeleteChatRoomModal = (chatRoomId: number) => {
        setDeleteChatRoomId(chatRoomId);
        setShowDeleteChatRoomModal(true);
    };

    const handleDeleteChatRoom = async () => {
        if (!deleteChatRoomId)
            return;

        try {
            await ChatService.deleteChat(deleteChatRoomId);
            toast.success('Chat room has been deleted successfully.');
            setShowDeleteChatRoomModal(false);
            setDeleteChatRoomId(null);
            // Refresh the chat data
            const _chatRooms = await ChatService.getChats();
            setChatRooms(_chatRooms);
            await fetchDataForSpecificChatRoom(_chatRooms);
        }
        catch (error) {
            console.error('Failed to delete chat room:', error);
            toast.error('Failed to delete chat room.');
        }
    };

    const searchChats = (chats: ChatModel[]) => {
        if (!searchTerm) {
            return chats;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return chats.filter(chat =>
            (chat.user1.firstName + ' ' + chat.user1.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
            chat.user1.email.toLowerCase().includes(lowerCaseSearchTerm) ||
            (chat.user2.firstName + ' ' + chat.user2.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
            chat.user2.email.toLowerCase().includes(lowerCaseSearchTerm)
        );
    };

    const sortChats = (chats: ChatModel[], lastMessageDates: Map<number, string>, messagesCounters: Map<number, number>) => {
        return chats.sort((a, b) => {
            const lastMessageDateA = lastMessageDates.get(a.id) || '';
            const lastMessageDateB = lastMessageDates.get(b.id) || '';

            const messagesCounterA = messagesCounters.get(a.id) || 0;
            const messagesCounterB = messagesCounters.get(b.id) || 0;

            switch (sortCriteria) {
                case 'lastMessageAsc':
                    return lastMessageDateA.localeCompare(lastMessageDateB);
                case 'lastMessageDesc':
                    return lastMessageDateB.localeCompare(lastMessageDateA);
                case 'messagesCounterAsc':
                    return messagesCounterA - messagesCounterB;
                case 'messagesCounterDesc':
                    return messagesCounterB - messagesCounterA;
                default:
                    return 0;
            }
        });
    };

    const searchedChats = searchChats(chatRooms);
    const sortedChats = sortChats(searchedChats, lastMessageDates, messagesCounters);
    const currentChatItems = sortedChats.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedChats.length / itemsPerPage);

    return (
        <div className="AdminChats">
            <h1><i className="bi bi-chat-text-fill"></i> Chat Rooms</h1>
            <p></p>
            <div className="d-flex align-items-center mb-3">
                {/* Search */}
                <div>
                    <Form.Label><strong>Search</strong></Form.Label>
                    <Form.Control
                        type="text"
                        className="form-control"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Sort */}
                <div className="ms-auto">
                    <Form.Label><strong>Sort by</strong></Form.Label>
                    <Form.Select
                        aria-label="Sort by"
                        value={sortCriteria}
                        onChange={(e) => setSortCriteria(e.target.value)}
                    >
                        <option value="lastMessageAsc">Last Message Ascending</option>
                        <option value="lastMessageDesc">Last Message Descending</option>
                        <option value="messagesCounterAsc">Messages Counter Ascending</option>
                        <option value="messagesCounterDesc">Messages Counter Descending</option>
                    </Form.Select>
                </div>
            </div>
            <div className="table-responsive">
                <Table striped bordered hover variant="light">
                    <thead className="table-dark">
                        <tr>
                            <th>User 1</th>
                            <th>User 2</th>
                            <th>Last message</th>
                            <th>Messages count</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentChatItems.length > 0 ? (
                            currentChatItems.map((chat, index) => (
                                <tr key={index}>
                                    <td className="chat-room-row">
                                        {chat.user1.firstName} {chat.user1.lastName} ({chat.user1.email})
                                    </td>
                                    <td className="chat-room-row">
                                        {chat.user2.firstName} {chat.user2.lastName} ({chat.user2.email})
                                    </td>
                                    <td className="chat-room-row">
                                        {TimeService.formatDateToEURWithHour(lastMessageDates.get(chat.id) || '') || 'No messages'}
                                    </td>
                                    <td className="chat-room-row">
                                        {messagesCounters.get(chat.id) || 0}
                                    </td>
                                    <td className="chat-room-row">
                                        <Button variant="info" className="button-spacing" onClick={() => moveToSpecificChatPage(chat.id)}>
                                            <i className="bi bi-chat-fill"></i>
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

            {/* Pagination */}
            <div className="admin-pagination-container">
                <Pagination className="pagination-blue">
                    <Pagination.Prev
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    />
                    {[...Array(totalPages)].map((_, index) => (
                        <Pagination.Item
                            key={index + 1}
                            active={index + 1 === currentPage}
                            onClick={() => handlePageChange(index + 1)}
                        >
                            {index + 1}
                        </Pagination.Item>
                    ))}
                    <Pagination.Next
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    />
                </Pagination>
            </div>
        </div>
    );
}

export default AdminChats;