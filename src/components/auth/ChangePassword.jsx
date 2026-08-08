import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaLock, FaKey, FaCheck, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './ChangePassword.css';

const ChangePassword = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'newPassword') {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 20;
    if (password.length >= 10) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    setPasswordStrength(strength);
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return 'danger';
    if (passwordStrength < 70) return 'warning';
    return 'success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });

      setSuccess('Password updated successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordStrength(0);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="d-flex align-items-center mb-4">
        <Link to="/profile" className="btn btn-outline-secondary me-3">
          <FaArrowLeft />
        </Link>
        <h2 className="mb-0">Change Password</h2>
      </div>

      <Card className="password-card">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type="password"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                />
                <FaKey className="input-icon" />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                />
                <FaKey className="input-icon" />
              </div>
              {formData.newPassword && (
                <div className="password-strength mt-2">
                  <div className="strength-bar">
                    <div 
                      className={`strength-fill bg-${getStrengthColor()}`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                  <span className={`strength-label text-${getStrengthColor()}`}>
                    {getStrengthLabel()}
                  </span>
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <div className="password-input-wrapper">
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {formData.confirmPassword && (
                  formData.newPassword === formData.confirmPassword ? (
                    <FaCheck className="input-icon text-success" />
                  ) : (
                    <FaTimes className="input-icon text-danger" />
                  )
                )}
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <small className="text-danger">Passwords do not match</small>
              )}
            </Form.Group>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                <>
                  <FaLock className="me-2" />
                  Update Password
                </>
              )}
            </Button>
          </Form>

          <div className="password-rules mt-4">
            <h6>Password Requirements:</h6>
            <ul className="list-unstyled">
              <li className={formData.newPassword.length >= 6 ? 'text-success' : 'text-muted'}>
                {formData.newPassword.length >= 6 ? '✅' : '❌'} At least 6 characters
              </li>
              <li className={/[a-z]/.test(formData.newPassword) ? 'text-success' : 'text-muted'}>
                {/[a-z]/.test(formData.newPassword) ? '✅' : '❌'} Contains lowercase letter
              </li>
              <li className={/[A-Z]/.test(formData.newPassword) ? 'text-success' : 'text-muted'}>
                {/[A-Z]/.test(formData.newPassword) ? '✅' : '❌'} Contains uppercase letter
              </li>
              <li className={/[0-9]/.test(formData.newPassword) ? 'text-success' : 'text-muted'}>
                {/[0-9]/.test(formData.newPassword) ? '✅' : '❌'} Contains number
              </li>
              <li className={/[^a-zA-Z0-9]/.test(formData.newPassword) ? 'text-success' : 'text-muted'}>
                {/[^a-zA-Z0-9]/.test(formData.newPassword) ? '✅' : '❌'} Contains special character
              </li>
            </ul>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ChangePassword;