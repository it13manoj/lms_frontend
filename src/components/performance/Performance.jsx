import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Badge, Button, Spinner,
  Alert, Form, Modal, ProgressBar
} from 'react-bootstrap';
import {
  FaChartLine, FaStar, FaUser, FaCalendar,
  FaPlus, FaEdit, FaTrash, FaEye, FaDownload
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Performance.css';

const Performance = () => {
  const { user } = useAuth();
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchPerformances();
    fetchStats();
  }, []);

  const fetchPerformances = async () => {
    try {
      setLoading(true);
      const response = await api.get('/performance');
      setPerformances(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/performance/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const getRatingBadge = (rating) => {
    const variants = {
      5: 'success',
      4: 'primary',
      3: 'warning',
      2: 'danger',
      1: 'danger'
    };
    return <Badge bg={variants[rating] || 'secondary'}>⭐ {rating}/5</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      submitted: 'warning',
      reviewed: 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getAverageRating = () => {
    if (!performances.length) return 0;
    const total = performances.reduce((sum, p) => sum + (p.rating || 0), 0);
    return (total / performances.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="performance-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Performance Reviews</h2>
          <p className="text-muted">Track and manage employee performance</p>
        </div>
        {(isAdminOrHR || isManager) && (
          <Button variant="primary" onClick={() => {
            setSelectedPerformance(null);
            setEditing(false);
            setShowModal(true);
          }}>
            <FaPlus className="me-2" />
            New Review
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <h6 className="text-muted">Total Reviews</h6>
              <h3>{performances.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-primary bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Average Rating</h6>
              <h3>{getAverageRating()}</h3>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar 
                    key={star} 
                    className={star <= getAverageRating() ? 'text-warning' : 'text-muted'} 
                  />
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-success bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Reviewed</h6>
              <h3>{performances.filter(p => p.status === 'reviewed').length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-warning bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Pending Review</h6>
              <h3>{performances.filter(p => p.status === 'submitted').length}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Performance List */}
      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Review Date</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {performances.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <h5>No performance reviews found</h5>
                  </td>
                </tr>
              ) : (
                performances.map((perf) => (
                  <tr key={perf.id}>
                    <td>
                      <div className="employee-info">
                        <FaUser className="text-primary me-2" />
                        {perf.employee_name || 'N/A'}
                      </div>
                    </td>
                    <td>{new Date(perf.review_date).toLocaleDateString()}</td>
                    <td>{perf.rating ? getRatingBadge(perf.rating) : 'Not rated'}</td>
                    <td>{getStatusBadge(perf.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <Button variant="outline-info" size="sm">
                          <FaEye />
                        </Button>
                        {(isAdminOrHR || isManager) && (
                          <>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedPerformance(perf);
                                setEditing(true);
                                setShowModal(true);
                              }}
                            >
                              <FaEdit />
                            </Button>
                            <Button variant="outline-danger" size="sm">
                              <FaTrash />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editing ? 'Edit Performance Review' : 'New Performance Review'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Employee</Form.Label>
              <Form.Select>
                <option value="">Select employee</option>
                <option value="1">John Doe</option>
                <option value="2">Jane Smith</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Review Date</Form.Label>
              <Form.Control type="date" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rating</Form.Label>
              <Form.Select>
                <option value="">Select rating</option>
                <option value="5">⭐ 5 - Excellent</option>
                <option value="4">⭐ 4 - Good</option>
                <option value="3">⭐ 3 - Average</option>
                <option value="2">⭐ 2 - Below Average</option>
                <option value="1">⭐ 1 - Poor</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Comments</Form.Label>
              <Form.Control as="textarea" rows="4" placeholder="Add review comments..." />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Goals</Form.Label>
              <Form.Control as="textarea" rows="3" placeholder="Set performance goals..." />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Achievements</Form.Label>
              <Form.Control as="textarea" rows="3" placeholder="List achievements..." />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Review'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Performance;