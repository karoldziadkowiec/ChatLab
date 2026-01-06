import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Pagination, Form, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import ChatService from '../../services/api/ChatService';
import UserFollowService from '../../services/api/UserFollowService';
import TimeService from '../../services/time/TimeService';
import UserDTO from '../../models/dtos/UserDTO';
import UserFollow from '../../models/interfaces/UserFollow';
import UserFollowCreateDTO from '../../models/dtos/UserFollowCreateDTO';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/user/MyFriends.css';

const MyFriends = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);
    const [onlyFollowers, setOnlyFollowers] = useState<UserFollow[]>([]);
    const [onlyFollowersCount, setOnlyFollowersCount] = useState<number>(0);
    const [onlyFollowed, setOnlyFollowed] = useState<UserFollow[]>([]);
    const [onlyFollowedCount, setOnlyFollowedCount] = useState<number>(0);
    const [showUserDetailsModal, setShowUserDetailsModal] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
    const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
    const [userFollowedMap, setUserFollowedMap] = useState<Record<string, number>>({});
    const [showUnFollowModal, setShowUnFollowModal] = useState<boolean>(false);
    const [unFollowUserId, setUnFollowUserId] = useState<string | null>(null);

    // Searching term
    const [searchTerm, setSearchTerm] = useState('');
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const refreshFollowData = async () => {
        try {
            if (!userId) return;
            const _onlyFollowed = await UserFollowService.getUserFollowedForUser(userId);
            setOnlyFollowed(_onlyFollowed);
            const _onlyFollowers = await UserFollowService.getUserFollowersForUser(userId);
            setOnlyFollowers(_onlyFollowers);

            const ids = new Set<string>();
            const map: Record<string, number> = {};
            for (const uf of _onlyFollowed) {
                ids.add(uf.followed.id);
                map[uf.followed.id] = uf.id;
            }
            setFollowedUserIds(ids);
            setUserFollowedMap(map);

            // Update counts
            try {
                const _onlyFollowedCount = await UserFollowService.getUserFollowedForUserCount(userId);
                setOnlyFollowedCount(_onlyFollowedCount);
                const _onlyFollowersCount = await UserFollowService.getUserFollowersForUserCount(userId);
                setOnlyFollowersCount(_onlyFollowersCount);
            } catch {  }
        }
        catch (error) {
            console.error('Failed to load follow data:', error);
            toast.error('Failed to load follow data.');
        }
    };

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

        fetchUserData();
        refreshFollowData();
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
            // Refresh both tabs data and mapping
            await refreshFollowData();
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
            // Refresh both tabs data and mapping
            await refreshFollowData();
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

    const searchUsers = (userFollowers: UserFollow[]) => {
        if (!searchTerm) {
            return userFollowers;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return userFollowers.filter(userFollow =>
            (userFollow.followed.firstName + ' ' + userFollow.followed.lastName).toLowerCase().includes(lowerCaseSearchTerm) ||
            userFollow.followed.location.toLowerCase().includes(lowerCaseSearchTerm)
        );
    };

    const searchedUsers = searchUsers(onlyFollowed);
    const currentFollowed = searchedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(searchedUsers.length / itemsPerPage);

    return (
        <div className="MyFriends">
            <h1><i className="bi bi-people-fill"></i> My Friends</h1>
            <p></p>
            <Tabs defaultActiveKey="followed" id="user-tabs" className="mb-3 custom-tabs">
                {/* Followed */}
                <Tab eventKey="followed" title={`Followed (${onlyFollowedCount})`}>
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
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Location</th>
                                    <th>Join Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentFollowed.length > 0 ? (
                                    currentFollowed.map((user, index) => (
                                        <tr key={index}>
                                            <td className="person-row">{user.followed.firstName}</td>
                                            <td className="person-row">{user.followed.lastName}</td>
                                            <td className="person-row">{user.followed.location}</td>
                                            <td className="person-row">{TimeService.formatDateToEUR(user.followed.creationDate)}</td>
                                            <td className="align-middle">
                                                {user.followed.id !== userId && (
                                                    <>
                                                        <Button
                                                            variant="dark"
                                                            className="button-spacing"
                                                            title="Open user info"
                                                            onClick={() => handleShowUserDetails(user.followed)}
                                                        >
                                                            <i className="bi bi-info-square"></i>
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            className="button-spacing"
                                                            title="Remove from friends"
                                                            onClick={() => handleShowRemoveFromFollowedModal(user.followed.id)}
                                                        >
                                                            <i className="bi bi-heart-fill"></i>
                                                        </Button>
                                                        <span className="button-spacing">|</span>
                                                        <Button
                                                            variant="info"
                                                            className="button-spacing"
                                                            title="Open SignalR chat"
                                                            onClick={() => moveToSpecificChatSignalRPage(user.followed.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                SignalR
                                                        </Button>
                                                        <Button
                                                            variant="warning"
                                                            className="button-spacing"
                                                            title="Open WebSockets chat"
                                                            onClick={() => moveToSpecificChatWSPage(user.followed.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                WebSockets
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            className="button-spacing"
                                                            title="Open Polling chat"
                                                            onClick={() => moveToSpecificChatPollingPage(user.followed.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                Polling
                                                        </Button>
                                                        <Button
                                                            variant="success"
                                                            className="button-spacing"
                                                            title="Open SSE chat"
                                                            onClick={() => moveToSpecificChatSSEPage(user.followed.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                SSE
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
                </Tab>

                {/* Followers */}
                <Tab eventKey="followers" title={`Followers (${onlyFollowersCount})`}>
                    <div className="table-responsive">
                        <Table striped bordered hover variant="light">
                            <thead className="table-dark">
                                <tr>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Location</th>
                                    <th>Join Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {onlyFollowers.length > 0 ? (
                                    onlyFollowers.map((user, index) => (
                                        <tr key={index}>
                                            <td className="person-row">{user.follower.firstName}</td>
                                            <td className="person-row">{user.follower.lastName}</td>
                                            <td className="person-row">{user.follower.location}</td>
                                            <td className="person-row">{TimeService.formatDateToEUR(user.follower.creationDate)}</td>
                                            <td className="align-middle">
                                                {user.follower.id !== userId && (
                                                    <>
                                                        <Button
                                                            variant="dark"
                                                            className="button-spacing"
                                                            title="Open user info"
                                                            onClick={() => handleShowUserDetails(user.follower)}
                                                        >
                                                            <i className="bi bi-info-square"></i>
                                                        </Button>
                                                        {followedUserIds.has(user.follower.id) ? (
                                                            <Button
                                                                variant="danger"
                                                                className="button-spacing"
                                                                title="Remove from friends"
                                                                onClick={() => handleShowRemoveFromFollowedModal(user.follower.id)}
                                                            >
                                                                <i className="bi bi-heart-fill"></i>
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="success"
                                                                className="button-spacing"
                                                                title="Add to friends"
                                                                onClick={() => handleCreateUserFollow(user.follower.id)}
                                                            >
                                                                <i className="bi bi-heart"></i>
                                                            </Button>
                                                        )}
                                                        <span>| </span>
                                                        <Button
                                                            variant="info"
                                                            className="button-spacing"
                                                            title="Open SignalR chat"
                                                            onClick={() => moveToSpecificChatSignalRPage(user.follower.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                SignalR
                                                        </Button>
                                                        <Button
                                                            variant="warning"
                                                            className="button-spacing"
                                                            title="Open WebSockets chat"
                                                            onClick={() => moveToSpecificChatWSPage(user.follower.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                WebSockets
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            className="button-spacing"
                                                            title="Open Polling chat"
                                                            onClick={() => moveToSpecificChatPollingPage(user.follower.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                Polling
                                                        </Button>
                                                        <Button
                                                            variant="success"
                                                            className="button-spacing"
                                                            title="Open SSE chat"
                                                            onClick={() => moveToSpecificChatSSEPage(user.follower.id)}
                                                        >
                                                            <i className="bi bi-chat-fill"></i>
                                                                SSE
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

            {/* Details of User */}
            <Modal size="lg" show={showUserDetailsModal} onHide={() => setShowUserDetailsModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>User Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <div className="modal-content-centered">
                            <p>
                                <Form.Label className="name-label">
                                    {(selectedUser.firstName + ' ' + selectedUser.lastName)}
                                </Form.Label>
                            </p>
                            <Form.Label className="info-section">BASIC INFO</Form.Label>
                            <p><strong>Phone Number:</strong> {selectedUser.phoneNumber}</p>
                            <p><strong>Location:</strong> {selectedUser.location}</p>
                            <p><strong>Join Date:</strong> {TimeService.formatDateToEUR(selectedUser.creationDate)}</p>
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

export default MyFriends;