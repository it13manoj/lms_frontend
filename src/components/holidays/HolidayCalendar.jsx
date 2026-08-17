import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import 'react-calendar/dist/Calendar.css';
import './HolidayCalendar.css';

const HolidayCalendar = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // State for Add Holiday Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    holiday_name: '',
    holiday_date: '',
    holiday_type: 'public',
    description: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await api.get('/holidays');
      // Handles both { data: [...] } and direct [...] API structures safely
      const holidayData = response.data.data || response.data || [];
      setHolidays(holidayData);
    } catch (error) {
      setError('Failed to fetch holidays');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/holidays', newHoliday);
      setShowAddModal(false);
      setNewHoliday({ holiday_name: '', holiday_date: '', holiday_type: 'public', description: '' });
      fetchHolidays(); // Refresh list
    } catch (err) {
      alert('Failed to add holiday');
      console.error(err);
    }
  };

  const getHolidaysForDate = (date) => {
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.holiday_date);
      return holidayDate.getDate() === date.getDate() &&
             holidayDate.getMonth() === date.getMonth() &&
             holidayDate.getFullYear() === date.getFullYear();
    });
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayHolidays = getHolidaysForDate(date);
      if (dayHolidays.length > 0) {
        return (
          <div className="holiday-marker">
            <span className="holiday-dot"></span>
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayHolidays = getHolidaysForDate(date);
      if (dayHolidays.length > 0) {
        return 'holiday-date';
      }
    }
    return '';
  };

  const getHolidayTypeBadge = (type) => {
    const variants = {
      public: 'danger',
      national: 'warning',
      company: 'info'
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Filter list for the selected month view card
  const currentMonthHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.holiday_date);
    return holidayDate.getMonth() === selectedDate.getMonth() &&
           holidayDate.getFullYear() === selectedDate.getFullYear();
  });

  return (
    <div className="holiday-calendar">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Holiday Calendar</h2>
        {(user?.role === 'admin' || user?.role === 'hr') && (
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <FaPlus className="me-2" />
            Add Holiday
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                className="custom-calendar"
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                Holidays for {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h5>
            </Card.Header>
            <Card.Body>
              {currentMonthHolidays.length === 0 ? (
                <p className="text-center text-muted">No holidays this month</p>
              ) : (
                <div className="holiday-list">
                  {currentMonthHolidays.map(holiday => (
                    <div key={holiday.id} className="holiday-item">
                      <div className="holiday-date-display">
                        <span className="day">
                          {new Date(holiday.holiday_date).getDate()}
                        </span>
                        <span className="month">
                          {new Date(holiday.holiday_date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="holiday-info">
                        <h6 className="mb-1">{holiday.holiday_name}</h6>
                        <div>
                          {getHolidayTypeBadge(holiday.holiday_type)}
                          <small className="text-muted ms-2">
                            {holiday.description}
                          </small>
                        </div>
                      </div>
                      {(user?.role === 'admin' || user?.role === 'hr') && (
                        <div className="holiday-actions">
                          <Button variant="outline-primary" size="sm">
                            <FaEdit />
                          </Button>
                          <Button variant="outline-danger" size="sm">
                            <FaTrash />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Header>
              <h5 className="mb-0">Upcoming Holidays</h5>
            </Card.Header>
            <Card.Body>
              {holidays
                .filter(holiday => new Date(holiday.holiday_date) >= new Date())
                .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
                .slice(0, 5)
                .map(holiday => (
                  <div key={holiday.id} className="upcoming-holiday mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{holiday.holiday_name}</span>
                      <span className="text-muted">
                        {new Date(holiday.holiday_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Holiday Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Holiday</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddHolidaySubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Holiday Name</Form.Label>
              <Form.Control
                type="text"
                required
                value={newHoliday.holiday_name}
                onChange={(e) => setNewHoliday({ ...newHoliday, holiday_name: e.target.value })}
                placeholder="e.g., Independence Day"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                required
                value={newHoliday.holiday_date}
                onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={newHoliday.holiday_type}
                onChange={(e) => setNewHoliday({ ...newHoliday, holiday_type: e.target.value })}
              >
                <option value="public">Public</option>
                <option value="national">National</option>
                <option value="company">Company</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newHoliday.description}
                onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                placeholder="Optional description"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Holiday
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default HolidayCalendar;