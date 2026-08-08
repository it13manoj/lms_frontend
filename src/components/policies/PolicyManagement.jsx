import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Row, Col,
  Badge, Spinner, Alert, Tabs, Tab
} from 'react-bootstrap';
import {
  FaPlus, FaEdit, FaTrash, FaFilePdf, FaFileWord,
  FaFileAlt, FaDownload, FaEye, FaSearch, FaFilter
} from 'react-icons/fa';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PolicyManagement.css';

const PolicyManagement = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/policies/all');
      setPolicies(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    policy_type: Yup.string().required('Policy type is required'),
    category: Yup.string().required('Category is required'),
    description: Yup.string().required('Description is required'),
    version: Yup.string().required('Version is required'),
    effective_date: Yup.date().required('Effective date is required'),
    file_url: Yup.string().url('Please enter a valid URL')
  });

  const handleSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);
      setError('');

      if (editing && selectedPolicy) {
        await api.put(`/policies/${selectedPolicy.id}`, values);
      } else {
        await api.post('/policies', values);
      }

      fetchPolicies();
      resetForm();
      setShowModal(false);
      setEditing(false);
      setSelectedPolicy(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/policies/${selectedPolicy.id}`);
      fetchPolicies();
      setShowDeleteModal(false);
      setSelectedPolicy(null);
    } catch (error) {
      setError('Failed to delete policy');
    }
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setEditing(true);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedPolicy(null);
    setEditing(false);
    setShowModal(true);
  };

  const getPolicyTypeIcon = (type) => {
    const icons = {
      'hr': <FaFileWord />,
      'company': <FaFilePdf />,
      'employee': <FaFileAlt />,
      'manager': <FaFileAlt />,
      'sales': <FaFileAlt />,
      'team': <FaFileAlt />
    };
    return icons[type] || <FaFileAlt />;
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      draft: 'warning',
      archived: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(search.toLowerCase()) ||
                          policy.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || policy.policy_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="policy-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Policy Management</h2>
          <p className="text-muted">Create and manage company policies</p>
        </div>
        <Button variant="primary" onClick={handleAddNew}>
          <FaPlus className="me-2" />
          Add New Policy
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <Form.Control
                    type="text"
                    placeholder="Search policies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Filter by Type</Form.Label>
                <Form.Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Policies</option>
                  <option value="hr">HR Policies</option>
                  <option value="company">Company Policies</option>
                  <option value="employee">Employee Policies</option>
                  <option value="manager">Manager Policies</option>
                  <option value="sales">Sales Policies</option>
                  <option value="team">Team Policies</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" className="w-100" onClick={fetchPolicies}>
                <FaFilter className="me-2" />
                Refresh
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover className="mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Version</th>
                <th>Effective Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="empty-state">
                      <FaFileAlt size={48} className="text-muted mb-3" />
                      <h5>No policies found</h5>
                      <p className="text-muted">
                        {search || filterType !== 'all' 
                          ? 'No policies match your filters' 
                          : 'Start by adding your first policy'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr key={policy.id}>
                    <td>
                      <div className="policy-title">
                        <span className="policy-icon">
                          {getPolicyTypeIcon(policy.policy_type)}
                        </span>
                        <div>
                          <strong>{policy.title}</strong>
                          {policy.description && (
                            <div className="text-muted small">{policy.description.substring(0, 50)}...</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="info" className="text-uppercase">
                        {policy.policy_type}
                      </Badge>
                    </td>
                    <td>{policy.category || 'N/A'}</td>
                    <td>
                      <Badge bg="secondary">v{policy.version || '1.0'}</Badge>
                    </td>
                    <td>
                      {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>{getStatusBadge(policy.status)}</td>
                    <td>
                      <div className="action-buttons">
                        {policy.file_url && (
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => window.open(policy.file_url, '_blank')}
                          >
                            <FaDownload />
                          </Button>
                        )}
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleEdit(policy)}
                        >
                          <FaEdit />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editing ? 'Edit Policy' : 'Add New Policy'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              title: selectedPolicy?.title || '',
              policy_type: selectedPolicy?.policy_type || '',
              category: selectedPolicy?.category || '',
              description: selectedPolicy?.description || '',
              version: selectedPolicy?.version || '1.0',
              effective_date: selectedPolicy?.effective_date || '',
              file_url: selectedPolicy?.file_url || '',
              status: selectedPolicy?.status || 'active'
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue }) => (
              <FormikForm>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Field 
                    type="text" 
                    name="title" 
                    className="form-control"
                    placeholder="Enter policy title"
                  />
                  <ErrorMessage name="title" component="div" className="text-danger" />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Policy Type *</Form.Label>
                      <Field as="select" name="policy_type" className="form-select">
                        <option value="">Select type</option>
                        <option value="hr">HR Policy</option>
                        <option value="company">Company Policy</option>
                        <option value="employee">Employee Policy</option>
                        <option value="manager">Manager Policy</option>
                        <option value="sales">Sales Policy</option>
                        <option value="team">Team Policy</option>
                      </Field>
                      <ErrorMessage name="policy_type" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category *</Form.Label>
                      <Field 
                        type="text" 
                        name="category" 
                        className="form-control"
                        placeholder="e.g., Leave Policy"
                      />
                      <ErrorMessage name="category" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Field 
                    as="textarea" 
                    name="description" 
                    rows="4"
                    className="form-control"
                    placeholder="Describe the policy in detail..."
                  />
                  <ErrorMessage name="description" component="div" className="text-danger" />
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Version *</Form.Label>
                      <Field 
                        type="text" 
                        name="version" 
                        className="form-control"
                        placeholder="1.0"
                      />
                      <ErrorMessage name="version" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Effective Date *</Form.Label>
                      <Field 
                        type="date" 
                        name="effective_date" 
                        className="form-control"
                      />
                      <ErrorMessage name="effective_date" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Field as="select" name="status" className="form-select">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </Field>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>File URL (Optional)</Form.Label>
                  <Field 
                    type="url" 
                    name="file_url" 
                    className="form-control"
                    placeholder="https://example.com/policy.pdf"
                  />
                  <ErrorMessage name="file_url" component="div" className="text-danger" />
                  <Form.Text className="text-muted">
                    Upload document to cloud storage and paste the URL here
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        {editing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editing ? 'Update Policy' : 'Create Policy'
                    )}
                  </Button>
                </div>
              </FormikForm>
            )}
          </Formik>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete the policy{' '}
            <strong>"{selectedPolicy?.title}"</strong>?
          </p>
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Policy
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PolicyManagement;