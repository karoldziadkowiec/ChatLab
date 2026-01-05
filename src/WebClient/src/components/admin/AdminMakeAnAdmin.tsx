import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Pagination, Form, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AccountService from '../../services/api/AccountService';
import UserService from '../../services/api/UserService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import UserDTO from '../../models/dtos/UserDTO';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/admin/AdminMakeAnAdmin.css';

const AdminMakeAnAdmin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [onlyUsers, setOnlyUsers] = useState<UserDTO[]>([]);
    const [onlyAdmins, setOnlyAdmins] = useState<UserDTO[]>([]);
    const [showMakeAnAdminModal, setShowMakeAnAdminModal] = useState<boolean>(false);
    const [showMakeAnUserModal, setShowMakeAnUserModal] = useState<boolean>(false);
    const [userIdToMakeAdmin, setUserIdToMakeAdmin] = useState<string | null>(null);
    const [userIdToMakeUser, setUserIdToMakeUser] = useState<string | null>(null);

    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = await AccountService.getId();
                if (userId) {
                    setUserId(userId);
                }
            }
            catch (error) {
                console.error('Failed to fetch user\'s data:', error);
                toast.error('Failed to load user\'s data.');
            }
        };

        const fetchUsers = async () => {
            try {
                const _onlyUsers = await UserService.getOnlyUsers();
                setOnlyUsers(_onlyUsers);

                const onlyAdmins = await UserService.getOnlyAdmins();
                setOnlyAdmins(onlyAdmins);
            }
            catch (error) {
                console.error('Failed to fetch users and admins:', error);
                toast.error('Failed to load users and admins.');
            }
        };

        fetchUserData();
        fetchUsers();
    }, [location, userId]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleShowMakeAnAdminModal = (userId: string) => {
        setUserIdToMakeAdmin(userId);
        setShowMakeAnAdminModal(true);
    };

    const handleMakeAnAdmin = async () => {
        if (!userIdToMakeAdmin)
            return;

        try {
            await AccountService.makeAnAdmin(userIdToMakeAdmin);
            setShowMakeAnAdminModal(false);
            toast.success("Admin permissions have been granted successfully.");
            //Refresh data
            const _onlyUsers = await UserService.getOnlyUsers();
            setOnlyUsers(_onlyUsers);
            const onlyAdmins = await UserService.getOnlyAdmins();
            setOnlyAdmins(onlyAdmins);
        }
        catch (error) {
            console.error('Failed to grant admin permissions:', error);
            toast.error('Failed to grant admin permissions.');
        }
    };

    const handleShowMakeAnUserModal = (userId: string) => {
        setUserIdToMakeUser(userId);
        setShowMakeAnUserModal(true);
    };

    const handleMakeAnUser = async () => {
        if (!userIdToMakeUser)
            return;

        try {
            await AccountService.makeAnUser(userIdToMakeUser);
            setShowMakeAnUserModal(false);
            toast.success("Admin permissions have been demoted from user successfully.");
            //Refresh data
            const _onlyUsers = await UserService.getOnlyUsers();
            setOnlyUsers(_onlyUsers);
            const onlyAdmins = await UserService.getOnlyAdmins();
            setOnlyAdmins(onlyAdmins);
        }
        catch (error) {
            console.error('Failed to demote admin permissions:', error);
            toast.error('Failed to demote admin permissions.');
        }
    };

    const handleOpenChat = async (receiverId: string) => {
        if (!receiverId || !userId)
            return;

        try {
            let chatId = await ChatService.getChatIdBetweenUsers(userId, receiverId);

            if (chatId === 0) {
                const chatCreateDTO: ChatCreateDTO = {
                    user1Id: userId,
                    user2Id: receiverId
                };

                await ChatService.createChat(chatCreateDTO);
                chatId = await ChatService.getChatIdBetweenUsers(userId, receiverId);
            }
            navigate(`/chat/${chatId}`, { state: { chatId } });
        }
        catch (error) {
            console.error('Failed to open chat:', error);
            toast.error('Failed to open chat.');
        }
    };

    const searchUsers = (users: UserDTO[]) => {
        if (!searchTerm) {
            return users;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.firstName + ' ' + user.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
            user.email.toLowerCase().includes(lowerCaseSearchTerm)
        );
    };

    const searchedUsers = searchUsers(onlyUsers);
    const currentUserItems = searchedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(searchedUsers.length / itemsPerPage);

    return (
        <div className="AdminMakeAnAdmin">
            <h1><i className="bi bi-universal-access-circle"></i> Make an Admin</h1>
            <p></p>
            <Tabs defaultActiveKey="users" id="user-tabs" className="mb-3 custom-tabs">
                {/* Users*/}
                <Tab eventKey="users" title="Users">
                    <div className="d-flex align-items-center mb-3">
                        {/* Search */}
                        <div className="mx-auto">
                            <Form.Label><strong>Search</strong></Form.Label>
                            <Form.Control
                                type="text"
                                className="form-control"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="table-responsive">
                        <Table striped bordered hover variant="light">
                            <thead className="table-dark">
                                <tr>
                                    <th>Creation Date</th>
                                    <th>E-mail</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUserItems.length > 0 ? (
                                    currentUserItems.map((user, index) => (
                                        <tr key={index}>
                                            <td>{TimeService.formatDateToEURWithHour(user.creationDate)}</td>
                                            <td>{user.email}</td>
                                            <td>{user.firstName}</td>
                                            <td>{user.lastName}</td>
                                            <td>
                                                <Button variant="warning" className="button-spacing" onClick={() => handleShowMakeAnAdminModal(user.id)}>
                                                    <i className="bi bi-universal-access-circle"></i>
                                                </Button>
                                                {user.id !== userId && (
                                                    <>
                                                        <span className="button-spacing">|</span>
                                                        <Button variant="info" onClick={() => handleOpenChat(user.id)}>
                                                            <i className="bi bi-chat-fill"></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center">No user available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
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
                </Tab>

                {/* Admins */}
                <Tab eventKey="admins" title="Admins">
                    <div className="table-responsive">
                        <Table striped bordered hover variant="light">
                            <thead className="table-dark">
                                <tr>
                                    <th>Creation Date</th>
                                    <th>E-mail</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {onlyAdmins.length > 0 ? (
                                    onlyAdmins.map((admin, index) => (
                                        <tr key={index}>
                                            <td>{TimeService.formatDateToEURWithHour(admin.creationDate)}</td>
                                            <td>{admin.email}</td>
                                            <td>{admin.firstName}</td>
                                            <td>{admin.lastName}</td>
                                            <td>
                                                {admin.id !== userId && (
                                                    <>
                                                        <Button variant="danger" className="button-spacing" onClick={() => handleShowMakeAnUserModal(admin.id)}>
                                                            <i className="bi bi-universal-access-circle"></i>
                                                        </Button>
                                                        <span className="button-spacing">|</span>
                                                        <Button variant="info" onClick={() => handleOpenChat(admin.id)}>
                                                            <i className="bi bi-chat-fill"></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center">No user available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
            </Tabs>

            {/* Make an Admin Modal */}
            <Modal show={showMakeAnAdminModal} onHide={() => setShowMakeAnAdminModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to grant admin permissions to this user?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMakeAnAdminModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleMakeAnAdmin}>Accept</Button>
                </Modal.Footer>
            </Modal>

            {/* Make an User Modal */}
            <Modal show={showMakeAnUserModal} onHide={() => setShowMakeAnUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to demote admin permissions from this user?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMakeAnUserModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleMakeAnUser}>Accept</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default AdminMakeAnAdmin;