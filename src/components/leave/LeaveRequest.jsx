import React, { useState, useEffect } from 'react';
import { 
  Form, Button, Card, Row, Col, Alert, 
  Spinner, Badge, Table 
} from 'react-bootstrap';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './LeaveRequest.css';

const LeaveRequest = () => {
  const { user } = useAuth();
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        api.get('/leave/balance'),
        api.get('/leave/history')
      ]);
      setLeaveBalance(balanceRes.data.data);
      setLeaveHistory(historyRes.data.data || []);
    } catch (error) {
      setError('Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    leave_type: Yup.string().required('Leave type is required'),
    start_date: Yup.date().required('Start date is required'),
    end_date: Yup.date().required('End date is required'),
    reason: Yup.string().required('Reason is required').min(10, 'Reason must be at least 10 characters')
  });

  const handleSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);
      setError('');
      await api.post('/leave/request', values);
      setSuccess('Leave request submitted successfully!');
      resetForm();
      fetchLeaveData();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="leave-request">
      <h2 className="mb-4">Leave Management</h2>

      <Row className="mb-4">
        <Col md={3}>
          <Card className="leave-balance-card">
            <Card.Body>
              <h6 className="text-muted">Annual Leave</h6>
              <h3>{leaveBalance?.annual?.remaining || 0}</h3>
              <small>of {leaveBalance?.annual?.total || 20} days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="leave-balance-card">
            <Card.Body>
              <h6 className="text-muted">Sick Leave</h6>
              <h3>{leaveBalance?.sick?.remaining || 0}</h3>
              <small>of {leaveBalance?.sick?.total || 10} days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="leave-balance-card">
            <Card.Body>
              <h6 className="text-muted">Casual Leave</h6>
              <h3>{leaveBalance?.casual?.remaining || 0}</h3>
              <small>of {leaveBalance?.casual?.total || 5} days</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="leave-balance-card">
            <Card.Body>
              <h6 className="text-muted">Used This Year</h6>
              <h3>{leaveBalance?.used || 0}</h3>
              <small>days taken</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Request Leave</h5>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Formik
                initialValues={{
                  leave_type: '',
                  start_date: '',
                  end_date: '',
                  reason: '',
                  attachment: null
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ values, setFieldValue }) => (
                  <FormikForm>
                    <Form.Group className="mb-3">
                      <Form.Label>Leave Type</Form.Label>
                      <Field as="select" name="leave_type" className="form-select">
                        <option value="">Select leave type</option>
                        <option value="annual">Annual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="casual">Casual Leave</option>
                        <option value="maternity">Maternity Leave</option>
                        <option value="paternity">Paternity Leave</option>
                        <option value="other">Other</option>
                      </Field>
                      <ErrorMessage name="leave_type" component="div" className="text-danger" />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Start Date</Form.Label>
                          <Field type="date" name="start_date" className="form-control" />
                          <ErrorMessage name="start_date" component="div" className="text-danger" />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>End Date</Form.Label>
                          <Field type="date" name="end_date" className="form-control" />
                          <ErrorMessage name="end_date" component="div" className="text-danger" />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Reason</Form.Label>
                      <Field 
                        as="textarea" 
                        name="reason" 
                        rows="4"
                        className="form-control"
                        placeholder="Please provide a detailed reason for your leave request..."
                      />
                      <ErrorMessage name="reason" component="div" className="text-danger" />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Attachment (Optional)</Form.Label>
                      <Form.Control
                        type="file"
                        onChange={(event) => {
                          setFieldValue('attachment', event.currentTarget.files[0]);
                        }}
                      />
                    </Form.Group>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={submitting}
                      className="w-100"
                    >
                      {submitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </Button>
                  </FormikForm>
                )}
              </Formik>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Leave History</h5>
            </Card.Header>
            <Card.Body>
              {leaveHistory.length === 0 ? (
                <p className="text-center text-muted">No leave history</p>
              ) : (
                <div className="leave-history">
                  {leaveHistory.slice(0, 5).map((leave) => (
                    <div key={leave.id} className="leave-history-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{leave.leave_type.toUpperCase()}</h6>
                          <small className="text-muted">
                            <FaCalendarAlt className="me-1" />
                            {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          </small>
                        </div>
                        <div>
                          <Badge bg={
                            leave.status === 'approved' ? 'success' :
                            leave.status === 'pending' ? 'warning' : 'danger'
                          }>
                            {leave.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mb-0 mt-2 text-muted small">{leave.reason}</p>
                      <hr />
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LeaveRequest;