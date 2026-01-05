import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AccountService from '../../services/api/AccountService';
import TimeService from '../../services/time/TimeService';
import ProblemService from '../../services/api/ProblemService';
import ChatService from '../../services/api/ChatService';
import Problem from '../../models/interfaces/Problem';
import ChatCreateDTO from '../../models/dtos/ChatCreateDTO';
import '../../App.css';
import '../../styles/admin/AdminSupport.css';

const AdminSupport = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>();
    const [unsolvedProblems, setUnsolvedProblems] = useState<Problem[]>([]);
    const [unsolvedProblemCount, setUnsolvedProblemCount] = useState<number>(0);
    const [solvedProblems, setSolvedProblems] = useState<Problem[]>([]);
    const [solvedProblemCount, setSolvedProblemCount] = useState<number>(0);
    const [showProblemDetailsModal, setShowProblemDetailsModal] = useState<boolean>(false);
    const [showCheckProblemSolvedModal, setShowCheckProblemSolvedModal] = useState<boolean>(false);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [problemToCheckSolved, setProblemToCheckSolved] = useState<Problem | null>(null);

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

        const fetchReportedProblems = async () => {
            try {
                const _unsolvedProblems = await ProblemService.getUnsolvedProblems();
                setUnsolvedProblems(_unsolvedProblems);

                const _unsolvedProblemCount = await ProblemService.getUnsolvedProblemCount();
                setUnsolvedProblemCount(_unsolvedProblemCount);

                const _solvedProblems = await ProblemService.getSolvedProblems();
                setSolvedProblems(_solvedProblems);

                const _solvedProblemCount = await ProblemService.getSolvedProblemCount();
                setSolvedProblemCount(_solvedProblemCount);
            }
            catch (error) {
                console.error('Failed to fetch reported problems:', error);
                toast.error('Failed to load reported problems.');
            }
        };

        fetchUserData();
        fetchReportedProblems();
    }, []);

    const handleShowProblemDetails = (problem: Problem) => {
        setSelectedProblem(problem);
        setShowProblemDetailsModal(true);
    };

    const handleShowCheckProblemSolvedModal = (problem: Problem) => {
        setProblemToCheckSolved(problem);
        setShowCheckProblemSolvedModal(true);
    };

    const handleCheckProblemSolved = async () => {
        if (!problemToCheckSolved || !userId)
            return;

        try {
            const updatedFormData = {
                ...problemToCheckSolved
            };

            await ProblemService.checkProblemSolved(problemToCheckSolved.id, updatedFormData);
            setShowCheckProblemSolvedModal(false);
            toast.success('Reported problem has been set to solved.');
            // Refresh data
            const _unsolvedProblems = await ProblemService.getUnsolvedProblems();
            setUnsolvedProblems(_unsolvedProblems);
            const _unsolvedProblemCount = await ProblemService.getUnsolvedProblemCount();
            setUnsolvedProblemCount(_unsolvedProblemCount);
            const _solvedProblems = await ProblemService.getSolvedProblems();
            setSolvedProblems(_solvedProblems);
            const _solvedProblemCount = await ProblemService.getSolvedProblemCount();
            setSolvedProblemCount(_solvedProblemCount);
        }
        catch (error) {
            console.error('Failed to set problem to solved:', error);
            toast.error('Failed to set problem to solved.');
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

    const getStatusName = (isSolved: boolean): string => {
        if (isSolved === true) {
            return 'Solved';
        }
        else {
            return 'Unsolved';
        }
    };

    const exportDataToCSV = async () => {
        await ProblemService.exportProblemsToCsv();
    };

    return (
        <div className="AdminSupport">
            <h1><i className="bi bi-cone-striped"></i> Reported Problems</h1>
            <p></p>
            <Button variant="success" onClick={exportDataToCSV}>
                <i className="bi bi-download"></i> Export to CSV
            </Button>
            <p></p>
            <Tabs defaultActiveKey="unsolved" id="problem-tabs" className="mb-3 custom-tabs">
                {/* Unsolved Problems*/}
                <Tab eventKey="unsolved" title="Unsolved Problems">
                    <h3><i className="bi bi-exclamation-diamond"></i> Unsolved problems</h3>
                    <h4>Count: <strong>{unsolvedProblemCount}</strong></h4>
                    <div className="table-responsive">
                        <Table striped bordered hover variant="light">
                            <thead className="table-primary">
                                <tr>
                                    <th>Received Date</th>
                                    <th>Status</th>
                                    <th>Requester</th>
                                    <th>Title</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {unsolvedProblems.length > 0 ? (
                                    unsolvedProblems.map((problem, index) => (
                                        <tr key={index}>
                                            <td>{TimeService.formatDateToEURWithHour(problem.creationDate)}</td>
                                            <td>
                                                {problem.isSolved === true && (
                                                    <i className="bi bi-check-circle-fill" style={{ color: 'green' }}></i>
                                                )}
                                                {problem.isSolved === false && (
                                                    <i className="bi bi-x-circle-fill" style={{ color: 'red' }}></i>
                                                )}
                                                {getStatusName(problem.isSolved)}
                                            </td>
                                            <td>{problem.requester.firstName} {problem.requester.lastName}</td>
                                            <td>{problem.title}</td>
                                            <td>
                                                <Button variant="dark" className="button-spacing" onClick={() => handleShowProblemDetails(problem)}>
                                                    <i className="bi bi-info-square"></i> Info
                                                </Button>
                                                {problem.isSolved === false && (
                                                    <>
                                                        <Button variant="success" className="button-spacing" onClick={() => handleShowCheckProblemSolvedModal(problem)}>
                                                            <i className="bi bi-check-lg"></i> Solved
                                                        </Button>
                                                    </>
                                                )}
                                                {problem.requesterId !== userId && (
                                                    <>
                                                        <span className="button-spacing">|</span>
                                                        <Button variant="info" onClick={() => handleOpenChat(problem.requesterId)}>
                                                            <i className="bi bi-chat-fill"></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center">No unsolved reported problem available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>

                {/* Solved Problems */}
                <Tab eventKey="solved" title="Solved Problems">
                    <h3><i className="bi bi-check2-circle"></i> Solved problems</h3>
                    <h4>Count: <strong>{solvedProblemCount}</strong></h4>
                    <div className="table-responsive">
                        <Table striped bordered hover variant="light">
                            <thead className="table-success">
                                <tr>
                                    <th>Received Date</th>
                                    <th>Status</th>
                                    <th>Requester</th>
                                    <th>Title</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {solvedProblems.length > 0 ? (
                                    solvedProblems.map((problem, index) => (
                                        <tr key={index}>
                                            <td>{TimeService.formatDateToEURWithHour(problem.creationDate)}</td>
                                            <td>
                                                {problem.isSolved === true && (
                                                    <i className="bi bi-check-circle-fill" style={{ color: 'green' }}></i>
                                                )}
                                                {problem.isSolved === false && (
                                                    <i className="bi bi-x-circle-fill" style={{ color: 'red' }}></i>
                                                )}
                                                {getStatusName(problem.isSolved)}
                                            </td>
                                            <td>{problem.requester.firstName} {problem.requester.lastName}</td>
                                            <td>{problem.title}</td>
                                            <td>
                                                <Button variant="dark" className="button-spacing" onClick={() => handleShowProblemDetails(problem)}>
                                                    <i className="bi bi-info-square"></i> Info
                                                </Button>
                                                {problem.requesterId !== userId && (
                                                    <>
                                                        <span className="button-spacing">|</span>
                                                        <Button variant="info" onClick={() => handleOpenChat(problem.requesterId)}>
                                                            <i className="bi bi-chat-fill"></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center">No solved reported problem available</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
            </Tabs>

            {/* Details of Unsolved problem */}
            <Modal size="lg" show={showProblemDetailsModal} onHide={() => setShowProblemDetailsModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Problem Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedProblem && (
                        <div className="modal-content-centered">
                            <p><Form.Label className="problem-name-label">{(selectedProblem.requester.firstName).toUpperCase()} {(selectedProblem.requester.lastName).toUpperCase()}</Form.Label></p>
                            <p><Form.Label className="problem-title-label">{selectedProblem.title}</Form.Label></p>
                            <Form.Label className="problem-section">PROBLEM INFO</Form.Label>
                            <p><strong>Received Date</strong> {TimeService.formatDateToEURWithHour(selectedProblem.creationDate)}</p>
                            <p>
                                <strong>Problem status: </strong>
                                {selectedProblem.isSolved === true && (
                                    <i className="bi bi-check-circle-fill" style={{ color: 'green' }}></i>
                                )}
                                {selectedProblem.isSolved === false && (
                                    <i className="bi bi-x-circle-fill" style={{ color: 'red' }}></i>
                                )}
                                {getStatusName(selectedProblem.isSolved)}
                            </p>
                            <Form.Label className="problem-section">DETAILS</Form.Label>
                            <p><strong>Title:</strong> {selectedProblem.title}</p>
                            <p><strong>Description:</strong> {selectedProblem.description}</p>
                            <Form.Label className="problem-section">REQUESTED FROM</Form.Label>
                            <p><strong>Name:</strong> {selectedProblem.requester.firstName} {selectedProblem.requester.lastName}</p>
                            <p><strong>E-mail:</strong> {selectedProblem.requester.email}</p>
                            <p><strong>Phone number:</strong> {selectedProblem.requester.phoneNumber}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProblemDetailsModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Check problem to solved */}
            <Modal show={showCheckProblemSolvedModal} onHide={() => setShowCheckProblemSolvedModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm action</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to check this problem as solved?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCheckProblemSolvedModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={handleCheckProblemSolved}>Accept</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default AdminSupport;