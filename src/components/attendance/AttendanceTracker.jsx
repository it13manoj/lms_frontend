import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Button, Table, Badge, Row, Col, 
  Spinner, Alert, Form, InputGroup, Nav, ProgressBar 
} from 'react-bootstrap';
import { 
  FaCheckCircle, FaTimesCircle, FaClock, 
  FaCalendarCheck, FaChartLine, FaUpload, 
  FaUserCheck, FaUserTimes, FaExclamationTriangle,
  FaSearch, FaChevronLeft, FaChevronRight, FaFileDownload,
  FaEye, FaBuilding, FaUserTie, FaHistory, FaCalendarDay,
  FaBusinessTime, FaDoorOpen, FaCalendarAlt
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AttendanceUploadModal from './AttendanceUploadModal';
import PunchDetailsModal from './PunchDetailsModal';
import EmployeeMonthlyModal from './EmployeeMonthlyModal';
import './AttendanceTracker.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AttendanceTracker = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('panel'); // 'panel' or 'self'

  // Daily Panel State
  const [selectedDate, setSelectedDate] = useState('');
  const [dailyData, setDailyData] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    onTimeCount: 0
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelLoading, setPanelLoading] = useState(true);
  const [panelError, setPanelError] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPunchRecord, setSelectedPunchRecord] = useState(null);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [selectedMonthlyEmployee, setSelectedMonthlyEmployee] = useState(null);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  // Self Attendance State
  const [myAttendance, setMyAttendance] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [myFilter, setMyFilter] = useState('week');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selfLoading, setSelfLoading] = useState(false);
  const chartRef = useRef(null);

  // Initial fetch for Daily Panel
  useEffect(() => {
    fetchDailyAttendance(selectedDate);
  }, [selectedDate, statusFilter]);

  // Fetch for Self Attendance
  useEffect(() => {
    if (activeTab === 'self') {
      fetchSelfAttendance();
    }
  }, [activeTab, myFilter]);

  // Fetch Daily Attendance from Backend
  const fetchDailyAttendance = async (date) => {
    try {
      setPanelLoading(true);
      setPanelError('');

      const params = {};
      if (date) params.date = date;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/attendance/daily', { params });
      if (res.data && res.data.success) {
        setDailyData(res.data.data || []);
        setSummary(res.data.summary || {});
        if (!selectedDate && res.data.date) {
          setSelectedDate(res.data.date);
        }
        if (res.data.availableDates) {
          setAvailableDates(res.data.availableDates);
        }
      }
    } catch (err) {
      console.error('Fetch daily attendance error:', err);
      setPanelError(err.response?.data?.message || 'Failed to load attendance report.');
    } finally {
      setPanelLoading(false);
    }
  };

  // Fetch Personal Attendance Data
  const fetchSelfAttendance = async () => {
    try {
      setSelfLoading(true);
      const [attRes, statsRes] = await Promise.all([
        api.get('/attendance/daily', { params: { search: user?.email } }).catch(() => ({ data: { data: [] } })),
        api.get('/attendance/stats').catch(() => ({ data: { data: {} } }))
      ]);

      const attList = attRes.data?.data || [];
      setMyAttendance(attList);
      setMyStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching personal attendance:', err);
    } finally {
      setSelfLoading(false);
    }
  };

  // Change Date Navigation
  const handleDateChange = (newDateStr) => {
    setSelectedDate(newDateStr);
    fetchDailyAttendance(newDateStr);
  };

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    const prevStr = cur.toISOString().split('T')[0];
    handleDateChange(prevStr);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = cur.toISOString().split('T')[0];
    handleDateChange(nextStr);
  };

  // Callback when upload modal finishes
  const handleUploadSuccess = (uploadedDate) => {
    if (uploadedDate) {
      setSelectedDate(uploadedDate);
      fetchDailyAttendance(uploadedDate);
    } else {
      fetchDailyAttendance(selectedDate);
    }
    setActiveTab('panel');
  };

  // Open Punch logs modal
  const handleViewPunches = (record) => {
    setSelectedPunchRecord(record);
    setShowPunchModal(true);
  };

  // Open Employee Monthly Attendance modal
  const handleOpenMonthly = (record) => {
    setSelectedMonthlyEmployee(record);
    setShowMonthlyModal(true);
  };

  // Export Daily Table to CSV
  const handleExportCSV = () => {
    if (!dailyData || dailyData.length === 0) return;
    const headers = [
      'Employee Name', 'Job No', 'Email', 'Department', 'Position',
      'Date', 'Status', 'Check-In', 'Late Comment', 'Check-Out',
      'Early Leave Comment', 'Working Hours', 'Remarks'
    ];
    const rows = dailyData.map(r => [
      `"${r.name || ''}"`,
      `"${r.job_no || ''}"`,
      `"${r.email || ''}"`,
      `"${r.department || ''}"`,
      `"${r.position || ''}"`,
      `"${r.date || ''}"`,
      `"${r.status || ''}"`,
      `"${r.check_in_formatted || ''}"`,
      `"${r.late_comment || ''}"`,
      `"${r.check_out_formatted || ''}"`,
      `"${r.early_leave_comment || ''}"`,
      `"${r.working_hours || 0}"`,
      `"${r.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_${selectedDate || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Personal check-in / check-out
  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await api.post('/attendance/check-in');
      fetchDailyAttendance(selectedDate);
      fetchSelfAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      await api.post('/attendance/check-out');
      fetchDailyAttendance(selectedDate);
      fetchSelfAttendance();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  // Format Helper for display
  const getInitials = (name) => {
    if (!name) return 'E';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="attendance-tracker container-fluid px-2 px-md-4 py-3">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fs-3 fw-bold mb-1 text-dark">Attendance Management Panel</h2>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="office-timing-badge">
              <FaBusinessTime />
              <span>Office Hours: 09:30 AM – 06:30 PM</span>
            </span>
            <span className="badge bg-light text-muted border py-2 px-3 small">
              Late arrival after 09:30 AM • Early departure before 06:30 PM
            </span>
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {isAdminOrHR && (
            <Button 
              variant="primary" 
              className="d-flex align-items-center gap-2 shadow-sm"
              onClick={() => setShowUploadModal(true)}
            >
              <FaUpload />
              <span>Upload Attendance CSV</span>
            </Button>
          )}

          {activeTab === 'panel' && (
            <Button 
              variant="outline-secondary" 
              className="d-flex align-items-center gap-2 bg-white"
              onClick={handleExportCSV}
              disabled={dailyData.length === 0}
            >
              <FaFileDownload />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Nav variant="tabs" className="mb-4 bg-white px-3 pt-2 rounded-top border-bottom">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'panel'} 
            onClick={() => setActiveTab('panel')}
            className="fw-semibold d-flex align-items-center gap-2"
          >
            <FaCalendarCheck />
            <span>Daily Attendance & Team Panel</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'self'} 
            onClick={() => setActiveTab('self')}
            className="fw-semibold d-flex align-items-center gap-2"
          >
            <FaClock />
            <span>My Attendance & Punch</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* TAB 1: DAILY ATTENDANCE & TEAM PANEL */}
      {activeTab === 'panel' && (
        <>
          {/* Date Selector & Quick Filters */}
          <div className="bg-white p-3 rounded-3 shadow-sm border mb-4">
            <Row className="g-3 align-items-center">
              <Col xs={12} md={5} lg={4}>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold text-secondary small text-nowrap">
                    <FaCalendarDay className="me-1 text-primary" /> Select Date:
                  </span>
                  <div className="date-nav-wrapper">
                    <button type="button" onClick={handlePrevDay} title="Previous Day">
                      <FaChevronLeft size={12} />
                    </button>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                    <button type="button" onClick={handleNextDay} title="Next Day">
                      <FaChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </Col>

              {availableDates.length > 0 && (
                <Col xs={12} md={3} lg={3}>
                  <Form.Select 
                    size="sm"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="border"
                  >
                    <option value="" disabled>Jump to Uploaded Date</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>
                        📅 {d} {d === selectedDate ? '(Active)' : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              )}

              <Col xs={12} md={4} lg={5} className="d-flex justify-content-md-end">
                <InputGroup size="sm" style={{ maxWidth: '300px' }}>
                  <InputGroup.Text className="bg-white border-end-0">
                    <FaSearch className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control 
                    placeholder="Search name, job no, dept..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      fetchDailyAttendance(selectedDate);
                    }}
                    className="border-start-0 ps-0"
                  />
                  {searchQuery && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        fetchDailyAttendance(selectedDate);
                      }}
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
              </Col>
            </Row>
          </div>

          {/* KPI Summary Cards */}
          <Row className="g-3 mb-4">
            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'all' ? 'border border-primary border-2 bg-primary bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter('all')}
                title="Click to view all staff"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper total">
                    <FaBuilding />
                  </div>
                  <div>
                    <div className="kpi-label text-primary">Total Staff</div>
                    <div className="kpi-value text-primary">{summary.totalEmployees || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'all' ? '✓ Showing All' : 'Click to show all'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'present' ? 'border border-success border-2 bg-success bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
                title="Click to toggle filter: Present Staff"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper present">
                    <FaUserCheck />
                  </div>
                  <div>
                    <div className="kpi-label text-success">Present</div>
                    <div className="kpi-value text-success">{summary.presentCount || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'present' 
                        ? '✓ Active' 
                        : (summary.totalEmployees > 0 
                            ? `${Math.round((summary.presentCount / summary.totalEmployees) * 100)}% attendance`
                            : '0%')}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'absent' ? 'border border-danger border-2 bg-danger bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
                title="Click to toggle filter: Absent Staff"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper absent">
                    <FaUserTimes />
                  </div>
                  <div>
                    <div className="kpi-label text-danger">Absent</div>
                    <div className="kpi-value text-danger">{summary.absentCount || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'absent' ? '✓ Active' : 'No punch'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'late' ? 'border border-warning border-2 bg-warning bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
                title="Click to toggle filter: Late Comers (> 09:30 AM)"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper late">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <div className="kpi-label text-warning">Late Comers</div>
                    <div className="kpi-value text-warning">{summary.lateCount || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'late' ? '✓ Active' : '> 09:30 AM'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'early_leave' ? 'border border-info border-2 bg-info bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'early_leave' ? 'all' : 'early_leave')}
                title="Click to toggle filter: Left Early (< 06:30 PM)"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper early">
                    <FaDoorOpen />
                  </div>
                  <div>
                    <div className="kpi-label text-purple">Left Early</div>
                    <div className="kpi-value text-purple">{summary.earlyLeaveCount || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'early_leave' ? '✓ Active' : '< 06:30 PM'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} sm={4} lg={2}>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'on_time' ? 'border border-success border-2 bg-success bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}
                title="Click to toggle filter: On Time Staff"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper ontime">
                    <FaCheckCircle />
                  </div>
                  <div>
                    <div className="kpi-label text-success">On Time</div>
                    <div className="kpi-value text-success">{summary.onTimeCount || 0}</div>
                    <div className="kpi-subtext">
                      {statusFilter === 'on_time' ? '✓ Active' : 'Standard hours'}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Attendance Table Card */}
          <Card className="attendance-table-card shadow-sm">
            <Card.Header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0 fs-6 fw-bold">
                  Attendance Records for {selectedDate || 'Today'}
                </h5>
                <Badge bg="secondary" className="rounded-pill">
                  {dailyData.length} records
                </Badge>
              </div>

              {/* Status Filter Pills */}
              <div className="d-flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All Records' },
                  { id: 'present', label: `Present (${summary.presentCount || 0})` },
                  { id: 'absent', label: `Absent (${summary.absentCount || 0})` },
                  { id: 'late', label: `Late Comers (${summary.lateCount || 0})` },
                  { id: 'early_leave', label: `Left Early (${summary.earlyLeaveCount || 0})` },
                  { id: 'on_time', label: `On Time (${summary.onTimeCount || 0})` },
                ].map(tab => (
                  <Button
                    key={tab.id}
                    variant={statusFilter === tab.id ? 'primary' : 'outline-light'}
                    size="sm"
                    className={`py-1 px-2 ${statusFilter !== tab.id ? 'text-secondary border' : ''}`}
                    style={{ fontSize: '12px' }}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {panelLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted small">Loading attendance logs...</p>
                </div>
              ) : panelError ? (
                <Alert variant="danger" className="m-3">
                  {panelError}
                </Alert>
              ) : dailyData.length === 0 ? (
                <div className="text-center py-5">
                  <FaCalendarCheck size={45} className="text-muted opacity-50 mb-3" />
                  <h6 className="fw-bold text-dark">No Attendance Records Found</h6>
                  <p className="text-muted small mb-3">
                    No punch records available for <strong>{selectedDate}</strong>.
                  </p>
                  {isAdminOrHR && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="d-inline-flex align-items-center gap-2"
                      onClick={() => setShowUploadModal(true)}
                    >
                      <FaUpload />
                      <span>Upload Biometric CSV Now</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="attendance-table align-middle">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Job No</th>
                        <th>Status</th>
                        <th>Check-In (Office: 09:30 AM)</th>
                        <th>Check-Out (Office: 06:30 PM)</th>
                        <th>Working Hours</th>
                        <th>Punch Logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((record) => (
                        <tr key={record.id}>
                          {/* Employee Info - Clickable to open monthly attendance */}
                          <td>
                            <div 
                              className="d-flex align-items-center gap-2 employee-clickable"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleOpenMonthly(record)}
                              title="Click to view full monthly attendance for this employee"
                            >
                              <div className="employee-avatar shadow-sm">
                                {getInitials(record.name)}
                              </div>
                              <div>
                                <div className="fw-bold text-primary d-flex align-items-center gap-1">
                                  <span>{record.name}</span>
                                  <span className="badge bg-light text-primary border ms-1" style={{ fontSize: '10px' }}>
                                    <FaCalendarAlt size={10} className="me-1" />
                                    Monthly
                                  </span>
                                </div>
                                <div className="text-muted small">
                                  {record.department} • {record.position}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Job No */}
                          <td>
                            <span className="badge bg-light text-dark border font-monospace">
                              {record.job_no || '--'}
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            {record.is_present ? (
                              <span className="badge-present d-inline-flex align-items-center gap-1">
                                <FaCheckCircle size={11} />
                                <span>Present</span>
                              </span>
                            ) : (
                              <span className="badge-absent d-inline-flex align-items-center gap-1">
                                <FaTimesCircle size={11} />
                                <span>Absent</span>
                              </span>
                            )}
                          </td>

                          {/* Check-In */}
                          <td>
                            {record.is_present ? (
                              <div>
                                <div className="fw-semibold font-monospace">
                                  {record.check_in_formatted}
                                </div>
                                {record.is_late ? (
                                  <span className="badge-late d-inline-block mt-1">
                                    ⚠️ Late by {Math.floor(record.late_minutes / 60) > 0 ? `${Math.floor(record.late_minutes / 60)}h ` : ''}{record.late_minutes % 60}m
                                  </span>
                                ) : (
                                  <span className="badge-ontime d-inline-block mt-1">
                                    ✓ On Time
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">--:-- (Absent)</span>
                            )}
                          </td>

                          {/* Check-Out */}
                          <td>
                            {record.is_present ? (
                              record.check_out ? (
                                <div>
                                  <div className="fw-semibold font-monospace">
                                    {record.check_out_formatted}
                                  </div>
                                  {record.is_early_leave ? (
                                    <span className="badge-early-leave d-inline-block mt-1">
                                      ⏱ Left early by {Math.floor(record.early_leave_minutes / 60) > 0 ? `${Math.floor(record.early_leave_minutes / 60)}h ` : ''}{record.early_leave_minutes % 60}m
                                    </span>
                                  ) : (
                                    <span className="badge-ontime d-inline-block mt-1">
                                      ✓ Full Day (06:30+)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="text-muted small">--:--</span>
                                  <div>
                                    <Badge bg="secondary" className="small">Missed Check-out</Badge>
                                  </div>
                                </div>
                              )
                            ) : (
                              <span className="text-muted small">--:-- (Absent)</span>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td>
                            {record.is_present && record.working_hours > 0 ? (
                              <div>
                                <span className="hours-pill">
                                  <FaClock size={11} className="text-primary" />
                                  <span>{record.working_hours_formatted}</span>
                                </span>
                                <div className="mt-1" style={{ maxWidth: '100px' }}>
                                  <ProgressBar 
                                    now={Math.min(100, (record.working_hours / 9) * 100)} 
                                    variant={record.working_hours >= 8 ? 'success' : record.working_hours >= 4 ? 'warning' : 'danger'}
                                    style={{ height: '4px' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">0 hrs</span>
                            )}
                          </td>

                          {/* Action / Punch Details */}
                          <td>
                            {record.raw_punches && record.raw_punches.length > 0 ? (
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="py-1 px-2 d-flex align-items-center gap-1"
                                onClick={() => handleViewPunches(record)}
                                title="View raw punch logs"
                              >
                                <FaEye size={12} />
                                <span>{record.raw_punches.length} punches</span>
                              </Button>
                            ) : (
                              <span className="text-muted small">No punches</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {/* TAB 2: PERSONAL ATTENDANCE & PUNCH */}
      {activeTab === 'self' && (
        <div>
          <Row className="g-3 mb-4">
            <Col xs={12} lg={6}>
              <Card className="attendance-action-card h-100 shadow-sm">
                <Card.Body className="d-flex flex-column justify-content-between p-4">
                  <h5 className="card-title fw-bold">My Status Today</h5>
                  <div className="text-center py-4">
                    {myStats?.todayStatus === 'checked-in' ? (
                      <>
                        <div className="status-icon checked-in mb-3">
                          <FaClock size={36} className="text-success" />
                        </div>
                        <h4 className="fw-bold">Checked In</h4>
                        <p className="text-muted mb-3">
                          Check-in recorded at: <strong>{myStats?.checkInTime}</strong>
                        </p>
                        <Button 
                          variant="danger" 
                          onClick={handleCheckOut}
                          disabled={checkingOut}
                          className="px-4 py-2"
                        >
                          {checkingOut ? <><Spinner size="sm" className="me-2" />Checking Out...</> : 'Punch Check Out'}
                        </Button>
                      </>
                    ) : myStats?.todayStatus === 'checked-out' ? (
                      <>
                        <div className="status-icon completed mb-3">
                          <FaCheckCircle size={36} className="text-primary" />
                        </div>
                        <h4 className="fw-bold text-success">Attendance Completed</h4>
                        <p className="text-muted mb-2">
                          Checked out at: <strong>{myStats?.checkOutTime}</strong>
                        </p>
                        <Badge bg="success" className="p-2">
                          ✓ Today's punches recorded
                        </Badge>
                      </>
                    ) : (
                      <>
                        <div className="status-icon not-checked mb-3">
                          <FaCalendarCheck size={36} className="text-warning" />
                        </div>
                        <h4 className="fw-bold">Not Checked In</h4>
                        <p className="text-muted mb-3">Office timing begins at 09:30 AM</p>
                        <Button 
                          variant="primary" 
                          onClick={handleCheckIn}
                          disabled={checkingIn}
                          className="px-4 py-2"
                        >
                          {checkingIn ? <><Spinner size="sm" className="me-2" />Checking In...</> : 'Punch Check In'}
                        </Button>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="stats-card h-100 shadow-sm">
                <Card.Body className="d-flex flex-column justify-content-between p-4">
                  <h5 className="card-title fw-bold mb-3">My Monthly Attendance</h5>
                  <Row className="g-3">
                    <Col xs={6}>
                      <div className="p-3 rounded bg-success bg-opacity-10 text-center">
                        <div className="text-muted small fw-bold">PRESENT</div>
                        <h3 className="text-success fw-bold mb-0">{myStats?.monthlyStats?.present || 0}</h3>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-3 rounded bg-danger bg-opacity-10 text-center">
                        <div className="text-muted small fw-bold">ABSENT</div>
                        <h3 className="text-danger fw-bold mb-0">{myStats?.monthlyStats?.absent || 0}</h3>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-3 rounded bg-warning bg-opacity-10 text-center">
                        <div className="text-muted small fw-bold">LATE ARRIVAL</div>
                        <h3 className="text-warning fw-bold mb-0">{myStats?.monthlyStats?.late || 0}</h3>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="p-3 rounded bg-info bg-opacity-10 text-center">
                        <div className="text-muted small fw-bold">HALF DAY</div>
                        <h3 className="text-info fw-bold mb-0">{myStats?.monthlyStats?.['half-day'] || 0}</h3>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* CSV Upload Modal */}
      <AttendanceUploadModal
        show={showUploadModal}
        onHide={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Biometric Punch Logs Modal */}
      <PunchDetailsModal 
        show={showPunchModal}
        onHide={() => setShowPunchModal(false)}
        record={selectedPunchRecord}
      />

      {/* Employee Monthly Attendance Modal */}
      <EmployeeMonthlyModal
        show={showMonthlyModal}
        onHide={() => setShowMonthlyModal(false)}
        employee={selectedMonthlyEmployee}
        onViewPunches={(punchRec) => {
          setSelectedPunchRecord(punchRec);
          setShowPunchModal(true);
        }}
      />
    </div>
  );
};

export default AttendanceTracker;