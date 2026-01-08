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
    const TITLE_MAX = 30;
    const DESC_MAX = 500;

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

    const titleLeft = TITLE_MAX - (problemCreateDTO.title?.length || 0);
    const descLeft = DESC_MAX - (problemCreateDTO.description?.length || 0);

    return (
        <div className="Support">
            <h1><i className="bi bi-wrench-adjustable"></i> Support</h1>
            <p className="support-subtitle">Report a problem or request - we’ll get back to you ASAP.</p>

            {!isSubmitted ? (
                <div className="support-card">
                    <div className="support-card_header">
                        <div className="support-card_icon"><i className="bi bi-life-preserver"></i></div>
                        <div>
                            <div className="support-card__title">New Report</div>
                            <div className="support-card__meta">Provide a clear title and a brief description.</div>
                        </div>
                    </div>
                    <div className="support-card__body">
                        <Container>
                            <Row className="justify-content-md-center">
                                <Col md="8">
                                    <Form onSubmit={handleReportProblem} aria-label="Support form">
                                        <Form.Group className="mb-3" controlId="formTitle">
                                            <Form.Label>Title</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Title"
                                                value={problemCreateDTO.title}
                                                onChange={(e) => setProblemCreateDTO({ ...problemCreateDTO, title: e.target.value })}
                                                maxLength={TITLE_MAX}
                                                required
                                                aria-describedby="titleHelp"
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3" controlId="formDescription">
                                            <Form.Label>Description</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                placeholder="Description"
                                                rows={6}
                                                value={problemCreateDTO.description}
                                                onChange={(e) => setProblemCreateDTO({ ...problemCreateDTO, description: e.target.value })}
                                                maxLength={DESC_MAX}
                                                required
                                                aria-describedby="descHelp"
                                            />
                                        </Form.Group>
                                        <div className="support-actions">
                                            <Button variant="info" type="submit" className="support-submit">
                                                <i className="bi bi-flag-fill"></i>
                                                <span> Submit</span>
                                            </Button>
                                        </div>
                                    </Form>
                                </Col>
                            </Row>
                        </Container>
                    </div>
                </div>
            ) : (
                <div className="support-success">
                    <div className="support-success__icon"><i className="bi bi-check-circle-fill"></i></div>
                    <div className="support-success__title">Submitted successfully</div>
                    <div className="support-success__meta">We’ll review your report and contact you if needed.</div>
                </div>
            )}
        </div>
    );
};

export default Support;