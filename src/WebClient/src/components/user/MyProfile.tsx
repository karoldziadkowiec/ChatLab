import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { RoutePaths } from '../../routes/RoutePaths';
import AccountService from '../../services/api/AccountService';
import UserService from '../../services/api/UserService';
import TimeService from '../../services/time/TimeService';
import UserDTO from '../../models/dtos/UserDTO';
import UserUpdateDTO from '../../models/dtos/UserUpdateDTO';
import UserResetPasswordDTO from '../../models/dtos/UserResetPasswordDTO';
import '../../App.css';
import '../../styles/user/MyProfile.css';

const MyProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserDTO | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAdminRole, setIsAdminRole] = useState<boolean | null>(null);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
    const [updateFormData, setUpdateFormData] = useState<UserUpdateDTO>({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        location: ''
    });
    const [resetPasswordFormData, setResetPasswordFormData] = useState<UserResetPasswordDTO>({
        passwordHash: '',
        confirmPasswordHash: ''
    });
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = await AccountService.getId();
                if (await AccountService.isRoleAdmin())
                    setIsAdminRole(true);
                else
                    setIsAdminRole(false);

                if (userId) {
                const userData = await UserService.getUser(userId);
                setUser(userData);

                setUpdateFormData({
                    ...userData
                });
            }
        }
            catch (error) {
            console.error('Failed to fetch user data:', error);
            toast.error('Failed to load user data.');
        }
        finally {
            setLoading(false);
        }
    };

    fetchUserData();
}, []);

const handleEditProfile = async () => {
    if (!user)
        return;

    const validationError = validateEditForm();
    if (validationError) {
        toast.error(validationError);
        return;
    }

    try {
        await UserService.updateUser(user.id, updateFormData);
        setShowEditModal(false);
        toast.success('Profile updated successfully!');
        // Refresh the user data
        const updatedUser = await UserService.getUser(user.id);
        setUser(updatedUser);
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

const handleResetPassword = async () => {
    if (!user)
        return;

    const validationError = validateResetPasswordForm();
    if (validationError) {
        toast.error(validationError);
        return;
    }

    try {
        await UserService.resetUserPassword(user.id, resetPasswordFormData);
        setShowResetPasswordModal(false);
        toast.success('Password updated successfully! Try to log in with new password.');
        navigate(RoutePaths.login());
    }
    catch (error) {
        console.error('Failed to update user\'s password:', error);
        toast.error('Failed to update user\'s password.');
    }
};

const validateResetPasswordForm = () => {
    const { passwordHash, confirmPasswordHash } = resetPasswordFormData;

    // Checking empty fields
    if (!passwordHash || !confirmPasswordHash)
        return 'All fields are required.';

    // Checking phone number length
    if (passwordHash.length < 7 || confirmPasswordHash.length < 7)
        return 'Password must contain minimum 7 digits.';

    // Passwords matcher
    if (passwordHash !== confirmPasswordHash)
        return 'New passwords do not match.';

    // Password validation
    const passwordError = passwordValidator(passwordHash);
    if (passwordError)
        return passwordError;

    return null;
};

const passwordValidator = (password: string): string | null => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/;
    if (!passwordRegex.test(password))
        return 'Password must be at least 7 characters long, contain at least one uppercase letter, one number, and one special character.';

    return null;
};

const handleDeleteProfile = async () => {
    if (!user)
        return;

    try {
        await UserService.deleteUser(user.id);
        toast.success('Your account has been deleted successfully.');
        navigate(RoutePaths.login());
    }
    catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete user.');
    }
};

if (loading)
    return <p>Loading...</p>;

return (
    <div className="MyProfile">
        <h1><i className="bi bi-person-fill"></i> My Profile</h1>
        <div className="buttons-container mb-3">
            <Row>
                <Col>
                    <Button variant="info" className="form-button" onClick={() => setShowEditModal(true)}>
                        <i className="bi bi-pencil-square"></i>
                        Edit profile
                    </Button>
                </Col>
                <Col>
                    <Button variant="secondary" className="form-button" onClick={() => setShowResetPasswordModal(true)}>
                        <i className="bi bi-key"></i>
                        Reset password
                    </Button>
                </Col>
                {isAdminRole === false ? (
                <Col>
                    <Button variant="danger" className="form-button" onClick={() => setShowDeleteModal(true)}>
                        <i className="bi bi-trash"></i>
                        Delete profile
                    </Button>
                </Col>
                ) : (
                    <p></p>
                )}
            </Row>
        </div>
        <div className="data-container">
            {user && (
                <div>
                    <p><Form.Label className="white-label">E-mail: </Form.Label>
                        <Form.Label className="email-label"> {user.email}</Form.Label></p>
                    <p><Form.Label className="white-label">First Name: </Form.Label>
                        <Form.Label className="blue-label"> {user.firstName}</Form.Label></p>
                    <p><Form.Label className="white-label">Last Name: </Form.Label>
                        <Form.Label className="blue-label"> {user.lastName}</Form.Label></p>
                    <p><Form.Label className="white-label">Phone Number: </Form.Label>
                        <Form.Label className="blue-label"> {user.phoneNumber}</Form.Label></p>
                    <p><Form.Label className="white-label">Location: </Form.Label>
                        <Form.Label className="blue-label"> {user.location}</Form.Label></p>
                    <p><Form.Label className="white-label">Creation Date: </Form.Label>
                        <Form.Label className="blue-label"> {TimeService.formatDateToEURWithHour(user.creationDate)}</Form.Label></p>
                </div>
            )}
        </div>

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
                <Button variant="success" onClick={handleEditProfile}>Save Changes</Button>
            </Modal.Footer>
        </Modal>

        {/* Reset Password Modal */}
        <Modal show={showResetPasswordModal} onHide={() => setShowResetPasswordModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Reset Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formPasswordHash">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="PasswordHash"
                            value={resetPasswordFormData.passwordHash}
                            onChange={(e) => setResetPasswordFormData({ ...resetPasswordFormData, passwordHash: e.target.value })}
                            minLength={7}
                            maxLength={30}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="formConfirmPasswordHash">
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="ConfirmPasswordHash"
                            value={resetPasswordFormData.confirmPasswordHash}
                            onChange={(e) => setResetPasswordFormData({ ...resetPasswordFormData, confirmPasswordHash: e.target.value })}
                            minLength={7}
                            maxLength={30}
                            required
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowResetPasswordModal(false)}>Cancel</Button>
                <Button variant="success" onClick={handleResetPassword}>Save Changes</Button>
            </Modal.Footer>
        </Modal>

        {/* Delete Profile Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Confirm action</Modal.Title>
            </Modal.Header>
            <Modal.Body>Are you sure you want to delete your profile?</Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteProfile}>Delete Profile</Button>
            </Modal.Footer>
        </Modal>
    </div>
);
}

export default MyProfile;