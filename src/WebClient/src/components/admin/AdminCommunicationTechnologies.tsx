import React, { useEffect, useState } from 'react';
import { Table, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import CommunicationTechnologyService from '../../services/api/CommunicationTechnologyService';
import CommunicationTechnology from '../../models/interfaces/CommunicationTechnology';
import CommunicationTechnologyCreateDTO from '../../models/dtos/CommunicationTechnologyCreateDTO';
import '../../App.css';
import '../../styles/admin/AdminCommunicationTechnologies.css';

const AdminCommunicationTechnologies = () => {
    const [communicationTechnologies, setCommunicationTechnologies] = useState<CommunicationTechnology[]>([]);
    const [communicationTechnologyCount, setCommunicationTechnologyCount] = useState<number>(0);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [createTechnologyForm, setCreateTechnologyForm] = useState<CommunicationTechnologyCreateDTO>({
        name: '',
    }
    );

    useEffect(() => {
        const fetchTechnologyData = async () => {
            try {
                const _communicationTechnologies = await CommunicationTechnologyService.getCommunicationTechnologies();
                setCommunicationTechnologies(_communicationTechnologies);

                const _communicationTechnologiesCount = await CommunicationTechnologyService.getCommunicationTechnologyCount();
                setCommunicationTechnologyCount(_communicationTechnologiesCount);
            }
            catch (error) {
                console.error('Failed to fetch communication technology data:', error);
                toast.error('Failed to load communication technology data.');
            }
        };

        fetchTechnologyData();
    }, []);

    const handleCreateTechnology = async () => {
        if (!createTechnologyForm.name) {
            toast.error('Communication technology name field is required!');
            return;
        }

        try {
            let isExists = await CommunicationTechnologyService.checkCommunicationTechnologyExists(createTechnologyForm.name);
            if (isExists === true) {
                toast.error('Communication technology name already exists.');
                return;
            }
            else {
                await CommunicationTechnologyService.createCommunicationTechnology(createTechnologyForm);
                setShowCreateModal(false);
                toast.success('Communication technology created successfully!');
                // Refresh the user data
                const _communicationTechnologies = await CommunicationTechnologyService.getCommunicationTechnologies();
                setCommunicationTechnologies(_communicationTechnologies);
                const _communicationTechnologiesCount = await CommunicationTechnologyService.getCommunicationTechnologyCount();
                setCommunicationTechnologyCount(_communicationTechnologiesCount);
            }
        }
        catch (error) {
            console.error('Failed to create new communication technology:', error);
            toast.error('Failed to create new communication technology.');
        }
    };

    return (
        <div className="AdminCommunicationTechnologies">
            <h1><i className="bi bi-tools"></i> Real-Time Communication Technologies</h1>
            <p></p>
            <h3>Count: <strong>{communicationTechnologyCount}</strong></h3>
            <p></p>
            <Button variant="primary" className="form-button" onClick={() => setShowCreateModal(true)}>
                <i className="bi bi-file-earmark-plus"></i>
                Add New Technology
            </Button>
            <p></p>
            <div className="table-responsive">
                <Table striped bordered hover variant="secondary">
                    <thead className="table-dark">
                        <tr>
                            <th>Communication Technology</th>
                        </tr>
                    </thead>
                    <tbody>
                        {communicationTechnologies.length > 0 ? (
                            communicationTechnologies.map((technology, index) => (
                                <tr key={index}>
                                    <td>{technology.name}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="text-center">No communication technologies available</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Create Technology Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Create New Communication Technology</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group as={Row} controlId="formPositionName">
                            <Form.Label column sm="3">Name</Form.Label>
                            <Col sm="9">
                                <Form.Control
                                    type="text"
                                    placeholder="Techonology Name"
                                    value={createTechnologyForm.name}
                                    onChange={(e) => setCreateTechnologyForm({ ...createTechnologyForm, name: e.target.value })}
                                    maxLength={30}
                                    required
                                />
                            </Col>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleCreateTechnology}>Add</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default AdminCommunicationTechnologies;