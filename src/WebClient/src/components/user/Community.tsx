import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Modal, Pagination, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import UserService from '../../services/api/UserService';
import ChatService from '../../services/api/ChatService';
import UserFollowService from '../../services/api/UserFollowService';
import TimeService from '../../services/time/TimeService';
import UserDTO from '../../models/dtos/UserDTO';
import UserFollowCreateDTO from '../../models/dtos/UserFollowCreateDTO';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/user/Community.css';

const Community = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [showUserDetailsModal, setShowUserDetailsModal] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
    const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
    const [userFollowedMap, setUserFollowedMap] = useState<Record<string, number>>({});
    const [showUnFollowModal, setShowUnFollowModal] = useState<boolean>(false);
    const [unFollowUserId, setUnFollowUserId] = useState<string | null>(null);
    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
    // Sorting
    const [sortCriteria, setSortCriteria] = useState('creationDateDesc');
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 21;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = await AccountService.getId();
                if (userId) {
                    setUserId(userId);
                }
            } catch (error) {
                console.error('Failed to fetch user\'s data:', error);
                toast.error('Failed to load user\'s data.');
            }
        };

        const fetchUsers = async () => {
            try {
                const _users = await UserService.getUsers();
                setUsers(_users);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                toast.error('Failed to load users.');
            }
        };

        const fetchUserFollowedForUser = async () => {
            try {
                if (userId) {
                    const _userFollowed = await UserFollowService.getUserFollowedForUser(userId);

                    const userFollowedIds = new Set<string>();
                    const map: Record<string, number> = {};
                    for (const uf of _userFollowed) {
                        const otherUserId = uf.followedId;
                        userFollowedIds.add(otherUserId);
                        map[otherUserId] = uf.id;
                    }
                    setFollowedUserIds(userFollowedIds);
                    setUserFollowedMap(map);
                }
            } catch (error) {
                console.error('Failed to fetch user\'s user followed:', error);
                toast.error('Failed to load user\'s user followed.');
            }
        };

        if (userId) {
            fetchUserFollowedForUser();
        }

        fetchUserData();
        fetchUsers();
    }, [location, userId]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleShowRemoveFromFollowedModal = (otherUserId: string) => {
        setUnFollowUserId(otherUserId);
        setShowUnFollowModal(true);
    };

    const handleShowUserDetails = (user: UserDTO) => {
        setSelectedUser(user);
        setShowUserDetailsModal(true);
    };

    const handleRemoveFromFollowing = async () => {
        if (!userId || !unFollowUserId)
            return;

        try {
            const userFollId = userFollowedMap[unFollowUserId];
            if (!userFollId) {
                toast.error('Followed not found.');
                return;
            }
            await UserFollowService.removeUserFollow(userFollId);
            toast.success('User successfully unfollowed.');
            setShowUnFollowModal(false);
            setUnFollowUserId(null);
            // Refresh user unfollow only
            const _userUnfollow = await UserFollowService.getUserFollowedForUser(userId);
            const userUnfollowIds = new Set<string>();
            const map: Record<string, number> = {};
            for (const us of _userUnfollow) {
                const otherId = us.followerId === userId ? us.followedId : us.followerId;
                userUnfollowIds.add(otherId);
                map[otherId] = us.id;
            }
            setFollowedUserIds(userUnfollowIds);
            setUserFollowedMap(map);
        }
        catch (error) {
            console.error('Failed to unfollowing:', error);
            toast.error('Failed to unfollowing.');
        }
    };

    const handleCreateUserFollow = async (otherUserId: string) => {
        if (!userId)
            return;

        try {
            const dto: UserFollowCreateDTO = { followerId: userId, followedId: otherUserId };
            await UserFollowService.createUserFollow(dto);
            toast.success('User has been followed successfully.');
            // Refresh user followed only
            const _userFollowed = await UserFollowService.getUserFollowedForUser(userId);
            const friendIds = new Set<string>();
            const map: Record<string, number> = {};
            for (const us of _userFollowed) {
                const otherId = us.followerId === userId ? us.followedId : us.followerId;
                friendIds.add(otherId);
                map[otherId] = us.id;
            }
            setFollowedUserIds(friendIds);
            setUserFollowedMap(map);
        }
        catch (error) {
            console.error('Failed to follow a user:', error);
            toast.error('Failed to follow a user.');
        }
    };

    const handleOpenChat = async (otherUserId: string): Promise<number> => {
        if (!otherUserId || !userId)
            return 0;

        try {
            let chatId = await ChatService.getChatIdBetweenUsers(userId, otherUserId);

            if (chatId === 0) {
                const chatCreateDTO: ChatCreateDTO = {
                    user1Id: userId,
                    user2Id: otherUserId
                };

                await ChatService.createChat(chatCreateDTO);
                chatId = await ChatService.getChatIdBetweenUsers(userId, otherUserId);
            }
            return chatId;
        }
        catch (error) {
            console.error('Failed to open chat:', error);
            toast.error('Failed to open chat.');
            return 0;
        }
    };

    const moveToSpecificChatSignalRPage = async (otherUserId: string) => {
        const chatId = await handleOpenChat(otherUserId);
        if (!chatId) return;
        navigate(RoutePaths.chatSignalR(chatId), { state: { chatId } });
    };

    const moveToSpecificChatWSPage = async (otherUserId: string) => {
        const chatId = await handleOpenChat(otherUserId);
        if (!chatId) return;
        navigate(RoutePaths.chatWS(chatId), { state: { chatId } });
    };

    const moveToSpecificChatPollingPage = async (otherUserId: string) => {
        const chatId = await handleOpenChat(otherUserId);
        if (!chatId) return;
        navigate(RoutePaths.chatPolling(chatId), { state: { chatId } });
    };

    const moveToSpecificChatSSEPage = async (otherUserId: string) => {
        const chatId = await handleOpenChat(otherUserId);
        if (!chatId) return;
        navigate(RoutePaths.chatSSE(chatId), { state: { chatId } });
    };

    const searchUsers = (users: UserDTO[]) => {
        if (!searchTerm) {
            return users;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.firstName + ' ' + user.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
            user.location.toLowerCase().includes(lowerCaseSearchTerm)
        );
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
            case 'locationAsc':
                return [...users].sort((a, b) => a.location.localeCompare(b.location));
            case 'locationDesc':
                return [...users].sort((a, b) => b.location.localeCompare(a.location));
            default:
                return users;
        }
    };

    const searchedUsers = searchUsers(users);
    const sortedUsers = sortUsers(searchedUsers);
    const currentUserItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

    return (
        <div className="Community">
            <h1><i className="bi bi-people"></i> Community</h1>
            <p></p>
            <div className="d-flex align-items-center mb-3">
                {/* Search */}
                <div>
                    <Form.Label><strong>Search</strong></Form.Label>
                    <input
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
                        <option value="creationDateAsc">Creation Date Ascending</option>
                        <option value="creationDateDesc">Creation Date Descending</option>
                        <option value="firstNameAsc">First Name Ascending</option>
                        <option value="firstNameDesc">First Name Descending</option>
                        <option value="lastNameAsc">Last Name Ascending</option>
                        <option value="lastNameDesc">Last Name Descending</option>
                        <option value="locationAsc">Location Ascending</option>
                        <option value="locationDesc">Location Descending</option>
                    </Form.Select>
                </div>
            </div>
            <div className="user-grid">
                {currentUserItems.length > 0 ? (
                    currentUserItems.map((u, index) => (
                        <Card key={index} className="user-card">
                            <div className="user-card-header">
                                <div className="user-avatar">
                                    {`${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()}
                                </div>
                                <div className="user-header-text">
                                    <div className="user-name">{u.firstName} {u.lastName}</div>
                                    <div className="user-meta">
                                        <i className="bi bi-geo-alt"></i> {u.location} · Joined {TimeService.formatDateToEUR(u.creationDate)}
                                    </div>
                                </div>
                            </div>
                            <Card.Body>
                                <div className="user-actions">
                                    <Button
                                        variant="dark"
                                        className="button-spacing"
                                        title="Open user info"
                                        onClick={() => handleShowUserDetails(u)}
                                    >
                                        <i className="bi bi-info-square"></i>
                                        <span className="action-label"> Info</span>
                                    </Button>
                                    {u.id !== userId && (
                                        <>
                                            {followedUserIds.has(u.id) ? (
                                                <Button
                                                    variant="danger"
                                                    className="button-spacing"
                                                    title="Remove from friends"
                                                    onClick={() => handleShowRemoveFromFollowedModal(u.id)}
                                                >
                                                    <i className="bi bi-heart-fill"></i>
                                                    <span className="action-label"> Unfollow</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="light"
                                                    className="button-spacing"
                                                    title="Add to friends"
                                                    onClick={() => handleCreateUserFollow(u.id)}
                                                >
                                                    <i className="bi bi-heart"></i>
                                                    <span className="action-label"> Follow</span>
                                                </Button>
                                            )}
                                            <span className="actions-separator" />
                                            <Button
                                                variant="info"
                                                className="button-spacing"
                                                title="Open SignalR chat"
                                                onClick={() => moveToSpecificChatSignalRPage(u.id)}
                                            >
                                                <i className="bi bi-chat-fill"></i>
                                                <span className="action-label"> SignalR</span>
                                            </Button>
                                            <Button
                                                variant="warning"
                                                className="button-spacing"
                                                title="Open WebSockets chat"
                                                onClick={() => moveToSpecificChatWSPage(u.id)}
                                            >
                                                <i className="bi bi-chat-fill"></i>
                                                <span className="action-label"> WebSockets</span>
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="button-spacing"
                                                title="Open Polling chat"
                                                onClick={() => moveToSpecificChatPollingPage(u.id)}
                                            >
                                                <i className="bi bi-chat-fill"></i>
                                                <span className="action-label"> Polling</span>
                                            </Button>
                                            <Button
                                                variant="success"
                                                className="button-spacing"
                                                title="Open SSE chat"
                                                onClick={() => moveToSpecificChatSSEPage(u.id)}
                                            >
                                                <i className="bi bi-chat-fill"></i>
                                                <span className="action-label"> SSE</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    ))
                ) : (
                    <div className="no-users">No users available</div>
                )}
            </div>

            {/* Pagination */}
            <div className="pagination-container">
                <Pagination className="pagination-bluee">
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

            {/* Details of User */}
            <Modal size="lg" show={showUserDetailsModal} onHide={() => setShowUserDetailsModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>User Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <div className="user-details">
                            <div className="user-details__header">
                                <div className="user-details__avatar">
                                    {`${selectedUser.firstName?.[0] ?? ''}${selectedUser.lastName?.[0] ?? ''}`.toUpperCase()}
                                </div>
                                <div>
                                    <div className="user-details__name">{selectedUser.firstName} {selectedUser.lastName}</div>
                                    <div className="user-details__meta">
                                        <i className="bi bi-clock"></i> Joined {TimeService.formatDateToEUR(selectedUser.creationDate)}
                                    </div>
                                </div>
                            </div>
                            <div className="user-details__body">
                                <div className="user-details__row">
                                    <i className="bi bi-telephone"></i>
                                    <span className="user-details__label">Phone</span>
                                    <span className="user-details__value">{selectedUser.phoneNumber || '-'}</span>
                                </div>
                                <div className="user-details__row">
                                    <i className="bi bi-geo-alt"></i>
                                    <span className="user-details__label">Location</span>
                                    <span className="user-details__value">{selectedUser.location || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUserDetailsModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Unfollowing Modal */}
            <Modal show={showUnFollowModal} onHide={() => setShowUnFollowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to unfollow this user?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUnFollowModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleRemoveFromFollowing}>Unfollow</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Community;