import React, { useState, useEffect } from 'react';
import { Form, Button, Col, Row, Container } from 'react-bootstrap';
import { toast } from 'react-toastify';
import AccountService from '../../services/api/AccountService';
import ProblemService from '../../services/api/ProblemService';
import ProblemCreateDTO from '../../models/dtos/ProblemCreateDTO';
import '../../App.css';
import '../../styles/support/Support.css';

const Support = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [problemCreateDTO, setProblemCreateDTO] = useState<ProblemCreateDTO>({
        title: '',
        description: '',
        requesterId: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = await AccountService.getId();
                setUserId(userId);
            } 
            catch (error) {
                console.error('Failed to fetch userId:', error);
                toast.error('Failed to load userId.');
            }
        };

        fetchUserData();
    }, []);

    const handleReportProblem = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) return;

        const validationError = validateForm(problemCreateDTO);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            const createFormData = { ...problemCreateDTO, requesterId: userId };
            await ProblemService.createProblem(createFormData);
            setIsSubmitted(true);
        } 
        catch (error) {
            console.error('Failed to report problem:', error);
            toast.error('Failed to report problem.');
        }
    };

    const validateForm = (formData: ProblemCreateDTO) => {
        const { title, description } = formData;

        if (!title || !description) 
            return 'All fields are required.';

        return null;
    };

    return (
        <div className="Support">
            <h1><i className="bi bi-wrench-adjustable"></i> Support</h1>
            <p></p>
            <h3>Report a problem/request</h3>

            {!isSubmitted ? (
                <div className="forms-container">
                    <Container>
                        <Row className="justify-content-md-center">
                            <Col md="6">
                                <Form onSubmit={handleReportProblem}>
                                    <Form.Group className="mb-3" controlId="formTitle">
                                        <Form.Label className="white-label">Title</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Title"
                                            value={problemCreateDTO.title}
                                            onChange={(e) => setProblemCreateDTO({ ...problemCreateDTO, title: e.target.value })}
                                            maxLength={30}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3" controlId="formDescription">
                                        <Form.Label className="white-label">Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            placeholder="Description"
                                            value={problemCreateDTO.description}
                                            onChange={(e) => setProblemCreateDTO({ ...problemCreateDTO, description: e.target.value })}
                                            maxLength={500}
                                            required
                                        />
                                    </Form.Group>
                                    <Button variant="info" className="mb-3" type="submit">
                                        <i className="bi bi-flag-fill"></i>
                                        Submit
                                    </Button>
                                </Form>
                            </Col>
                        </Row>
                    </Container>
                </div>
            ) : (
                <div className="success-container">
                    <h5 style={{ color: 'green' }}>Problem/request has been reported successfully!</h5>
                    <i className="bi bi-check-circle-fill" style={{ color: 'green' }}></i>
                    <p></p>
                    <h6><strong>We will try to solve the problem ASAP and contact you if necessary.</strong></h6>
                </div>
            )}
        </div>
    );
};

export default Support;