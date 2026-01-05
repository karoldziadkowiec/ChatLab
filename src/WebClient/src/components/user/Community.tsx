import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Pagination, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import UserService from '../../services/api/UserService';
import ChatService from '../../services/api/ChatService';
import UserFollowService from '../../services/api/UserFollowService';
import TimeService from '../../services/time/TimeService';
import UserDTO from '../../models/dtos/UserDTO';
import UserFollow from '../../models/interfaces/UserFollow';
import UserFollowCreateDTO from '../../models/dtos/UserFollowCreateDTO';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/user/Community.css';

const Community = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [chosenUser, setChosenUser] = useState<UserDTO | null>(null);
    const [isAdminRole, setIsAdminRole] = useState<boolean | null>(null);
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [userFollowers, setUserFollowers] = useState<UserFollow[]>([]);
    const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
    const [userFollowersMap, setUserFollowersMap] = useState<Record<string, number>>({});
    const [showUnFollowModal, setShowUnFollowModal] = useState<boolean>(false);
    const [unFollowUserId, setUnFollowUserId] = useState<string | null>(null);
    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
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

                    const isAdmin = await AccountService.isRoleAdmin();
                    setIsAdminRole(isAdmin);
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

        const fetchUserFollowers = async () => {
            try {
                if (userId) {
                    const _userFollowers = await UserService.getUserFollowersForUser(userId);
                    setUserFollowers(_userFollowers);

                    const userFollowersIds = new Set<string>();
                    const map: Record<string, number> = {};
                    for (const us of _userFollowers) {
                        const otherId = us.followerId === userId ? us.followedId : us.followerId;
                        userFollowersIds.add(otherId);
                        map[otherId] = us.id;
                    }
                    setFollowedUserIds(userFollowersIds);
                    setUserFollowersMap(map);
                }
            } catch (error) {
                console.error('Failed to fetch user followers:', error);
                toast.error('Failed to load user followers.');
            }
        };

        if (userId) {
            fetchUserFollowers();
        }

        fetchUserData();
        fetchUsers();
    }, [location, userId]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
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

    const handleShowRemoveFromFriendsModal = (otherUserId: string) => {
        setUnFollowUserId(otherUserId);
        setShowUnFollowModal(true);
    };

    const handleRemoveFromFollowing = async () => {
        if (!userId || !unFollowUserId)
            return;

        try {
            const userFollId = userFollowersMap[unFollowUserId];
            if (!userFollId) {
                toast.error('Following not found.');
                return;
            }
            await UserFollowService.removeUserFollow(userFollId);
            toast.success('Successfully unfollowed.');
            setShowUnFollowModal(false);
            setUnFollowUserId(null);
            // Refresh user unfollow only
            const _userUnfollow = await UserService.getUserFollowersForUser(userId);
            setUserFollowers(_userUnfollow);
            const userUnfollowIds = new Set<string>();
            const map: Record<string, number> = {};
            for (const us of _userUnfollow) {
                const otherId = us.followerId === userId ? us.followedId : us.followerId;
                userUnfollowIds.add(otherId);
                map[otherId] = us.id;
            }
            setFollowedUserIds(userUnfollowIds);
            setUserFollowersMap(map);
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
            // Refresh user followers only
            const _userFollowers = await UserService.getUserFollowersForUser(userId);
            setUserFollowers(_userFollowers);
            const friendIds = new Set<string>();
            const map: Record<string, number> = {};
            for (const us of _userFollowers) {
                const otherId = us.followerId === userId ? us.followedId : us.followerId;
                friendIds.add(otherId);
                map[otherId] = us.id;
            }
            setFollowedUserIds(friendIds);
            setUserFollowersMap(map);
        }
        catch (error) {
            console.error('Failed to follow a user:', error);
            toast.error('Failed to follow a user.');
        }
    };

    const handleOpenChat = async (otherUserId: string) => {
        if (!otherUserId || !userId)
            return;

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
            user.location.toLowerCase().includes(lowerCaseSearchTerm) ||
            user.phoneNumber.toLowerCase().includes(lowerCaseSearchTerm)
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
            case 'phoneNumberAsc':
                return [...users].sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber));
            case 'phoneNumberDesc':
                return [...users].sort((a, b) => b.phoneNumber.localeCompare(a.phoneNumber));
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
                        <option value="phoneNumberAsc">Phone Number Ascending</option>
                        <option value="phoneNumberDesc">Phone Number Descending</option>
                    </Form.Select>
                </div>
            </div>
            <div className="table-responsive">
                <Table striped bordered hover variant="light">
                    <thead className="table-dark">
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Phone Number</th>
                            <th>Join Date</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentUserItems.length > 0 ? (
                            currentUserItems.map((user, index) => (
                                <tr key={index}>
                                    <td className="ad-row">{user.firstName} {user.lastName}</td>
                                    <td className="ad-row">{user.location}</td>
                                    <td className="ad-row">{user.phoneNumber}</td>
                                    <td className="ad-row">{TimeService.formatDateToEUR(user.creationDate)}</td>
                                    <td className="ad-row">
                                        {user.id !== userId && (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    className="button-spacing"
                                                    title="Open chat"
                                                    onClick={() => handleOpenChat(user.id)}
                                                >
                                                    <i className="bi bi-chat-dots"></i>
                                                </Button>
                                                {followedUserIds.has(user.id) ? (
                                                    <Button
                                                        variant="danger"
                                                        title="Remove from friends"
                                                        onClick={() => handleShowRemoveFromFriendsModal(user.id)}
                                                    >
                                                        <i className="bi bi-person-dash"></i>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="success"
                                                        title="Add to friends"
                                                        onClick={() => handleCreateUserFollow(user.id)}
                                                    >
                                                        <i className="bi bi-person-plus"></i>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center">No users available</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="pagination-container">
                <Pagination className="pagination-green">
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

            {/* Unfollowing Modal */}
            <Modal show={showUnFollowModal} onHide={() => setShowUnFollowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to unfollow this user?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUnFollowModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleRemoveFromFollowing}>Remove</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Community;