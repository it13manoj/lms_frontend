import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Card, Row, Col, Table, Badge, Button, 
  Spinner, Alert, Form, Modal 
} from 'react-bootstrap';
import { 
  FaPrint, FaMoneyBillWave, FaUserTie, 
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaBuilding,
  FaFileInvoiceDollar, FaCalculator, FaSave, FaCheck
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SalarySlip.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SalarySlip = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  const now = new Date();
  const paramYear = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : 2026;
  const paramMonth = searchParams.get('month') ? parseInt(searchParams.get('month'), 10) : 9;
  const paramEmpId = searchParams.get('employeeId') || '';

  const [selectedYear, setSelectedYear] = useState(paramYear);
  const [selectedMonth, setSelectedMonth] = useState(paramMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(paramEmpId);
  
  const [salaryData, setSalaryData] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Finalize / Mark as Paid Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customBonus, setCustomBonus] = useState(0);
  const [customOtherDeductions, setCustomOtherDeductions] = useState(0);
  const [paymentDate, setPaymentDate] = useState(now.toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  // Sync state if URL query params change
  useEffect(() => {
    const qEmpId = searchParams.get('employeeId');
    const qYear = searchParams.get('year');
    const qMonth = searchParams.get('month');
    if (qEmpId && qEmpId !== selectedEmployeeId) setSelectedEmployeeId(qEmpId);
    if (qYear && parseInt(qYear, 10) !== selectedYear) setSelectedYear(parseInt(qYear, 10));
    if (qMonth && parseInt(qMonth, 10) !== selectedMonth) setSelectedMonth(parseInt(qMonth, 10));
  }, [searchParams]);

  // Initial load
  useEffect(() => {
    fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth);
  }, [selectedEmployeeId, selectedYear, selectedMonth]);

  const fetchSalarySlip = async (empId, yr, mo) => {
    try {
      setLoading(true);
      setError('');
      setActionSuccess('');

      const params = {
        year: yr,
        month: mo
      };
      if (empId) params.employeeId = empId;

      const response = await api.get('/salary/slip', { params });
      if (response.data && response.data.success) {
        const data = response.data.data;
        setSalaryData(data);
        if (data.employeesList && data.employeesList.length > 0) {
          setEmployeesList(data.employeesList);
        }
        if (!selectedEmployeeId && data.employee?.id) {
          setSelectedEmployeeId(data.employee.id);
        }

        // Initialize modal fields with current values
        setCustomBonus(data.salary?.bonus || 0);
        setCustomOtherDeductions(data.salary?.deductions?.otherDeductions || 0);
        setPaymentStatus(data.status || 'pending');
        setPaymentDate(data.paymentDate || now.toISOString().slice(0, 10));
        setPaymentMethod(data.paymentMethod || 'Bank Transfer');
        setNotes(data.notes || '');
      } else {
        setError(response.data?.message || 'Failed to load salary slip');
      }
    } catch (err) {
      console.error('Error fetching salary slip:', err);
      setError(err.response?.data?.message || 'Error generating salary slip. Please ensure salary is configured in employee profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(prev => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(prev => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Save / Finalize Salary to Database (Admin/HR)
  const handleSaveSalary = async () => {
    if (!salaryData?.employee?.id) return;
    try {
      setSavingSalary(true);
      const payload = {
        employee_id: salaryData.employee.id,
        year: selectedYear,
        month: selectedMonth,
        bonus: parseFloat(customBonus || 0),
        other_deductions: parseFloat(customOtherDeductions || 0),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        status: paymentStatus,
        notes: notes
      };

      const res = await api.post('/salary/generate', payload);
      if (res.data && res.data.success) {
        setShowSaveModal(false);
        setActionSuccess('Salary slip finalized and saved successfully!');
        fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth);
      }
    } catch (err) {
      console.error('Error saving salary:', err);
      alert(err.response?.data?.message || 'Failed to save salary slip');
    } finally {
      setSavingSalary(false);
    }
  };

  // Approve salary slip (Admin / HR)
  const handleApproveSalary = async () => {
    if (!salaryData?.employee?.id) return;
    try {
      setLoading(true);
      if (salaryData?.salaryRecordId) {
        const res = await api.post(`/salary/approve/${salaryData.salaryRecordId}`);
        if (res.data && res.data.success) {
          setActionSuccess('Salary slip APPROVED successfully! Employee can now download and print their salary slip.');
          fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth);
        }
      } else {
        const payload = {
          employee_id: salaryData.employee.id,
          year: selectedYear,
          month: selectedMonth,
          bonus: parseFloat(customBonus || 0),
          other_deductions: parseFloat(customOtherDeductions || 0),
          payment_date: paymentDate,
          payment_method: paymentMethod,
          status: 'approved',
          notes: notes
        };
        const res = await api.post('/salary/generate', payload);
        if (res.data && res.data.success) {
          setActionSuccess('Salary slip APPROVED successfully! Employee can now download and print their salary slip.');
          fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve salary');
    } finally {
      setLoading(false);
    }
  };

  // Quick mark as paid
  const handleMarkAsPaid = async () => {
    if (!salaryData?.salaryRecordId) {
      // If not saved yet, open modal to save and mark paid
      setPaymentStatus('paid');
      setShowSaveModal(true);
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/salary/pay/${salaryData.salaryRecordId}`, {
        payment_date: now.toISOString().slice(0, 10),
        payment_method: 'Bank Transfer'
      });
      if (res.data && res.data.success) {
        setActionSuccess('Salary successfully marked as PAID!');
        fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isApproved = salaryData?.status === 'approved' || salaryData?.status === 'paid';

  return (
    <div className="salary-slip-container container-fluid px-2 px-md-4 py-3">
      {/* Top Controls Bar - Hidden when printing */}
      <div className="no-print mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-3 rounded-3 shadow-sm border">
          <div>
            <h2 className="fs-4 fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <FaFileInvoiceDollar className="text-primary" />
              <span>Employee Salary Slip</span>
            </h2>
            <div className="text-muted small">
              Dynamic attendance deductions with Sunday salary paid & 1 Paid Leave policy
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Download / Print button: Always available to Admin/HR, available to Employees ONLY after Admin Approval */}
            {isAdminOrHR || isApproved ? (
              <Button variant="outline-dark" onClick={handlePrint} className="d-flex align-items-center gap-2 shadow-sm">
                <FaPrint />
                <span>Print / Download PDF</span>
              </Button>
            ) : (
              <Button 
                variant="outline-secondary" 
                disabled 
                className="d-flex align-items-center gap-2 shadow-sm"
                title="Salary slip download will be available once approved by Admin / HR"
              >
                <FaPrint />
                <span>Download Locked (Pending Approval)</span>
              </Button>
            )}

            {isAdminOrHR && (
              <>
                {!isApproved && (
                  <Button 
                    variant="outline-success" 
                    onClick={handleApproveSalary} 
                    className="d-flex align-items-center gap-2 shadow-sm"
                    title="Approve salary slip and unlock download for employee"
                  >
                    <FaCheckCircle />
                    <span>Approve Salary</span>
                  </Button>
                )}

                <Button 
                  variant="primary" 
                  onClick={() => setShowSaveModal(true)} 
                  className="d-flex align-items-center gap-2 shadow-sm"
                >
                  <FaSave />
                  <span>{salaryData?.salaryRecordId ? 'Update / Finalize' : 'Finalize Salary'}</span>
                </Button>

                {salaryData?.status !== 'paid' && (
                  <Button 
                    variant="success" 
                    onClick={handleMarkAsPaid} 
                    className="d-flex align-items-center gap-2 shadow-sm"
                  >
                    <FaCheck />
                    <span>Mark as Paid</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3 rounded-3 shadow-sm border mt-3">
          <Row className="g-3 align-items-center">
            {/* Employee Selector (Admins / HR) */}
            {isAdminOrHR && employeesList.length > 0 && (
              <Col xs={12} md={5} lg={4}>
                <Form.Label className="small text-muted fw-bold mb-1">Select Employee</Form.Label>
                <Form.Select 
                  value={selectedEmployeeId} 
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="fw-semibold"
                >
                  {employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id}) — {emp.position || emp.department} [₹{parseFloat(emp.salary || 0).toLocaleString('en-IN')}]
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {/* Year Selector */}
            <Col xs={6} sm={4} md={2}>
              <Form.Label className="small text-muted fw-bold mb-1">Year</Form.Label>
              <Form.Select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {[2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </Form.Select>
            </Col>

            {/* Month Selector with Prev/Next */}
            <Col xs={6} sm={8} md={isAdminOrHR ? 4 : 6}>
              <Form.Label className="small text-muted fw-bold mb-1">Month</Form.Label>
              <div className="d-flex align-items-center gap-1">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="px-2"
                >
                  <FaChevronLeft size={10} />
                </Button>
                <Form.Select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="fw-semibold"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName} ({selectedYear})
                    </option>
                  ))}
                </Form.Select>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="px-2"
                >
                  <FaChevronRight size={10} />
                </Button>
              </div>
            </Col>

            <Col xs={12} md={isAdminOrHR ? 2 : 4} className="d-flex align-items-end justify-content-md-end">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => fetchSalarySlip(selectedEmployeeId, selectedYear, selectedMonth)}
                className="w-100"
              >
                Refresh Data
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      {actionSuccess && (
        <Alert variant="success" dismissible onClose={() => setActionSuccess('')} className="no-print shadow-sm">
          <FaCheckCircle className="me-2" /> {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="no-print shadow-sm">
          <FaExclamationTriangle className="me-2" /> {error}
        </Alert>
      )}

      {/* Employee Approval Notice Banner */}
      {!isAdminOrHR && !isApproved && salaryData && (
        <Alert variant="warning" className="no-print shadow-sm d-flex align-items-center justify-content-between p-3 rounded-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <FaExclamationTriangle className="text-warning fs-3 flex-shrink-0" />
            <div>
              <strong className="d-block mb-1">Salary Slip Pending Admin Approval</strong>
              Your salary slip for {salaryData.monthName} has been generated and is awaiting approval by HR / Admin. Official download and print options will be unlocked once approved.
            </div>
          </div>
          <Badge bg="warning" text="dark" className="text-uppercase px-2 py-1 flex-shrink-0">Pending Approval</Badge>
        </Alert>
      )}

      {!isAdminOrHR && isApproved && salaryData && (
        <Alert variant="success" className="no-print shadow-sm d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
          <FaCheckCircle className="text-success" />
          <span>This salary slip has been <strong>approved by HR/Admin</strong>. You can now download or print your official salary slip.</span>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted small">Generating dynamic salary calculation...</p>
        </div>
      ) : !salaryData ? (
        <Alert variant="info" className="text-center py-4">
          <h5>No Salary Data Available</h5>
          <p className="mb-0 text-muted">Please configure the base salary in the employee's profile.</p>
        </Alert>
      ) : (
        <>
          {/* Quick Metrics KPI Banner (Screen Only) */}
          <div className="no-print mb-4">
            <Row className="g-2 g-md-3">
              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="text-muted small fw-bold">BASE SALARY</div>
                  <div className="fs-5 fw-bold text-dark mt-1">{formatCurrency(salaryData.salary?.baseSalary)}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>Monthly CTC</div>
                </div>
              </Col>

              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="text-success small fw-bold">PRESENT DAYS</div>
                  <div className="fs-5 fw-bold text-success mt-1">{salaryData.attendance?.presentDays || 0}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>Biometric Punches</div>
                </div>
              </Col>

              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="text-info small fw-bold">SUNDAYS (PAID)</div>
                  <div className="fs-5 fw-bold text-info mt-1">{salaryData.attendance?.weekendDays || 0} Days</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>100% Salary Made</div>
                </div>
              </Col>

              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="text-warning small fw-bold">PAID LEAVE</div>
                  <div className="fs-5 fw-bold text-warning mt-1">{salaryData.attendance?.paidLeavesUsed || 0} / 1</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>1 Allowed per month</div>
                </div>
              </Col>

              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-primary bg-opacity-10 border-primary shadow-sm h-100">
                  <div className="text-primary small fw-bold">TOTAL PAID DAYS</div>
                  <div className="fs-5 fw-bold text-primary mt-1">
                    {salaryData.attendance?.totalPaidDays || (salaryData.attendance?.totalDays - (salaryData.attendance?.unpaidAbsentDays || 0))}
                  </div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>of {salaryData.attendance?.totalDays} Calendar Days</div>
                </div>
              </Col>

              <Col xs={6} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="text-danger small fw-bold">ABSENT DEDUCTION</div>
                  <div className="fs-5 fw-bold text-danger mt-1">-{formatCurrency(salaryData.salary?.absentDeduction)}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    {salaryData.attendance?.unpaidAbsentDays || 0} LOP days @ {formatCurrency(salaryData.salary?.perDaySalary)}/day
                  </div>
                </div>
              </Col>

              <Col xs={12} md={3} lg={true}>
                <div className="border rounded p-3 text-center bg-success bg-opacity-10 border-success shadow-sm h-100">
                  <div className="text-success small fw-bold">NET SALARY</div>
                  <div className="fs-5 fw-bold text-success mt-1">{formatCurrency(salaryData.salary?.netSalary)}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    <Badge bg={salaryData.status === 'paid' ? 'success' : 'warning'} className="text-uppercase" style={{ fontSize: '10px' }}>
                      {salaryData.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* FORMAL SALARY SLIP (PRINTABLE CARD) */}
          <Card className="salary-slip-card border-0 shadow-sm mx-auto bg-white mb-5">
            <Card.Body className="p-4 p-md-5">
              
              {/* Company Header */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3 company-header-row">
                <div className="d-flex align-items-center gap-3">
                  <div className="company-logo-badge">
                    <FaBuilding size={28} />
                  </div>
                  <div>
                    <h3 className="fw-bold mb-1 text-dark company-name-title">PARAKSH TECHNOLOGIES</h3>
                    <div className="text-muted small contact-details-line" style={{ fontSize: '12px' }}>
                      <span>Email: <strong className="text-dark">hr@parakshtech.com</strong></span>
                      <span className="mx-2">•</span>
                      <span>Website: <strong className="text-dark">www.parakshtech.com</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-end">
                  <div className="payslip-title-label fw-bold text-primary" style={{ fontSize: '15px', letterSpacing: '0.5px' }}>
                    SALARY PAYSLIP
                  </div>
                  <div className="fw-bold fs-5 text-dark">{salaryData.monthName}</div>
                  <div>
                    <Badge 
                      bg={salaryData.status === 'paid' ? 'success' : salaryData.status === 'approved' ? 'info' : 'warning'}
                      className="text-uppercase py-1 px-3 mt-1"
                    >
                      {salaryData.status === 'paid' ? '✓ PAID' : salaryData.status === 'approved' ? '✓ APPROVED' : 'PENDING APPROVAL'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Employee & Pay Details Grid */}
              <div className="bg-light p-3 rounded-3 mb-4 border">
                <Row className="g-3">
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Employee Name</div>
                    <div className="fw-bold text-dark">{salaryData.employee?.name}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Employee ID / Job No</div>
                    <div className="fw-bold font-monospace text-primary">{salaryData.employee?.employee_id}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Department</div>
                    <div className="fw-bold text-dark">{salaryData.employee?.department}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Designation</div>
                    <div className="fw-bold text-dark">{salaryData.employee?.position}</div>
                  </Col>

                  <Col xs={6} md={3}>
                    <div className="text-muted small">Date of Joining</div>
                    <div className="fw-semibold text-dark">{salaryData.employee?.joining_date || 'N/A'}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Payment Mode</div>
                    <div className="fw-semibold text-dark">{salaryData.paymentMethod || 'Bank Transfer'}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Payment Date</div>
                    <div className="fw-semibold text-dark">{salaryData.paymentDate || 'Pending'}</div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="text-muted small">Pay Period</div>
                    <div className="fw-semibold text-dark">
                      01 {salaryData.monthName} – {salaryData.attendance?.totalDays} {salaryData.monthName}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Formal Attendance, Leaves & Paid Days Statement (Compact for Single-Page PDF) */}
              <div className="attendance-statement-section mb-3">
                <Table bordered size="sm" className="attendance-statement-table text-center mb-0 align-middle">
                  <thead className="table-light">
                    <tr style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <th style={{ width: '11%' }}>Calendar Days</th>
                      <th style={{ width: '11%' }}>Working Days</th>
                      <th style={{ width: '11%' }} className="text-success">Present Days</th>
                      <th style={{ width: '11%' }} className="text-info">Sundays (Paid)</th>
                      {salaryData.attendance?.holidayDays > 0 && (
                        <th style={{ width: '11%' }} className="text-info">Holidays</th>
                      )}
                      <th style={{ width: '11%' }} className="text-secondary">Total Absents</th>
                      <th style={{ width: '14%' }} className="text-warning">Paid Leave (Allowed 1)</th>
                      <th style={{ width: '11%' }} className="text-danger">Unpaid LOP Days</th>
                      <th style={{ width: '14%' }} className="bg-success bg-opacity-10 text-success fw-bold">TOTAL PAID DAYS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="fw-semibold" style={{ fontSize: '12px' }}>
                      <td>{salaryData.attendance?.totalDays}</td>
                      <td>{salaryData.attendance?.workingDays}</td>
                      <td className="text-success fw-bold">{salaryData.attendance?.presentDays}</td>
                      <td className="text-info">{salaryData.attendance?.weekendDays} <small className="text-muted fw-normal">(100% Paid)</small></td>
                      {salaryData.attendance?.holidayDays > 0 && (
                        <td className="text-info">{salaryData.attendance?.holidayDays}</td>
                      )}
                      <td className="text-secondary">{salaryData.attendance?.absentDays}</td>
                      <td className="text-warning">{salaryData.attendance?.paidLeavesUsed} / 1 <small className="text-success fw-normal">(₹0 Deduct)</small></td>
                      <td className="text-danger fw-bold">{salaryData.attendance?.unpaidAbsentDays}</td>
                      <td className="bg-success bg-opacity-10 text-success fw-bold fs-6">
                        {salaryData.attendance?.totalPaidDays || (salaryData.attendance?.totalDays - (salaryData.attendance?.unpaidAbsentDays || 0))} Days
                      </td>
                    </tr>
                  </tbody>
                </Table>
                <div className="d-flex justify-content-between align-items-center mt-1 px-1" style={{ fontSize: '11px' }}>
                  <span className="text-muted">
                    • <strong>Policy</strong>: 1 Paid Leave per month allowed • Sundays are fully paid • Deductions apply only to unpaid loss of pay (LOP) days.
                  </span>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0">
                    ✓ Sundays & 1 Paid Leave Included
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Comparison Table */}
              <div className="table-responsive mb-4">
                <Table bordered className="salary-breakdown-table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '35%' }}>EARNINGS</th>
                      <th style={{ width: '15%' }} className="text-end">AMOUNT (₹)</th>
                      <th style={{ width: '35%' }}>DEDUCTIONS</th>
                      <th style={{ width: '15%' }} className="text-end">AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Basic Salary (50%)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Core pay rate</div>
                      </td>
                      <td className="text-end">{formatCurrency(salaryData.salary?.earnings?.basicSalary)}</td>
                      <td>
                        <strong className="text-danger">Absent Days Deduction (LOP)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          {salaryData.attendance?.absentDays} absents - 1 Paid Leave = {salaryData.attendance?.unpaidAbsentDays} unpaid days @ {formatCurrency(salaryData.salary?.perDaySalary)}/day
                        </div>
                      </td>
                      <td className="text-end text-danger">
                        {formatCurrency(salaryData.salary?.absentDeduction)}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>House Rent Allowance (HRA - 30%)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Housing assistance</div>
                      </td>
                      <td className="text-end">{formatCurrency(salaryData.salary?.earnings?.hra)}</td>
                      <td>
                        <strong>Other / Statutory Deductions</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Taxes / penalties</div>
                      </td>
                      <td className="text-end">
                        {formatCurrency(salaryData.salary?.deductions?.otherDeductions)}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Conveyance Allowance (10%)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Travel support</div>
                      </td>
                      <td className="text-end">{formatCurrency(salaryData.salary?.earnings?.conveyance)}</td>
                      <td>--</td>
                      <td className="text-end">--</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Special Allowance (10%)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Performance & utility</div>
                      </td>
                      <td className="text-end">{formatCurrency(salaryData.salary?.earnings?.specialAllowance)}</td>
                      <td>--</td>
                      <td className="text-end">--</td>
                    </tr>
                    <tr className="bg-light">
                      <td>
                        <strong className="text-success">Sundays / Weekly Offs ({salaryData.attendance?.weekendDays} Days)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>Weekly rest days fully paid in salary (No deduction)</div>
                      </td>
                      <td className="text-end text-success fw-semibold">
                        Included in Base
                      </td>
                      <td>
                        <strong className="text-success">Paid Leave Benefit (1 Day)</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>1 Absent day covered by paid leave policy</div>
                      </td>
                      <td className="text-end text-success fw-semibold">
                        ₹0.00 (Exempt)
                      </td>
                    </tr>
                    {salaryData.salary?.bonus > 0 && (
                      <tr>
                        <td>
                          <strong className="text-success">Performance Bonus / Incentive</strong>
                        </td>
                        <td className="text-end text-success">{formatCurrency(salaryData.salary?.bonus)}</td>
                        <td>--</td>
                        <td className="text-end">--</td>
                      </tr>
                    )}
                    <tr className="table-light fw-bold">
                      <td>TOTAL GROSS EARNINGS</td>
                      <td className="text-end">{formatCurrency(salaryData.salary?.earnings?.totalEarnings)}</td>
                      <td>TOTAL DEDUCTIONS</td>
                      <td className="text-end text-danger">{formatCurrency(salaryData.salary?.deductions?.totalDeductions)}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>

              {/* Net Salary Highlight Box */}
              <div className="net-salary-highlight-box p-4 rounded-3 text-center mb-4">
                <div className="text-uppercase text-secondary small fw-bold tracking-wider">
                  NET TAKE HOME PAYABLE AMOUNT
                </div>
                <div className="display-6 fw-bold text-success my-1">
                  {formatCurrency(salaryData.salary?.netSalary)}
                </div>
                <div className="text-muted fst-italic small">
                  Amount in words: <strong className="text-dark">{salaryData.salary?.netSalaryInWords}</strong>
                </div>
              </div>

              {/* Deduction Policy Explanation (Screen Only, Hidden in PDF / Print) */}
              <div className="bg-light no-print p-3 rounded border mb-4">
                <h6 className="fw-bold mb-1 small text-dark d-flex align-items-center gap-1">
                  <FaMoneyBillWave className="text-primary" />
                  <span>Payroll Calculation, Sunday Pay & Leave Policy Formula:</span>
                </h6>
                <p className="text-muted small mb-0" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  • <strong>Dynamic Base Salary</strong>: Extracted dynamically from employee profile (<strong>{formatCurrency(salaryData.employee?.profile_salary)}</strong>).<br />
                  • <strong>Sunday Salary (Fully Paid)</strong>: All {salaryData.attendance?.weekendDays} Sundays (weekly offs) are fully paid calendar days. Salary is <strong>never deducted</strong> for Sundays.<br />
                  • <strong>1 Paid Leave Rule</strong>: Every employee receives <strong>1 paid leave</strong> per month. The first absent working day is covered with <strong>zero deduction</strong>.<br />
                  • <strong>Day-Wise Deduction Formula</strong>: Per Day Salary Rate = Base Salary ÷ Total Month Days ({salaryData.attendance?.totalDays} days) = <strong>{formatCurrency(salaryData.salary?.perDaySalary)} / day</strong>.<br />
                  • <strong>Loss of Pay (LOP)</strong>: Only unexcused working absent days exceeding 1 paid leave ({salaryData.attendance?.unpaidAbsentDays} days) are deducted: {salaryData.attendance?.unpaidAbsentDays} days × {formatCurrency(salaryData.salary?.perDaySalary)} = <strong>{formatCurrency(salaryData.salary?.absentDeduction)}</strong>.<br />
                  • <strong>Total Paid Days</strong>: {salaryData.attendance?.presentDays} Present + {salaryData.attendance?.weekendDays} Sundays + {salaryData.attendance?.holidayDays || 0} Holidays + {salaryData.attendance?.paidLeavesUsed} Paid Leave = <strong>{salaryData.attendance?.totalPaidDays || (salaryData.attendance?.totalDays - (salaryData.attendance?.unpaidAbsentDays || 0))} Paid Days</strong> out of {salaryData.attendance?.totalDays} days.
                </p>
              </div>

              {salaryData.notes && (
                <div className="mb-4 p-2 px-3 border-start border-4 border-primary bg-light rounded small">
                  <strong>Notes:</strong> {salaryData.notes}
                </div>
              )}

              {/* Signatures Area */}
              <div className="signatures-wrapper pt-4 mt-4 border-top">
                <Row className="text-center">
                  <Col xs={6}>
                    <div className="signature-line mx-auto mb-2" style={{ maxWidth: '200px', borderBottom: '1px dashed #666', height: '40px' }}></div>
                    <div className="fw-bold small">EMPLOYEE SIGNATURE</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>({salaryData.employee?.name})</div>
                  </Col>
                  <Col xs={6}>
                    <div className="signature-line mx-auto mb-2" style={{ maxWidth: '200px', borderBottom: '1px dashed #666', height: '40px' }}></div>
                    <div className="fw-bold small">AUTHORIZED SIGNATORY</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>Human Resources & Payroll Dept</div>
                  </Col>
                </Row>
                <div className="text-center text-muted mt-4" style={{ fontSize: '11px' }}>
                  This is a system-generated document based on biometric machine punch records and HR policy rules.
                </div>
              </div>

            </Card.Body>
          </Card>
        </>
      )}

      {/* Finalize / Update Salary Modal (Admin / HR) */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">
            <FaFileInvoiceDollar className="text-primary me-2" />
            Finalize Salary Slip ({salaryData?.monthName})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="mb-3 p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Employee:</span>
                <strong>{salaryData?.employee?.name} ({salaryData?.employee?.employee_id})</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Base Salary:</span>
                <strong>{formatCurrency(salaryData?.salary?.baseSalary)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Absent Deduction (LOP):</span>
                <strong className="text-danger">-{formatCurrency(salaryData?.salary?.absentDeduction)}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Estimated Net Pay:</span>
                <strong className="text-success">{formatCurrency(salaryData?.salary?.netSalary)}</strong>
              </div>
            </div>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Bonus / Incentive (₹)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={customBonus} 
                    onChange={(e) => setCustomBonus(e.target.value)}
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Other Deductions (₹)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={customOtherDeductions} 
                    onChange={(e) => setCustomOtherDeductions(e.target.value)}
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-2 mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Payment Status</Form.Label>
                  <Form.Select 
                    value={paymentStatus} 
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Payment Method</Form.Label>
                  <Form.Select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / NEFT">UPI / NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Payment Date</Form.Label>
              <Form.Control 
                type="date" 
                value={paymentDate} 
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="small fw-bold">Notes / Comments</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remark, e.g. Special festive incentive added"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveSalary} disabled={savingSalary}>
            {savingSalary ? <><Spinner size="sm" className="me-2" />Saving...</> : 'Save & Finalize'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalarySlip;