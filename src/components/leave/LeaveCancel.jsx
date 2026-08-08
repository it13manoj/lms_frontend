import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Badge, Button, Spinner, Alert, 
  Modal, Form, Row, Col 
} from 'react-bootstrap';
import { 
  FaTimes, FaCalendarAlt, FaClock, FaUser, 
  FaCheck, FaSearch, FaFilter 
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './LeaveCancel.css';

const LeaveCancel = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    leave_type: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [filters, searchTerm]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leave', {
        params: {
          ...filters,
          search: searchTerm
        }
      });
      setLeaves(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch leave requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeave = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/leave/${selectedLeave.id}/cancel`, {
        reason: cancelReason
      });
      
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedLeave(null);
      fetchLeaves();
      
      // Show success message
      alert('Leave request cancelled successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>;
  };

  const getStatusIcon = (status) => {
    const icons = {
      approved: <FaCheck className="text-success" />,
      pending: <FaClock className="text-warning" />,
      rejected: <FaTimes className="text-danger" />,
      cancelled: <FaTimes className="text-secondary" />
    };
    return icons[status] || <FaClock />;
  };

  const canCancel = (leave) => {
    // Only pending leaves can be cancelled
    // And only if the employee is the one who requested it
    // Or if user is admin/HR
    if (leave.status !== 'pending') return false;
    
    const isRequester = leave.employee_id === user?.employee?.id;
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';
    
    return isRequester || isAdmin;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDaysRemaining = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = start - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="leave-cancel">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Cancel Leave Request</h2>
          <p className="text-muted">View and cancel your pending leave requests</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={fetchLeaves}>
            <FaFilter className="me-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Leave Type</Form.Label>
                <Form.Select
                  name="leave_type"
                  value={filters.leave_type}
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date From</Form.Label>
                <Form.Control
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Date To</Form.Label>
                <Form.Control
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-3">
            <Col md={8}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <Form.Control
                    type="text"
                    placeholder="Search by employee name or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button variant="primary" className="w-100" onClick={fetchLeaves}>
                Apply Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Leave List */}
      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover className="leave-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="empty-state">
                      <FaTimes size={48} className="text-muted mb-3" />
                      <h5>No leave requests found</h5>
                      <p className="text-muted">
                        {filters.status === 'pending' 
                          ? 'You have no pending leave requests' 
                          : 'No leave requests match your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className={leave.status === 'pending' ? 'pending-row' : ''}>
                    <td>
                      <div className="employee-info">
                        <FaUser className="text-primary me-2" />
                        <div>
                          <strong>{leave.employee_name || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">{leave.employee_id || 'N/A'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="leave-type-info">
                        <span className="leave-type-badge">
                          {leave.leave_type.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="date-range">
                        <div>
                          <small className="text-muted">From</small>
                          <div>{formatDate(leave.start_date)}</div>
                        </div>
                        <div>
                          <small className="text-muted">To</small>
                          <div>{formatDate(leave.end_date)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="info" className="days-badge">
                        {leave.total_days} {leave.total_days > 1 ? 'days' : 'day'}
                      </Badge>
                    </td>
                    <td>
                      <div className="status-info">
                        {getStatusIcon(leave.status)}
                        {getStatusBadge(leave.status)}
                        {leave.status === 'pending' && leave.start_date && (
                          <div className="days-remaining">
                            <small className="text-muted">
                              {calculateDaysRemaining(leave.start_date)} days until start
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {canCancel(leave) ? (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowCancelModal(true);
                          }}
                          className="cancel-btn"
                        >
                          <FaTimes className="me-1" />
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled
                          className="disabled-btn"
                        >
                          {leave.status === 'cancelled' ? 'Cancelled' : 'Not Available'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
        <Card.Footer className="bg-transparent">
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">
              Showing {leaves.length} leave request(s)
            </span>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-dot bg-warning"></span>
                Pending (can cancel)
              </span>
              <span className="legend-item">
                <span className="legend-dot bg-success"></span>
                Approved
              </span>
              <span className="legend-item">
                <span className="legend-dot bg-danger"></span>
                Rejected
              </span>
              <span className="legend-item">
                <span className="legend-dot bg-secondary"></span>
                Cancelled
              </span>
            </div>
          </div>
        </Card.Footer>
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            <FaTimes className="text-danger me-2" />
            Cancel Leave Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <>
              <Alert variant="warning">
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>
              
              <div className="cancel-summary">
                <div className="summary-item">
                  <label className="text-muted">Employee</label>
                  <div className="fw-bold">{selectedLeave.employee_name || 'N/A'}</div>
                </div>
                <div className="summary-item">
                  <label className="text-muted">Leave Type</label>
                  <div className="fw-bold text-capitalize">{selectedLeave.leave_type}</div>
                </div>
                <div className="summary-item">
                  <label className="text-muted">Duration</label>
                  <div className="fw-bold">
                    {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}
                  </div>
                </div>
                <div className="summary-item">
                  <label className="text-muted">Total Days</label>
                  <div className="fw-bold">{selectedLeave.total_days} days</div>
                </div>
                <div className="summary-item">
                  <label className="text-muted">Reason</label>
                  <div className="fw-normal text-muted">{selectedLeave.reason || 'No reason provided'}</div>
                </div>
              </div>

              <Form.Group className="mt-4">
                <Form.Label>
                  Reason for Cancellation <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Please provide a reason for cancelling this leave request..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={error && !cancelReason.trim() ? 'is-invalid' : ''}
                />
                <Form.Text className="text-muted">
                  Minimum 10 characters
                </Form.Text>
                {error && !cancelReason.trim() && (
                  <div className="text-danger mt-1">{error}</div>
                )}
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Close
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelLeave}
            disabled={submitting || !cancelReason.trim()}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              <>
                <FaTimes className="me-2" />
                Confirm Cancellation
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quick Stats */}
      <Row className="mt-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <h6 className="text-muted">Total Requests</h6>
              <h3>{leaves.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-warning bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Pending</h6>
              <h3 className="text-warning">
                {leaves.filter(l => l.status === 'pending').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-success bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Approved</h6>
              <h3 className="text-success">
                {leaves.filter(l => l.status === 'approved').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card bg-danger bg-opacity-10">
            <Card.Body className="text-center">
              <h6 className="text-muted">Cancelled</h6>
              <h3 className="text-danger">
                {leaves.filter(l => l.status === 'cancelled').length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LeaveCancel;