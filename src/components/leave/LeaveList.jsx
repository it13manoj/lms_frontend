import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Badge, Spinner, Alert,
  Modal, Form, Row, Col, Pagination
} from 'react-bootstrap';
import {
  FaCheck, FaTimes, FaClock, FaUser, FaCalendarAlt,
  FaFilter, FaSearch, FaEye, FaEdit, FaTrash
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './LeaveList.css';

const LeaveList = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    leave_type: '',
    dateFrom: '',
    dateTo: '',
    employee_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  useEffect(() => {
    fetchLeaves();
    if (isAdminOrHR) {
      fetchEmployees();
    }
  }, [filters, searchTerm, pagination.page]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leave/list', {
        params: {
          ...filters,
          search: searchTerm,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setLeaves(response.data.data || []);
      setPagination({
        ...pagination,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0
      });
    } catch (error) {
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/dropdown');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  const handleAction = async (action) => {
    if (!actionReason.trim() && action === 'reject') {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/leave/${selectedLeave.id}`, {
        status: action,
        reason: actionReason
      });
      
      setShowModal(false);
      setSelectedLeave(null);
      setActionReason('');
      fetchLeaves();
    } catch (error) {
      setError(error.response?.data?.message || 'Action failed');
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

  const handlePageChange = (page) => {
    setPagination({ ...pagination, page });
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

  const getLeaveTypeBadge = (type) => {
    const variants = {
      annual: 'primary',
      sick: 'danger',
      casual: 'warning',
      maternity: 'info',
      paternity: 'info',
      other: 'secondary'
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="leave-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Leave Requests</h2>
          <p className="text-muted">
            {isAdminOrHR ? 'Manage all leave requests' : 'View your leave requests'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={fetchLeaves}>
            <FaFilter className="me-2" />
            Refresh
          </Button>
          {!isAdminOrHR && (
            <Button variant="primary" href="/leave">
              <FaCalendarAlt className="me-2" />
              New Request
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
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
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="casual">Casual</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {isAdminOrHR && (
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Employee</Form.Label>
                  <Form.Select
                    name="employee_id"
                    value={filters.employee_id}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            <Col md={isAdminOrHR ? 2 : 2}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-3">
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
            <Col md={6} className="d-flex align-items-end">
              <Button variant="primary" className="w-100" onClick={fetchLeaves}>
                Apply Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover className="leave-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="empty-state">
                      <FaCalendarAlt size={48} className="text-muted mb-3" />
                      <h5>No leave requests found</h5>
                      <p className="text-muted">
                        No leave requests match your filters
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
                    <td>{getLeaveTypeBadge(leave.leave_type)}</td>
                    <td>
                      <div className="date-range">
                        <div>{formatDate(leave.start_date)}</div>
                        <div className="text-muted">to</div>
                        <div>{formatDate(leave.end_date)}</div>
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
                              {Math.ceil((new Date(leave.start_date) - new Date()) / (1000 * 60 * 60 * 24))} days until start
                            </small>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowModal(true);
                          }}
                        >
                          <FaEye />
                        </Button>
                        {isAdminOrHR && leave.status === 'pending' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setActionType('approved');
                                setShowModal(true);
                              }}
                            >
                              <FaCheck />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setActionType('rejected');
                                setShowModal(true);
                              }}
                            >
                              <FaTimes />
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
        <Card.Footer className="bg-transparent">
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">
              Showing {leaves.length} of {pagination.total} entries
            </span>
            <Pagination>
              <Pagination.Prev 
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              />
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let page = pagination.page;
                if (page > 3) page = page - 2 + i;
                else page = i + 1;
                if (page > pagination.totalPages) return null;
                return (
                  <Pagination.Item
                    key={page}
                    active={page === pagination.page}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next 
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              />
            </Pagination>
          </div>
        </Card.Footer>
      </Card>

      {/* View/Update Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedLeave && (
              <>
                {actionType ? 'Update Leave Request' : 'Leave Details'}
                <Badge className="ms-2" bg={actionType === 'approved' ? 'success' : actionType === 'rejected' ? 'danger' : 'secondary'}>
                  {actionType || 'view'}
                </Badge>
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <>
              <div className="leave-details">
                <Row>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>Employee</label>
                      <div className="detail-value">
                        <FaUser className="me-2" />
                        {selectedLeave.employee_name || 'N/A'}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>Leave Type</label>
                      <div className="detail-value">
                        {getLeaveTypeBadge(selectedLeave.leave_type)}
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>Start Date</label>
                      <div className="detail-value">
                        <FaCalendarAlt className="me-2" />
                        {formatDate(selectedLeave.start_date)}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>End Date</label>
                      <div className="detail-value">
                        <FaCalendarAlt className="me-2" />
                        {formatDate(selectedLeave.end_date)}
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>Total Days</label>
                      <div className="detail-value">
                        <Badge bg="info">
                          {selectedLeave.total_days} {selectedLeave.total_days > 1 ? 'days' : 'day'}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-group">
                      <label>Current Status</label>
                      <div className="detail-value">
                        {getStatusBadge(selectedLeave.status)}
                      </div>
                    </div>
                  </Col>
                </Row>
                <div className="detail-group">
                  <label>Reason</label>
                  <div className="detail-value">
                    {selectedLeave.reason || 'No reason provided'}
                  </div>
                </div>
              </div>

              {(isAdminOrHR && selectedLeave.status === 'pending') && (
                <div className="action-section mt-4">
                  <Form.Group>
                    <Form.Label>
                      {actionType === 'rejected' ? 'Rejection Reason *' : 'Comments (Optional)'}
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder={actionType === 'rejected' 
                        ? 'Please provide a reason for rejecting this leave request...'
                        : 'Add any comments or notes...'
                      }
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                    />
                    {actionType === 'rejected' && !actionReason.trim() && (
                      <div className="text-danger mt-1">Please provide a reason for rejection</div>
                    )}
                  </Form.Group>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          {isAdminOrHR && selectedLeave?.status === 'pending' && (
            <>
              <Button
                variant="danger"
                onClick={() => handleAction('rejected')}
                disabled={submitting || (actionType === 'rejected' && !actionReason.trim())}
              >
                {submitting ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                variant="success"
                onClick={() => handleAction('approved')}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Approve'}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LeaveList;