import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Row, Col, Table, Badge, Button, Spinner,
  Alert, Form, Modal
} from 'react-bootstrap';
import {
  FaChartLine, FaStar, FaUser, FaCalendar,
  FaPlus, FaEdit, FaTrash, FaEye, FaSync
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Performance.css';

const Performance = () => {
  const { user } = useAuth();
  const [performances, setPerformances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalReviews: 0,
    avgRating: 0,
    reviewedCount: 0,
    pendingCount: 0
  });

  const [formData, setFormData] = useState({
    employee_id: '',
    review_date: new Date().toISOString().split('T')[0],
    rating: 5,
    comments: '',
    goals: '',
    achievements: '',
    status: 'reviewed'
  });

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchPerformances();
    fetchStats();
    if (isAdminOrHR || isManager) {
      fetchEmployees();
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?limit=100');
      const list = response.data?.data || [];
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employees for dropdown:', err);
    }
  };

  const fetchPerformances = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/performance');
      setPerformances(response.data?.data || []);
    } catch (err) {
      setError('Failed to fetch performance data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/performance/stats');
      if (response.data?.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleOpenNewModal = () => {
    setEditing(false);
    setSelectedPerformance(null);
    setFormData({
      employee_id: employees.length > 0 ? String(employees[0].id) : '',
      review_date: new Date().toISOString().split('T')[0],
      rating: 5,
      comments: '',
      goals: '',
      achievements: '',
      status: 'reviewed'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (perf) => {
    setEditing(true);
    setSelectedPerformance(perf);
    setFormData({
      employee_id: String(perf.employee_id || ''),
      review_date: perf.review_date ? new Date(perf.review_date).toISOString().split('T')[0] : '',
      rating: perf.rating || 5,
      comments: perf.comments || '',
      goals: perf.goals || '',
      achievements: perf.achievements || '',
      status: perf.status || 'reviewed'
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      alert('Please select an employee.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (editing && selectedPerformance) {
        await api.put(`/performance/${selectedPerformance.id}`, formData);
        setSuccess('Performance review updated successfully!');
      } else {
        await api.post('/performance', formData);
        setSuccess('Performance review created successfully!');
      }
      setShowModal(false);
      fetchPerformances();
      fetchStats();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert('Failed to save performance review: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this performance review?')) {
      try {
        await api.delete(`/performance/${id}`);
        setSuccess('Performance review deleted.');
        fetchPerformances();
        fetchStats();
        setTimeout(() => setSuccess(''), 4000);
      } catch (err) {
        alert('Failed to delete performance review: ' + (err.response?.data?.message || err.message));
      }
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
    if (stats.avgRating) return stats.avgRating;
    if (!performances.length) return 0;
    const total = performances.reduce((sum, p) => sum + (p.rating || 0), 0);
    return (total / performances.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading performance reviews...</p>
      </div>
    );
  }

  return (
    <div className="performance-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Performance Reviews</h2>
          <p className="text-muted">Track and manage employee performance, evaluations &amp; achievements</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => { fetchPerformances(); fetchStats(); }}>
            <FaSync className="me-2" />
            Refresh
          </Button>
          {(isAdminOrHR || isManager) && (
            <Button variant="primary" onClick={handleOpenNewModal}>
              <FaPlus className="me-2" />
              New Review
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <h6 className="text-muted">Total Reviews</h6>
              <h3>{stats.totalReviews || performances.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-primary bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Average Rating</h6>
              <h3>{getAverageRating()} / 5</h3>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar 
                    key={star} 
                    className={star <= Math.round(Number(getAverageRating())) ? 'text-warning' : 'text-muted'} 
                  />
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-success bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Completed &amp; Reviewed</h6>
              <h3>{stats.reviewedCount || performances.filter(p => p.status === 'reviewed').length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-warning bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Pending Review</h6>
              <h3>{stats.pendingCount || performances.filter(p => p.status === 'submitted' || p.status === 'draft').length}</h3>
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
                <th>Department / Position</th>
                <th>Review Date</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {performances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <h5>No performance reviews found</h5>
                    <p className="text-muted">Create a review to evaluate employee performance.</p>
                  </td>
                </tr>
              ) : (
                performances.map((perf) => (
                  <tr key={perf.id}>
                    <td>
                      <div className="employee-info">
                        <FaUser className="text-primary me-2" />
                        <div>
                          <strong>{perf.employee_name || 'N/A'}</strong>
                          <div className="text-muted small">{perf.employee_code}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{perf.department || 'N/A'}</div>
                      <small className="text-muted">{perf.position || 'Staff'}</small>
                    </td>
                    <td>{perf.review_date ? new Date(perf.review_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{perf.rating ? getRatingBadge(perf.rating) : 'Not rated'}</td>
                    <td>{getStatusBadge(perf.status)}</td>
                    <td>
                      <div className="action-buttons d-flex gap-1">
                        <Link to={`/performance/review/${perf.id}`}>
                          <Button variant="outline-info" size="sm" title="View Review">
                            <FaEye />
                          </Button>
                        </Link>
                        {(isAdminOrHR || isManager) && (
                          <>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              title="Edit Review"
                              onClick={() => handleOpenEditModal(perf)}
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              title="Delete Review"
                              onClick={() => handleDelete(perf.id)}
                            >
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

      {/* Add / Edit Review Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editing ? 'Edit Performance Review' : 'New Performance Review'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Select Employee *</Form.Label>
                  <Form.Select 
                    name="employee_id" 
                    value={formData.employee_id} 
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id} - {emp.department || 'General'})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Review Date *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="review_date" 
                    value={formData.review_date} 
                    onChange={handleFormChange}
                    required 
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Performance Rating (1-5 Stars) *</Form.Label>
                  <Form.Select 
                    name="rating" 
                    value={formData.rating} 
                    onChange={handleFormChange}
                  >
                    <option value="5">⭐⭐⭐⭐⭐ 5 - Exceptional (Exceeds all targets)</option>
                    <option value="4">⭐⭐⭐⭐ 4 - Very Good (Meets and exceeds expectations)</option>
                    <option value="3">⭐⭐⭐ 3 - Satisfactory (Consistently meets expectations)</option>
                    <option value="2">⭐⭐ 2 - Needs Improvement (Below expectations)</option>
                    <option value="1">⭐ 1 - Unsatisfactory (Urgent action required)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status *</Form.Label>
                  <Form.Select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleFormChange}
                  >
                    <option value="reviewed">Reviewed &amp; Approved</option>
                    <option value="submitted">Submitted (Under Review)</option>
                    <option value="draft">Draft</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Evaluation Comments &amp; Feedback</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                name="comments"
                value={formData.comments}
                onChange={handleFormChange}
                placeholder="Detailed appraisal comments, strengths, feedback..." 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Goals &amp; Next Sprint Objectives</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                name="goals"
                value={formData.goals}
                onChange={handleFormChange}
                placeholder="Specific technical goals, certifications, milestones..." 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Key Achievements &amp; Accomplishments</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                name="achievements"
                value={formData.achievements}
                onChange={handleFormChange}
                placeholder="Highlighted deliverables, projects completed, achievements..." 
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Review'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Performance;
