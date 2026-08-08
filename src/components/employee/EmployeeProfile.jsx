import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Card, Row, Col, Badge, Button, Spinner, 
  Alert, Tabs, Tab, ListGroup, Table 
} from 'react-bootstrap';
import { 
  FaUser, FaEnvelope, FaPhone, FaBuilding, 
  FaCalendar, FaMoneyBillWave, FaArrowLeft,
  FaUserCircle, FaClock, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import api from '../../services/api';
import './EmployeeProfile.css';

const EmployeeProfile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const [employeeRes, leaveRes, attendanceRes] = await Promise.all([
        api.get(`/employees/${id}`),
        api.get(`/employees/${id}/leaves`),
        api.get(`/employees/${id}/attendance`)
      ]);
      setEmployee(employeeRes.data.data);
      setLeaveHistory(leaveRes.data.data || []);
      setAttendanceHistory(attendanceRes.data.data || []);
    } catch (error) {
      setError('Failed to fetch employee data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <Alert variant="danger" className="mt-3">
        {error || 'Employee not found'}
      </Alert>
    );
  }

  return (
    <div className="employee-profile">
      <Link to="/employees" className="btn btn-outline-secondary mb-4">
        <FaArrowLeft className="me-2" />
        Back to Employees
      </Link>

      <Row>
        <Col lg={4}>
          <Card className="profile-card">
            <Card.Body className="text-center">
              <div className="profile-avatar">
                {employee.profile_picture ? (
                  <img 
                    src={employee.profile_picture} 
                    alt={`${employee.first_name} ${employee.last_name}`}
                    className="rounded-circle"
                  />
                ) : (
                  <FaUserCircle size={120} className="text-secondary" />
                )}
              </div>
              <h4 className="mt-3">
                {employee.first_name} {employee.last_name}
              </h4>
              <p className="text-muted">{employee.position || 'No position'}</p>
              <Badge bg={employee.User?.status === 'active' ? 'success' : 'danger'}>
                {employee.User?.status || 'inactive'}
              </Badge>
              <hr />
              <ListGroup variant="flush" className="text-start">
                <ListGroup.Item>
                  <FaUser className="me-2 text-primary" />
                  Employee ID: <strong>{employee.employee_id}</strong>
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaEnvelope className="me-2 text-primary" />
                  {employee.email}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaPhone className="me-2 text-primary" />
                  {employee.phone || 'No phone'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaBuilding className="me-2 text-primary" />
                  {employee.department || 'No department'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCalendar className="me-2 text-primary" />
                  Joined: {new Date(employee.joining_date).toLocaleDateString()}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaMoneyBillWave className="me-2 text-primary" />
                  Salary: ${employee.salary?.toLocaleString() || '0'}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Tabs defaultActiveKey="profile" className="mb-3">
            <Tab eventKey="profile" title="Profile">
              <Card>
                <Card.Body>
                  <h5>Personal Information</h5>
                  <hr />
                  <Row>
                    <Col md={6}>
                      <p><strong>First Name:</strong> {employee.first_name}</p>
                      <p><strong>Last Name:</strong> {employee.last_name}</p>
                      <p><strong>Email:</strong> {employee.email}</p>
                      <p><strong>Phone:</strong> {employee.phone || 'N/A'}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Department:</strong> {employee.department || 'N/A'}</p>
                      <p><strong>Position:</strong> {employee.position || 'N/A'}</p>
                      <p><strong>Joining Date:</strong> {new Date(employee.joining_date).toLocaleDateString()}</p>
                      <p><strong>Bank Account:</strong> {employee.bank_account || 'N/A'}</p>
                    </Col>
                  </Row>
                  <h5 className="mt-3">Address</h5>
                  <hr />
                  <p>{employee.address || 'No address provided'}</p>
                  <h5 className="mt-3">Emergency Contact</h5>
                  <hr />
                  <p>{employee.emergency_contact || 'No emergency contact provided'}</p>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="leaves" title="Leave History">
              <Card>
                <Card.Body>
                  {leaveHistory.length === 0 ? (
                    <p className="text-center text-muted">No leave history</p>
                  ) : (
                    <Table striped responsive>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Days</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveHistory.map((leave) => (
                          <tr key={leave.id}>
                            <td className="text-capitalize">{leave.leave_type}</td>
                            <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                            <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                            <td>{leave.total_days}</td>
                            <td>
                              <Badge bg={
                                leave.status === 'approved' ? 'success' :
                                leave.status === 'pending' ? 'warning' : 'danger'
                              }>
                                {leave.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="attendance" title="Attendance">
              <Card>
                <Card.Body>
                  {attendanceHistory.length === 0 ? (
                    <p className="text-center text-muted">No attendance records</p>
                  ) : (
                    <Table striped responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Status</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceHistory.map((attendance) => (
                          <tr key={attendance.id}>
                            <td>{new Date(attendance.date).toLocaleDateString()}</td>
                            <td>{attendance.check_in || '-'}</td>
                            <td>{attendance.check_out || '-'}</td>
                            <td>
                              <Badge bg={
                                attendance.status === 'present' ? 'success' :
                                attendance.status === 'absent' ? 'danger' :
                                attendance.status === 'late' ? 'warning' : 'info'
                              }>
                                {attendance.status}
                              </Badge>
                            </td>
                            <td>{attendance.working_hours || 0}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeProfile;