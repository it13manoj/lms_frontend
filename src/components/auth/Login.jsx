import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // IMPORTANT: Prevent page reload
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      console.log('Login successful:', result);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Demo login for testing
  const handleDemoLogin = async (role) => {
    const credentials = {
      admin: { email: 'admin@lms.com', password: 'password123' },
      hr: { email: 'hr@lms.com', password: 'password123' },
      manager: { email: 'manager@lms.com', password: 'password123' }
    };

    const cred = credentials[role];
    if (cred) {
      setFormData(cred);
      setError('');
      setLoading(true);
      try {
        await login(cred.email, cred.password);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError('Demo login failed. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page">
      <Container fluid className="login-container">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col md={6} lg={4}>
            <Card className="login-card">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="login-logo">
                    <span className="logo-icon">📋</span>
                    <h2 className="fw-bold mb-0">LMS Panel</h2>
                  </div>
                  <p className="text-muted">Leave Management System</p>
                </div>

                {error && (
                  <Alert variant="danger" className="login-alert" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-control-lg"
                      autoComplete="email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="form-label">Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="form-control-lg"
                      autoComplete="current-password"
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 login-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted demo-credentials">
                    <strong>Quick Demo Login:</strong>
                    <div className="demo-buttons mt-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2 mb-1"
                        onClick={() => handleDemoLogin('admin')}
                        disabled={loading}
                      >
                        Admin
                      </Button>
                      <Button 
                        variant="outline-success" 
                        size="sm" 
                        className="me-2 mb-1"
                        onClick={() => handleDemoLogin('hr')}
                        disabled={loading}
                      >
                        HR
                      </Button>
                      <Button 
                        variant="outline-warning" 
                        size="sm" 
                        className="mb-1"
                        onClick={() => handleDemoLogin('manager')}
                        disabled={loading}
                      >
                        Manager
                      </Button>
                    </div>
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;