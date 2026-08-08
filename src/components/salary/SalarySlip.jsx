import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Table, Badge, Button, 
  Spinner, Alert, Form 
} from 'react-bootstrap';
import { FaDownload, FaPrint, FaMoneyBillWave } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SalarySlip.css';

const SalarySlip = () => {
  const { user } = useAuth();
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthYear);
    if (monthYear) {
      fetchSalaryData(monthYear);
    }
  }, []);

  const fetchSalaryData = async (monthYear) => {
    try {
      setLoading(true);
      const response = await api.get('/salary', {
        params: { month: monthYear }
      });
      setSalaryData(response.data.data);
    } catch (error) {
      setError('Failed to fetch salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const value = e.target.value;
    setSelectedMonth(value);
    if (value) {
      fetchSalaryData(value);
    }
  };

  const handleDownload = () => {
    // Implement PDF download logic
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!salaryData) {
    return (
      <Alert variant="info">
        No salary data available for the selected month.
      </Alert>
    );
  }

  return (
    <div className="salary-slip">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Salary Slip</h2>
        <div className="d-flex gap-2">
          <Form.Control
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            style={{ width: '200px' }}
          />
          <Button variant="outline-primary" onClick={handleDownload}>
            <FaDownload className="me-2" />
            Download
          </Button>
          <Button variant="outline-secondary" onClick={handlePrint}>
            <FaPrint className="me-2" />
            Print
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="salary-slip-card">
        <Card.Body>
          <div className="salary-slip-header text-center">
            <h3>Company Name</h3>
            <p className="text-muted">Salary Slip for the month of {salaryData.month}</p>
            <Badge bg={salaryData.status === 'paid' ? 'success' : 'warning'}>
              {salaryData.status || 'Pending'}
            </Badge>
          </div>

          <hr />

          <Row className="mb-4">
            <Col md={6}>
              <p><strong>Employee:</strong> {salaryData.employee_name}</p>
              <p><strong>Employee ID:</strong> {salaryData.employee_id}</p>
              <p><strong>Department:</strong> {salaryData.department}</p>
              <p><strong>Position:</strong> {salaryData.position}</p>
            </Col>
            <Col md={6}>
              <p><strong>Payment Date:</strong> {salaryData.payment_date || 'N/A'}</p>
              <p><strong>Bank Account:</strong> {salaryData.bank_account || 'N/A'}</p>
            </Col>
          </Row>

          <Table bordered className="salary-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-primary">
                <td><strong>Earnings</strong></td>
                <td className="text-end"></td>
              </tr>
              <tr>
                <td>Basic Salary</td>
                <td className="text-end">${salaryData.basic_salary?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>House Allowance</td>
                <td className="text-end">${salaryData.house_allowance?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Transport Allowance</td>
                <td className="text-end">${salaryData.transport_allowance?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Bonus</td>
                <td className="text-end">${salaryData.bonus?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr className="table-primary">
                <td><strong>Total Earnings</strong></td>
                <td className="text-end"><strong>${salaryData.total_earnings?.toFixed(2) || '0.00'}</strong></td>
              </tr>
              <tr className="table-danger">
                <td><strong>Deductions</strong></td>
                <td className="text-end"></td>
              </tr>
              <tr>
                <td>Income Tax</td>
                <td className="text-end">${salaryData.income_tax?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Health Insurance</td>
                <td className="text-end">${salaryData.health_insurance?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Pension</td>
                <td className="text-end">${salaryData.pension?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr className="table-danger">
                <td><strong>Total Deductions</strong></td>
                <td className="text-end"><strong>${salaryData.total_deductions?.toFixed(2) || '0.00'}</strong></td>
              </tr>
              <tr className="table-success">
                <td><strong>Net Salary</strong></td>
                <td className="text-end"><strong>${salaryData.net_salary?.toFixed(2) || '0.00'}</strong></td>
              </tr>
            </tbody>
          </Table>

          <div className="salary-notes mt-3">
            <h6>Notes:</h6>
            <p className="text-muted small">{salaryData.notes || 'No additional notes.'}</p>
          </div>

          <div className="salary-footer text-center mt-4">
            <small className="text-muted">
              This is a computer-generated document and does not require a signature.
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SalarySlip;