import React, { useState, useEffect } from 'react';
import {
  Card, Table, Badge, Spinner, Alert,
  Form, Row, Col, Button, Pagination,
  Modal, InputGroup
} from 'react-bootstrap';
import {
  FaDownload, FaFilter, FaSearch, FaEye,
  FaPrint, FaFilePdf, FaMoneyBillWave,
  FaCalendarAlt, FaUser, FaCreditCard,
  FaCheckCircle, FaTimesCircle, FaClock,
  FaSync
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PaymentHistory.css';

const PaymentHistory = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalPayments: 0,
    pendingCount: 0,
    completedCount: 0
  });

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  useEffect(() => {
    fetchPayments();
    fetchSummary();
  }, [filters, pagination.page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments', {
        params: {
          ...filters,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setPayments(response.data.data || []);
      setPagination({
        ...pagination,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0
      });
    } catch (error) {
      setError('Failed to fetch payment history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/payments/summary');
      setSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch summary');
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

  const handleSearch = () => {
    fetchPayments();
  };

  const handleReset = () => {
    setFilters({
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPagination({ ...pagination, page: 1 });
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger'
    };
    const icons = {
      completed: <FaCheckCircle className="me-1" />,
      pending: <FaClock className="me-1" />,
      failed: <FaTimesCircle className="me-1" />
    };
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type) => {
    const variants = {
      salary: 'primary',
      bonus: 'success',
      reimbursement: 'info',
      advance: 'warning'
    };
    const icons = {
      salary: <FaMoneyBillWave className="me-1" />,
      bonus: <FaMoneyBillWave className="me-1" />,
      reimbursement: <FaCreditCard className="me-1" />,
      advance: <FaMoneyBillWave className="me-1" />
    };
    return (
      <Badge bg={variants[type] || 'secondary'}>
        {icons[type]}
        {type}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download receipt');
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
    <div className="payment-history">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Payment History</h2>
          <p className="text-muted">View and manage all payment transactions</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={fetchPayments}>
            <FaSync className="me-2" />
            Refresh
          </Button>
          <Button variant="outline-primary">
            <FaFilePdf className="me-2" />
            Export Report
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="summary-card">
            <Card.Body>
              <h6 className="text-muted">Total Payments</h6>
              <h3>{summary.totalPayments}</h3>
              <small className="text-muted">All transactions</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-success bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted">Total Amount</h6>
              <h3>{formatCurrency(summary.totalAmount)}</h3>
              <small className="text-muted">All payments</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-warning bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted">Pending</h6>
              <h3>{summary.pendingCount}</h3>
              <small className="text-muted">Awaiting processing</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-success bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted">Completed</h6>
              <h3>{summary.completedCount}</h3>
              <small className="text-muted">Successfully processed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Payment Type</Form.Label>
                <Form.Select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="">All Types</option>
                  <option value="salary">Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="advance">Advance</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
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
            <Col md={2}>
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
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    name="search"
                    placeholder="Search by employee or reference..."
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                  <Button variant="primary" onClick={handleSearch}>
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-3">
            <Col className="d-flex gap-2">
              <Button variant="primary" onClick={handleSearch}>
                <FaFilter className="me-2" />
                Apply Filters
              </Button>
              <Button variant="outline-secondary" onClick={handleReset}>
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Payment Table */}
      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover className="payment-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="empty-state">
                      <FaMoneyBillWave size={48} className="text-muted mb-3" />
                      <h5>No payments found</h5>
                      <p className="text-muted">
                        {Object.values(filters).some(f => f) 
                          ? 'No payments match your filters' 
                          : 'No payment records available'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <code className="reference-code">{payment.reference_number || 'N/A'}</code>
                    </td>
                    <td>
                      <div className="employee-info">
                        <FaUser className="text-primary me-2" />
                        <div>
                          <div className="fw-bold">{payment.employee_name || 'N/A'}</div>
                          <small className="text-muted">{payment.employee_id || 'N/A'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{getPaymentTypeBadge(payment.payment_type)}</td>
                    <td>
                      <strong className="amount">{formatCurrency(payment.amount)}</strong>
                    </td>
                    <td>
                      <div className="date-info">
                        <FaCalendarAlt className="text-muted me-1" />
                        {formatDate(payment.payment_date)}
                      </div>
                    </td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewDetails(payment)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        {payment.status === 'completed' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment.id)}
                            title="Download Receipt"
                          >
                            <FaDownload />
                          </Button>
                        )}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title="Print"
                          onClick={() => window.print()}
                        >
                          <FaPrint />
                        </Button>
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
              Showing {payments.length} of {pagination.total} entries
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

      {/* Payment Details Modal */}
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaMoneyBillWave className="me-2" />
            Payment Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPayment && (
            <div className="payment-details">
              <Row>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Reference Number</label>
                    <div className="detail-value">
                      <code>{selectedPayment.reference_number || 'N/A'}</code>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Status</label>
                    <div className="detail-value">
                      {getStatusBadge(selectedPayment.status)}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Employee</label>
                    <div className="detail-value">
                      <FaUser className="me-2" />
                      {selectedPayment.employee_name || 'N/A'}
                      <br />
                      <small className="text-muted">ID: {selectedPayment.employee_id || 'N/A'}</small>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Payment Type</label>
                    <div className="detail-value">
                      {getPaymentTypeBadge(selectedPayment.payment_type)}
                    </div>
                  </div>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Amount</label>
                    <div className="detail-value amount-display">
                      {formatCurrency(selectedPayment.amount)}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-group">
                    <label>Payment Date</label>
                    <div className="detail-value">
                      <FaCalendarAlt className="me-2" />
                      {formatDate(selectedPayment.payment_date)}
                    </div>
                  </div>
                </Col>
              </Row>

              <div className="detail-group">
                <label>Description</label>
                <div className="detail-value description">
                  {selectedPayment.description || 'No description provided'}
                </div>
              </div>

              <div className="detail-group">
                <label>Created By</label>
                <div className="detail-value">
                  {selectedPayment.created_by_name || 'System'}
                  <br />
                  <small className="text-muted">
                    Created at: {formatDate(selectedPayment.created_at)}
                  </small>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {selectedPayment?.status === 'completed' && (
            <Button 
              variant="primary" 
              onClick={() => handleDownloadReceipt(selectedPayment.id)}
            >
              <FaDownload className="me-2" />
              Download Receipt
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PaymentHistory;