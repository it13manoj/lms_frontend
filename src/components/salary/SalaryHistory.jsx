import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert, Form, Row, Col, Button } from 'react-bootstrap';
import { FaEye, FaFileInvoiceDollar, FaCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './SalaryHistory.css';

const SalaryHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalaryHistory();
  }, [year]);

  const fetchSalaryHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/salary/history', {
        params: { year }
      });
      setHistory(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch salary history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'success',
      pending: 'warning',
      cancelled: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'} className="text-uppercase">{status || 'Pending'}</Badge>;
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="salary-history container-fluid px-2 px-md-4 py-3">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-3 shadow-sm border">
        <div>
          <h2 className="fs-4 fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <FaFileInvoiceDollar className="text-primary" />
            <span>Salary & Payroll History</span>
          </h2>
          <div className="text-muted small">
            View past generated salary slips and payment status records
          </div>
        </div>
        <Button variant="outline-primary" onClick={() => navigate('/salary')}>
          View Current Salary Slip
        </Button>
      </div>

      <div className="bg-white p-3 rounded-3 shadow-sm border mb-4">
        <Row className="g-3 align-items-center">
          <Col xs={12} sm={4} md={3}>
            <Form.Group>
              <Form.Label className="small text-muted fw-bold mb-1">Select Year</Form.Label>
              <Form.Select 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="fw-semibold"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} sm={8} md={9} className="d-flex align-items-end justify-content-sm-end">
            <Button variant="outline-secondary" onClick={fetchSalaryHistory}>
              Refresh History
            </Button>
          </Col>
        </Row>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Loading salary history records...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Month</th>
                    <th>Employee</th>
                    <th>Base Salary</th>
                    <th>Absent Deduction (LOP)</th>
                    <th>Other Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <FaCalendarAlt size={36} className="mb-2 opacity-50" />
                        <div>No salary records found for {year}</div>
                        <div className="small">Generate or finalize salary slips to view them in history.</div>
                      </td>
                    </tr>
                  ) : (
                    history.map((record) => (
                      <tr key={record.id}>
                        <td className="fw-bold text-dark font-monospace">
                          {record.month_year ? record.month_year.substring(0, 7) : '-'}
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {record.Employee ? `${record.Employee.first_name} ${record.Employee.last_name}` : 'Employee'}
                          </div>
                          <div className="text-muted small">{record.Employee?.employee_id || ''}</div>
                        </td>
                        <td>{formatCurrency(record.basic_salary)}</td>
                        <td className="text-danger fw-semibold">
                          -{formatCurrency(record.absent_deduction || record.deductions)}
                        </td>
                        <td>
                          {formatCurrency(Math.max(0, (record.deductions || 0) - (record.absent_deduction || 0)))}
                        </td>
                        <td className="text-success fw-bold">
                          {formatCurrency(record.net_salary)}
                        </td>
                        <td>{getStatusBadge(record.status)}</td>
                        <td>{record.payment_date || '-'}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => navigate('/salary')}
                            title="View Salary Slip"
                            className="d-flex align-items-center gap-1"
                          >
                            <FaEye size={12} />
                            <span>View Slip</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default SalaryHistory;