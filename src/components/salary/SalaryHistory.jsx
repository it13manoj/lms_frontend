import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert, Form, Row, Col, Button } from 'react-bootstrap';
import { FaDownload, FaEye } from 'react-icons/fa';
import api from '../../services/api';
import './SalaryHistory.css';

const SalaryHistory = () => {
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
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="salary-history">
      <h2 className="mb-4">Salary History</h2>

      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Year</Form.Label>
            <Form.Select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={8} className="d-flex align-items-end">
          <Button variant="outline-secondary" onClick={fetchSalaryHistory}>
            Refresh
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Body className="table-responsive">
          <Table striped hover className="mb-0">
            <thead>
              <tr>
                <th>Month</th>
                <th>Basic Salary</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No salary records found for {year}
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id}>
                    <td>{record.month}</td>
                    <td>${record.basic_salary?.toFixed(2) || '0.00'}</td>
                    <td>${record.allowances?.toFixed(2) || '0.00'}</td>
                    <td>${record.deductions?.toFixed(2) || '0.00'}</td>
                    <td>
                      <strong>${record.net_salary?.toFixed(2) || '0.00'}</strong>
                    </td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td>{record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm">
                          <FaEye />
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <FaDownload />
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
    </div>
  );
};

export default SalaryHistory;