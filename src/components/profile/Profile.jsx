import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Button, Badge, Spinner, 
  Alert, ListGroup, Nav, Tab, Form 
} from 'react-bootstrap';
import { 
  FaUser, FaEnvelope, FaPhone, FaBuilding, 
  FaCalendar, FaMoneyBillWave, FaUserCircle,
  FaEdit, FaKey, FaSave, FaTimes
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    emergency_contact: '',
    bank_account: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      setProfile(response.data);
      if (response.data.Employee) {
        const emp = response.data.Employee;
        setFormData({
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          phone: emp.phone || '',
          address: emp.address || '',
          emergency_contact: emp.emergency_contact || '',
          bank_account: emp.bank_account || ''
        });
      }
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.put(`/employees/${profile.Employee.id}`, formData);
      setEditing(false);
      fetchProfile();
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!profile) {
    return <Alert variant="danger">Profile not found</Alert>;
  }

  const employee = profile.Employee;

  return (
    <div className="profile-page">
      <h2 className="mb-4">My Profile</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={4}>
          <Card className="profile-card">
            <Card.Body className="text-center">
              <div className="profile-avatar">
                {employee?.profile_picture ? (
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
                {employee?.first_name} {employee?.last_name}
              </h4>
              <p className="text-muted">{employee?.position || 'No position'}</p>
              <Badge bg={profile.status === 'active' ? 'success' : 'danger'}>
                {profile.status || 'active'}
              </Badge>
              <Badge bg="info" className="ms-2">
                {profile.role || 'employee'}
              </Badge>
              <hr />
              <ListGroup variant="flush" className="text-start">
                <ListGroup.Item>
                  <FaUser className="me-2 text-primary" />
                  Employee ID: <strong>{employee?.employee_id}</strong>
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaEnvelope className="me-2 text-primary" />
                  {profile.email}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaPhone className="me-2 text-primary" />
                  {employee?.phone || 'No phone'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaBuilding className="me-2 text-primary" />
                  {employee?.department || 'No department'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCalendar className="me-2 text-primary" />
                  Joined: {employee?.joining_date ? new Date(employee.joining_date).toLocaleDateString() : 'N/A'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaMoneyBillWave className="me-2 text-primary" />
                  Salary: ₹{employee?.salary?.toLocaleString() || '0'}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Body>
              <Link to="/profile/change-password" className="btn btn-outline-primary w-100">
                <FaKey className="me-2" />
                Change Password
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Personal Information</h5>
              {!editing ? (
                <Button variant="outline-primary" size="sm" onClick={() => setEditing(true)}>
                  <FaEdit className="me-1" />
                  Edit
                </Button>
              ) : (
                <div>
                  <Button variant="outline-secondary" size="sm" onClick={() => setEditing(false)}>
                    <FaTimes className="me-1" />
                    Cancel
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              {editing ? (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows="3"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Emergency Contact</Form.Label>
                    <Form.Control
                      type="text"
                      name="emergency_contact"
                      value={formData.emergency_contact}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Bank Account</Form.Label>
                    <Form.Control
                      type="text"
                      name="bank_account"
                      value={formData.bank_account}
                      onChange={handleChange}
                    />
                  </Form.Group>

                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </Form>
              ) : (
                <div>
                  <Row>
                    <Col md={6}>
                      <p><strong>First Name:</strong> {employee?.first_name}</p>
                      <p><strong>Last Name:</strong> {employee?.last_name}</p>
                      <p><strong>Phone:</strong> {employee?.phone || 'N/A'}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Email:</strong> {profile.email}</p>
                      <p><strong>Department:</strong> {employee?.department || 'N/A'}</p>
                      <p><strong>Position:</strong> {employee?.position || 'N/A'}</p>
                    </Col>
                  </Row>
                  <h5 className="mt-3">Address</h5>
                  <p>{employee?.address || 'No address provided'}</p>
                  <h5 className="mt-3">Emergency Contact</h5>
                  <p>{employee?.emergency_contact || 'No emergency contact provided'}</p>
                  <h5 className="mt-3">Bank Account</h5>
                  <p>{employee?.bank_account || 'No bank account provided'}</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;