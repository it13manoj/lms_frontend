import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Badge, Button, Spinner,
  Alert, Modal, Form
} from 'react-bootstrap';
import Calendar from 'react-calendar';
import {
  FaCalendarAlt, FaUser, FaClock, FaCheck,
  FaTimes, FaFilter, FaDownload, FaPrint
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import 'react-calendar/dist/Calendar.css';
import './LeaveCalendar.css';

const LeaveCalendar = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchLeaves();
    if (user?.role === 'admin' || user?.role === 'hr') {
      fetchEmployees();
    }
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leave/calendar', {
        params: { month: selectedDate.getMonth() + 1, year: selectedDate.getFullYear() }
      });
      setLeaves(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch leave data');
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

  const getLeavesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return leaves.filter(leave => {
      const startDate = new Date(leave.start_date).toISOString().split('T')[0];
      const endDate = new Date(leave.end_date).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayLeaves = getLeavesForDate(date);
      if (dayLeaves.length > 0) {
        const statuses = dayLeaves.map(l => l.status);
        const hasApproved = statuses.includes('approved');
        const hasPending = statuses.includes('pending');
        
        return (
          <div className="leave-markers">
            {hasApproved && <span className="marker approved"></span>}
            {hasPending && <span className="marker pending"></span>}
            <span className="leave-count">{dayLeaves.length}</span>
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayLeaves = getLeavesForDate(date);
      if (dayLeaves.length > 0) {
        return 'has-leave';
      }
    }
    return '';
  };

  const handleDateClick = (date) => {
    const dayLeaves = getLeavesForDate(date);
    if (dayLeaves.length > 0) {
      setSelectedDate(date);
      // Show modal with leave details
      setSelectedLeave(dayLeaves);
      setShowLeaveDetails(true);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      annual: '#4CAF50',
      sick: '#F44336',
      casual: '#FF9800',
      maternity: '#9C27B0',
      paternity: '#2196F3',
      other: '#607D8B'
    };
    return colors[type] || '#607D8B';
  };

  const handleFilterChange = (e) => {
    setFilterEmployee(e.target.value);
  };

  const filteredLeaves = filterEmployee 
    ? leaves.filter(l => l.employee_id === parseInt(filterEmployee))
    : leaves;

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="leave-calendar">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Leave Calendar</h2>
          <p className="text-muted">View all employee leave schedules</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={fetchLeaves}>
            <FaFilter className="me-2" />
            Refresh
          </Button>
          <Button variant="outline-primary">
            <FaDownload className="me-2" />
            Export
          </Button>
          <Button variant="outline-secondary">
            <FaPrint className="me-2" />
            Print
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h5>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                    fetchLeaves();
                  }}
                >
                  ←
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(new Date());
                    fetchLeaves();
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                    fetchLeaves();
                  }}
                >
                  →
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                onClickDay={handleDateClick}
                className="custom-calendar"
                view={viewMode}
                onViewChange={({ view }) => setViewMode(view)}
              />
              <div className="calendar-legend mt-3">
                <span className="legend-item">
                  <span className="legend-dot approved"></span>
                  Approved Leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot pending"></span>
                  Pending Leave
                </span>
                <span className="legend-item">
                  <span className="legend-dot rejected"></span>
                  Rejected/Cancelled
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Leave Summary</h5>
            </Card.Header>
            <Card.Body>
              {(user?.role === 'admin' || user?.role === 'hr') && (
                <Form.Group className="mb-3">
                  <Form.Label>Filter by Employee</Form.Label>
                  <Form.Select
                    value={filterEmployee}
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
              )}

              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Leaves</span>
                  <span className="stat-value">{filteredLeaves.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Approved</span>
                  <span className="stat-value text-success">
                    {filteredLeaves.filter(l => l.status === 'approved').length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending</span>
                  <span className="stat-value text-warning">
                    {filteredLeaves.filter(l => l.status === 'pending').length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Rejected/Cancelled</span>
                  <span className="stat-value text-danger">
                    {filteredLeaves.filter(l => l.status === 'rejected' || l.status === 'cancelled').length}
                  </span>
                </div>
              </div>

              <hr />

              <h6 className="mb-3">Upcoming Leaves</h6>
              <div className="upcoming-leaves">
                {filteredLeaves
                  .filter(l => l.status === 'approved' && new Date(l.start_date) >= new Date())
                  .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                  .slice(0, 5)
                  .map(leave => (
                    <div key={leave.id} className="upcoming-item">
                      <div className="upcoming-date">
                        <span className="day">
                          {new Date(leave.start_date).getDate()}
                        </span>
                        <span className="month">
                          {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="upcoming-info">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="employee-name">
                            {leave.employee_name || 'N/A'}
                          </span>
                          <Badge 
                            bg="secondary"
                            style={{ backgroundColor: getLeaveTypeColor(leave.leave_type) }}
                          >
                            {leave.leave_type}
                          </Badge>
                        </div>
                        <small className="text-muted">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  ))}
                {filteredLeaves.filter(l => l.status === 'approved' && new Date(l.start_date) >= new Date()).length === 0 && (
                  <p className="text-center text-muted">No upcoming leaves</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Leave Details Modal */}
      <Modal show={showLeaveDetails} onHide={() => setShowLeaveDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Leave Details - {selectedDate.toLocaleDateString()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave && (
            <div className="leave-details-list">
              {selectedLeave.map((leave) => (
                <div key={leave.id} className="leave-detail-item">
                  <Row>
                    <Col md={6}>
                      <div className="detail-label">Employee</div>
                      <div className="detail-value">
                        <FaUser className="me-2" />
                        {leave.employee_name || 'N/A'}
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="detail-label">Type</div>
                      <div className="detail-value">
                        <Badge 
                          style={{ backgroundColor: getLeaveTypeColor(leave.leave_type) }}
                        >
                          {leave.leave_type.toUpperCase()}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="detail-label">Status</div>
                      <div className="detail-value">
                        {getStatusBadge(leave.status)}
                      </div>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col md={6}>
                      <div className="detail-label">Duration</div>
                      <div className="detail-value">
                        <FaClock className="me-2" />
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        <span className="ms-2 badge bg-info">
                          {leave.total_days} days
                        </span>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="detail-label">Reason</div>
                      <div className="detail-value">
                        {leave.reason || 'No reason provided'}
                      </div>
                    </Col>
                  </Row>
                  <hr />
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLeaveDetails(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LeaveCalendar;