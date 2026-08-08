import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Card, Form, Row, Col, 
  Badge, Modal, Spinner, Alert, InputGroup 
} from 'react-bootstrap';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaSearch, 
  FaUser, FaEnvelope, FaPhone, FaBuilding,
  FaBriefcase, FaCalendar, FaMoneyBillWave,
  FaSave, FaTimes, FaUserPlus
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './EmployeeList.css';

const EmployeeList = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  useEffect(() => {
    fetchEmployees();
  }, [search, department, pagination.page]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees', {
        params: { 
          search, 
          department,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setEmployees(response.data.data || []);
      setPagination({
        ...pagination,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0
      });
    } catch (error) {
      setError('Failed to fetch employees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required('First name is required'),
    last_name: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    phone: Yup.string(),
    department: Yup.string().required('Department is required'),
    position: Yup.string().required('Position is required'),
    joining_date: Yup.date().required('Joining date is required'),
    salary: Yup.number().min(0, 'Salary must be positive'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .when('$isNew', {
        is: true,
        then: Yup.string().required('Password is required for new employees')
      })
  });

  const handleSubmit = async (values, { resetForm }) => {
    try {
      setSubmitting(true);
      setError('');

      if (editing && selectedEmployee) {
        // Update existing employee
        await api.put(`/employees/${selectedEmployee.id}`, values);
      } else {
        // Create new employee with user account
        await api.post('/auth/register', {
          email: values.email,
          password: values.password,
          role: 'employee',
          employeeData: {
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            phone: values.phone,
            department: values.department,
            position: values.position,
            joining_date: values.joining_date,
            salary: values.salary
          }
        });
      }

      resetForm();
      setShowModal(false);
      setEditing(false);
      setSelectedEmployee(null);
      fetchEmployees();
      
      // Show success message
      alert(editing ? 'Employee updated successfully!' : 'Employee added successfully!');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${selectedEmployee.id}`);
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      setError('Failed to delete employee');
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setEditing(true);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedEmployee(null);
    setEditing(false);
    setShowModal(true);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'danger',
      hr: 'primary',
      manager: 'warning',
      employee: 'info',
      sales: 'success',
      team: 'secondary'
    };
    return colors[role] || 'secondary';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="employee-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Employees</h2>
          <p className="text-muted">Manage your workforce</p>
        </div>
        {isAdminOrHR && (
          <Button variant="primary" onClick={handleAddNew}>
            <FaUserPlus className="me-2" />
            Add Employee
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Form.Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  <option value="Administration">Administration</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Finance">Finance</option>
                  <option value="IT">IT</option>
                  <option value="Operations">Operations</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" className="w-100" onClick={fetchEmployees}>
                <FaSearch className="me-2" />
                Filter
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
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Position</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <div className="empty-state">
                      <FaUser size={48} className="text-muted mb-3" />
                      <h5>No employees found</h5>
                      <p className="text-muted">
                        {search || department ? 
                          'No employees match your filters' : 
                          'Start by adding your first employee'}
                      </p>
                      {isAdminOrHR && !search && !department && (
                        <Button variant="primary" size="sm" onClick={handleAddNew}>
                          <FaPlus className="me-2" />
                          Add Employee
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.employee_id}</strong>
                    </td>
                    <td>
                      <div className="employee-name">
                        {employee.first_name} {employee.last_name}
                      </div>
                    </td>
                    <td>{employee.email}</td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.position || '-'}</td>
                    <td>
                      <Badge bg={getRoleBadgeColor(employee.User?.role)}>
                        {employee.User?.role || 'employee'}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={employee.User?.status === 'active' ? 'success' : 'danger'}>
                        {employee.User?.status || 'inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/employees/${employee.id}`}>
                          <Button variant="outline-info" size="sm" title="View Profile">
                            <FaEye />
                          </Button>
                        </Link>
                        {isAdminOrHR && (
                          <>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleEdit(employee)}
                              title="Edit Employee"
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowDeleteModal(true);
                              }}
                              title="Delete Employee"
                            >
                              <FaTrash />
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
        {pagination.totalPages > 1 && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} entries
              </span>
              <div className="pagination-buttons">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="mx-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Add/Edit Employee Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editing ? (
              <>
                <FaEdit className="me-2" />
                Edit Employee
              </>
            ) : (
              <>
                <FaUserPlus className="me-2" />
                Add New Employee
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Formik
            initialValues={{
              first_name: selectedEmployee?.first_name || '',
              last_name: selectedEmployee?.last_name || '',
              email: selectedEmployee?.email || '',
              phone: selectedEmployee?.phone || '',
              department: selectedEmployee?.department || '',
              position: selectedEmployee?.position || '',
              joining_date: selectedEmployee?.joining_date || '',
              salary: selectedEmployee?.salary || '',
              password: ''
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            context={{ isNew: !editing }}
          >
            {({ values, setFieldValue, isSubmitting }) => (
              <FormikForm>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name *</Form.Label>
                      <Field 
                        type="text" 
                        name="first_name" 
                        className="form-control"
                        placeholder="Enter first name"
                      />
                      <ErrorMessage name="first_name" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name *</Form.Label>
                      <Field 
                        type="text" 
                        name="last_name" 
                        className="form-control"
                        placeholder="Enter last name"
                      />
                      <ErrorMessage name="last_name" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Field 
                        type="email" 
                        name="email" 
                        className="form-control"
                        placeholder="Enter email address"
                        disabled={editing}
                      />
                      <ErrorMessage name="email" component="div" className="text-danger" />
                      {editing && (
                        <Form.Text className="text-muted">
                          Email cannot be changed
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Field 
                        type="text" 
                        name="phone" 
                        className="form-control"
                        placeholder="Enter phone number"
                      />
                      <ErrorMessage name="phone" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                </Row>

                {!editing && (
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Field 
                      type="password" 
                      name="password" 
                      className="form-control"
                      placeholder="Enter password (min 6 characters)"
                    />
                    <ErrorMessage name="password" component="div" className="text-danger" />
                    <Form.Text className="text-muted">
                      Password must be at least 6 characters long
                    </Form.Text>
                  </Form.Group>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department *</Form.Label>
                      <Field as="select" name="department" className="form-select">
                        <option value="">Select Department</option>
                        <option value="Administration">Administration</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Finance">Finance</option>
                        <option value="IT">IT</option>
                        <option value="Operations">Operations</option>
                      </Field>
                      <ErrorMessage name="department" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Position *</Form.Label>
                      <Field 
                        type="text" 
                        name="position" 
                        className="form-control"
                        placeholder="Enter position"
                      />
                      <ErrorMessage name="position" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Joining Date *</Form.Label>
                      <Field 
                        type="date" 
                        name="joining_date" 
                        className="form-control"
                      />
                      <ErrorMessage name="joining_date" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Salary</Form.Label>
                      <Field 
                        type="number" 
                        name="salary" 
                        className="form-control"
                        placeholder="Enter salary amount"
                        min="0"
                        step="100"
                      />
                      <ErrorMessage name="salary" component="div" className="text-danger" />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button variant="secondary" onClick={() => setShowModal(false)}>
                    <FaTimes className="me-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        {editing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        {editing ? 'Update Employee' : 'Create Employee'}
                      </>
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
        <Modal.Title>
            <FaTrash className="text-danger me-2" />
            Delete Employee
        </Modal.Title>
    </Modal.Header>
    <Modal.Body>
        <p>
            Are you sure you want to delete employee{' '}
            <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>?
        </p>
        <div className="employee-summary">
            <p><strong>Employee ID:</strong> {selectedEmployee?.employee_id}</p>
            <p><strong>Email:</strong> {selectedEmployee?.email}</p>
            <p><strong>Department:</strong> {selectedEmployee?.department}</p>
        </div>
        <Alert variant="warning">
            <strong>Note:</strong> This will soft delete the employee. 
            The data will be preserved and can be restored later.
        </Alert>
        <Form.Group>
            <Form.Check 
                type="checkbox"
                id="permanent-delete"
                label="Permanently delete (cannot be restored)"
                className="mt-2"
                onChange={(e) => {
                    // Handle permanent delete option
                }}
            />
        </Form.Group>
    </Modal.Body>
    <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete}>
            <FaTrash className="me-2" />
            Soft Delete
        </Button>
    </Modal.Footer>
</Modal>
    </div>
  );
};

export default EmployeeList;