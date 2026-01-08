import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Pagination, Form, Col, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import Role from '../../models/enums/Role';
import UserService from '../../services/api/UserService';
import TimeService from '../../services/time/TimeService';
import ChatService from '../../services/api/ChatService';
import UserDTO from '../../models/dtos/UserDTO';
import UserUpdateDTO from '../../models/dtos/UserUpdateDTO';
import RegisterDTO from '../../models/dtos/RegisterDTO';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/admin/AdminUsers.css';

const AdminUsers = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [onlyUsers, setOnlyUsers] = useState<UserDTO[]>([]);
    const [onlyAdmins, setOnlyAdmins] = useState<UserDTO[]>([]);
    const [userRoles, setUserRoles] = useState<{ [key: string]: string }>({});
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [createDTO, setCreateDTO] = useState<RegisterDTO>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        location: ''
    });
    const [updateFormData, setUpdateFormData] = useState<UserUpdateDTO>({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        location: ''
    });
    const [editedUserId, setEditedUserId] = useState<string | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
    // Filtering position
    const [selectedRole, setSelectedRole] = useState('All Roles');
    // Sorting
    const [sortCriteria, setSortCriteria] = useState('creationDateDesc');
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

        const fetchRoles = async () => {
            try {
                const _roles = await AccountService.getRoles();
                setRoles(_roles);
            }
            catch (error) {
                console.error('Failed to fetch roles:', error);
                toast.error('Failed to load roles.');
            }
        };

        const fetchUsers = async () => {
            try {
                const _users = await UserService.getUsers();
                setUsers(_users);

                const _onlyUsers = await UserService.getOnlyUsers();
                setOnlyUsers(_onlyUsers);

                const onlyAdmins = await UserService.getOnlyAdmins();
                setOnlyAdmins(onlyAdmins);

                const userRoles = await Promise.all(
                    _users.map(async (user) => {
                        const role = await UserService.getUserRole(user.id);
                        return { userId: user.id, role };
                    })
                );
    
                const roleMap: { [key: string]: string } = {};
                userRoles.forEach(({ userId, role }) => {
                    roleMap[userId] = role;
                });
    
                setUserRoles(roleMap);
            }
            catch (error) {
                console.error('Failed to fetch users and admins:', error);
                toast.error('Failed to load users and admins.');
            }
        };

        fetchUserData();
        fetchRoles();
        fetchUsers();
    }, [location, userId]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCreateDTO(prevCreateDTO => ({
            ...prevCreateDTO,
            [name]: value,
        }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            await AccountService.registerUser(createDTO);
            setShowCreateModal(false)
            toast.success("Account has been successfully created!");
            //Refresh data
            const _users = await UserService.getUsers();
            setUsers(_users);
            const _onlyUsers = await UserService.getOnlyUsers();
            setOnlyUsers(_onlyUsers);
            const onlyAdmins = await UserService.getOnlyAdmins();
            setOnlyAdmins(onlyAdmins);
        }
        catch (error) {
            toast.error('Creation failed. Please try again.');
        }
    };

    const validateForm = () => {
        const { email, password, confirmPassword, firstName, lastName, phoneNumber, location } = createDTO;

        // Checking empty fields
        if (!email || !password || !confirmPassword || !firstName || !lastName || !phoneNumber || !location)
            return 'All fields are required.';

        // E-mail validation
        const emailError = emailValidator(email);
        if (emailError)
            return emailError;

        // Password validation
        const passwordError = passwordValidator(password);
        if (passwordError)
            return passwordError;

        // Passwords matcher
        if (password !== confirmPassword)
            return 'Passwords do not match.';

        // Checking phone number type
        if (isNaN(Number(phoneNumber)))
            return 'Phone number must be a number.';

        // Checking phone number length
        if (phoneNumber.length !== 9)
            return 'Phone number must contain exactly 9 digits.';

        return null;
    };

    const emailValidator = (email: string): string | null => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return 'Invalid email format. Must contain "@" and "."';

        return null;
    };

    const passwordValidator = (password: string): string | null => {
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
        if (!passwordRegex.test(password))
            return 'Password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character.';

        return null;
    };

    const handleShowEditModal = async (userId: string) => {
        setEditedUserId(userId);
        let updateFormData = await UserService.getUser(userId);
        setUpdateFormData(updateFormData);
        setShowEditModal(true);
    };

    const handleEditProfile = async () => {
        if (!editedUserId)
            return;

        const validationError = validateEditForm();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            await UserService.updateUser(editedUserId, updateFormData);
            setShowEditModal(false);
            toast.success('Profile updated successfully!');
            //Refresh data
            const _users = await UserService.getUsers();
            setUsers(_users);
            const _onlyUsers = await UserService.getOnlyUsers();
            setOnlyUsers(_onlyUsers);
            const onlyAdmins = await UserService.getOnlyAdmins();
            setOnlyAdmins(onlyAdmins);
        }
        catch (error) {
            console.error('Failed to update user data:', error);
            toast.error('Failed to update user data.');
        }
    };

    const validateEditForm = () => {
        const { firstName, lastName, phoneNumber, location } = updateFormData;

        // Checking empty fields
        if (!firstName || !lastName || !phoneNumber || !location)
            return 'All fields are required.';

        // Checking phone number type
        if (isNaN(Number(phoneNumber)))
            return 'Phone number must be a number.';

        // Checking phone number length
        if (phoneNumber.length !== 9)
            return 'Phone number must contain exactly 9 digits.';

        return null;
    };

    const handleShowDeleteModal = (userId: string) => {
        setDeleteUserId(userId);
        setShowDeleteModal(true);
    };

    const handleDeleteProfile = async () => {
        if (!deleteUserId)
            return;

        try {
            await UserService.deleteUser(deleteUserId);
            setShowDeleteModal(false);
            toast.success("Account has been deleted successfully.");
            //Refresh data
            const _users = await UserService.getUsers();
            setUsers(_users);
            const _onlyUsers = await UserService.getOnlyUsers();
            setOnlyUsers(_onlyUsers);
            const onlyAdmins = await UserService.getOnlyAdmins();
            setOnlyAdmins(onlyAdmins);
        }
        catch (error) {
            console.error('Failed to delete user:', error);
            toast.error('Failed to delete user.');
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
            navigate(RoutePaths.chatSignalR(chatId), { state: { chatId } });
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
            user.email.toLowerCase().includes(lowerCaseSearchTerm) ||
            user.phoneNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
            user.location.toLowerCase().includes(lowerCaseSearchTerm)
        );
    };

    const filterUsersByRole = (users: UserDTO[]) => {
        if (selectedRole === "All Roles") {
            return users;
        }
        else if (selectedRole === "Admin") {
            return onlyAdmins;
        }
        else {
            return onlyUsers;
        }
    };

    const sortUsers = (users: UserDTO[]) => {
        switch (sortCriteria) {
            case 'creationDateAsc':
                return [...users].sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
            case 'creationDateDesc':
                return [...users].sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
            case 'firstNameAsc':
                return [...users].sort((a, b) => a.firstName.localeCompare(b.firstName));
            case 'firstNameDesc':
                return [...users].sort((a, b) => b.firstName.localeCompare(a.firstName));
            case 'lastNameAsc':
                return [...users].sort((a, b) => a.lastName.localeCompare(b.lastName));
            case 'lastNameDesc':
                return [...users].sort((a, b) => b.lastName.localeCompare(a.lastName));
            case 'emailAsc':
                return [...users].sort((a, b) => a.email.localeCompare(b.email));
            case 'emailDesc':
                return [...users].sort((a, b) => b.email.localeCompare(a.email));
            case 'phoneNumberAsc':
                return [...users].sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber));
            case 'phoneNumberDesc':
                return [...users].sort((a, b) => b.phoneNumber.localeCompare(a.phoneNumber));
            case 'locationAsc':
                return [...users].sort((a, b) => a.location.localeCompare(b.location));
            case 'locationDesc':
                return [...users].sort((a, b) => a.location.localeCompare(b.location));
            default:
                return users;
        }
    };

    const filteredUsers = filterUsersByRole(users);
    const searchedUsers = searchUsers(filteredUsers);
    const sortedUsers = sortUsers(searchedUsers);
    const currentUserItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    return (
        <div className="AdminUsers">
            <h1><i className="bi bi-people-fill"></i> Users</h1>
            <Button variant="primary" className="form-button" onClick={() => setShowCreateModal(true)}>
                <i className="bi bi-person-plus-fill"></i>  Create User
            </Button>
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
                {/* Filter Roles */}
                <div className="ms-auto">
                    <Form.Label><strong>Filter Roles</strong></Form.Label>
                    <Form.Select
                        as="select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        <option value="All Roles">All Roles</option>
                        {roles.map((role) => (
                            <option>
                                {role}
                            </option>
                        ))}
                    </Form.Select>
                </div>
                {/* Sort */}
                <div className="ms-auto">
                    <Form.Label><strong>Sort by</strong></Form.Label>
                    <Form.Select
                        aria-label="Sort by"
                        value={sortCriteria}
                        onChange={(e) => setSortCriteria(e.target.value)}
                    >
                        <option value="creationDateAsc">Creation Date Ascending</option>
                        <option value="creationDateDesc">Creation Date Descending</option>
                        <option value="firstNameAsc">First Name Ascending</option>
                        <option value="firstNameDesc">First Name Descending</option>
                        <option value="lastNameAsc">Last Name Ascending</option>
                        <option value="lastNameDesc">Last Name Descending</option>
                        <option value="emailAsc">E-mail Ascending</option>
                        <option value="emailDesc">E-mail Descending</option>
                        <option value="phoneNumberAsc">Phone Number Ascending</option>
                        <option value="phoneNumberDesc">Phone Number Descending</option>
                        <option value="salaryAsc">Location Ascending</option>
                        <option value="salaryDesc">Location Descending</option>
                    </Form.Select>
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
                            <th>Phone number</th>
                            <th>Location</th>
                            <th>Role</th>
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
                                    <td>{user.phoneNumber}</td>
                                    <td>{user.location}</td>
                                    <td>{userRoles[user.id] || 'Loading...'}</td>
                                    <td>
                                        <Button variant="warning" className="button-spacing" onClick={() => handleShowEditModal(user.id)}>
                                            <i className="bi bi-pencil-square"></i>
                                        </Button>
                                        {(user.id !== userId && userRoles[user.id] === Role.Admin) && (
                                            <>
                                                <Button variant="danger" className="button-spacing" onClick={() => handleShowDeleteModal(user.id)}>
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            </>
                                        )}
                                        {userRoles[user.id] === Role.User && (
                                            <>
                                                <Button variant="danger" className="button-spacing" onClick={() => handleShowDeleteModal(user.id)}>
                                                    <i className="bi bi-trash"></i>
                                                </Button>
                                            </>
                                        )}
                                        {(user.id !== userId) && (
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

            {/* Create User Modal */}
            <Modal size='lg' show={showCreateModal} onHide={() => setShowCreateModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Create User</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="justify-content-md-center">
                        <Col md="6">
                            <Form>
                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label><strong>E-mail</strong></Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder="E-mail"
                                        value={createDTO.email}
                                        onChange={handleChange}
                                        maxLength={50}
                                        required
                                    />
                                </Form.Group>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formPassword">
                                            <Form.Label><strong>Password</strong></Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="password"
                                                placeholder="Password"
                                                value={createDTO.password}
                                                onChange={handleChange}
                                                minLength={7}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formConfirmPassword">
                                            <Form.Label><strong>Confirm Password</strong></Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="confirmPassword"
                                                placeholder="Confirm Password"
                                                value={createDTO.confirmPassword}
                                                onChange={handleChange}
                                                minLength={7}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formFirstName">
                                            <Form.Label><strong>First Name</strong></Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                placeholder="First Name"
                                                value={createDTO.firstName}
                                                onChange={handleChange}
                                                maxLength={20}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formLastName">
                                            <Form.Label><strong>Last Name</strong></Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                placeholder="Last Name"
                                                value={createDTO.lastName}
                                                onChange={handleChange}
                                                maxLength={30}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formPhoneNumber">
                                            <Form.Label><strong>Phone Number</strong></Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="phoneNumber"
                                                placeholder="Phone Number"
                                                value={createDTO.phoneNumber}
                                                onChange={handleChange}
                                                maxLength={9}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group className="mb-3" controlId="formLocation">
                                            <Form.Label><strong>Location</strong></Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="location"
                                                placeholder="Location"
                                                value={createDTO.location}
                                                onChange={handleChange}
                                                maxLength={40}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Form>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleRegister}>Create</Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formFirstName">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="firstName"
                                value={updateFormData.firstName}
                                onChange={(e) => setUpdateFormData({ ...updateFormData, firstName: e.target.value })}
                                maxLength={20}
                                required
                            />
                        </Form.Group>
                        <Form.Group controlId="formLastName">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="lastName"
                                value={updateFormData.lastName}
                                onChange={(e) => setUpdateFormData({ ...updateFormData, lastName: e.target.value })}
                                maxLength={30}
                                required
                            />
                        </Form.Group>
                        <Form.Group controlId="formPhoneNumber">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                                type="tel"
                                name="phoneNumber"
                                value={updateFormData.phoneNumber}
                                onChange={(e) => setUpdateFormData({ ...updateFormData, phoneNumber: e.target.value })}
                                maxLength={9}
                                required
                            />
                        </Form.Group>
                        <Form.Group controlId="formLocation">
                            <Form.Label>Location</Form.Label>
                            <Form.Control
                                type="text"
                                name="location"
                                value={updateFormData.location}
                                onChange={(e) => setUpdateFormData({ ...updateFormData, location: e.target.value })}
                                maxLength={40}
                                required
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleEditProfile}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {/* Delete User Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to delete this user?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteProfile}>Delete</Button>
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

export default AdminUsers;