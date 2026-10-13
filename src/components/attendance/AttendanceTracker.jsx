import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FaBusinessTime, FaDoorOpen, FaCalendarAlt, FaMoneyBillWave,
  FaCamera, FaSearchPlus, FaDesktop, FaMobileAlt, FaPauseCircle
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
import CameraPunchModal from './CameraPunchModal';
import AttendancePhotoModal from './AttendancePhotoModal';
import { startSystemOffTracking, stopSystemOffTracking, useSystemOffTracker } from '../../services/systemOffTracker';
import { isMobileDevice } from '../../utils/deviceDetector';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AttendanceTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  // Navigation tabs: Defaults to 'panel' for Admin/HR, 'self' for regular employees
  const [activeTab, setActiveTab] = useState(isAdminOrHR ? 'panel' : 'self');

  // Enforce self tab for regular employees
  useEffect(() => {
    if (!isAdminOrHR) {
      setActiveTab('self');
    }
  }, [isAdminOrHR]);

  // Daily Panel State (Admin/HR Team View)
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

  // Camera Punch Verification & Photo Preview State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraPunchType, setCameraPunchType] = useState('check-in'); // 'check-in' | 'check-out'
  const [isCameraUpdate, setIsCameraUpdate] = useState(false);
  const [punchSubmitting, setPunchSubmitting] = useState(false);
  const [previewPhotoData, setPreviewPhotoData] = useState(null);
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const handleDeviceCheck = () => {
      setIsMobile(isMobileDevice());
    };
    window.addEventListener('resize', handleDeviceCheck);
    return () => window.removeEventListener('resize', handleDeviceCheck);
  }, []);

  // Helper to resolve uploaded image paths
  const getImageSrc = (src) => {
    if (!src) return '';
    if (src.startsWith('data:')) return src;

    const origin = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') 
      : 'https://lms.parakshtech.com';

    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }

    const cleanPath = src.startsWith('/') ? src : `/${src}`;
    return `${origin}${cleanPath}`;
  };

  // Image error fallback helper
  const handleImageError = (e) => {
    if (!e?.target?.src) return;
    const currentSrc = e.target.src;
    if (!e.target.dataset.triedFallback && currentSrc.includes('/uploads/') && !currentSrc.includes('/api/uploads/')) {
      e.target.dataset.triedFallback = 'true';
      e.target.src = currentSrc.replace('/uploads/', '/api/uploads/');
    } else if (!e.target.dataset.triedDirectFallback && currentSrc.includes('/api/uploads/')) {
      e.target.dataset.triedDirectFallback = 'true';
      e.target.src = currentSrc.replace('/api/uploads/', '/uploads/');
    }
  };

  // Self Attendance State (Employee View)
  const [selfYear, setSelfYear] = useState(new Date().getFullYear());
  const [selfMonth, setSelfMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selfStatusFilter, setSelfStatusFilter] = useState('all');
  const [selfDateSearch, setSelfDateSearch] = useState('');
  const [selfMonthlyData, setSelfMonthlyData] = useState(null);
  const [selfMonthlyLoading, setSelfMonthlyLoading] = useState(false);
  const [selfMonthlyError, setSelfMonthlyError] = useState('');
  const [myStats, setMyStats] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selfLoading, setSelfLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time System Off Time & Idle Tracking Hook
  const {
    idleSeconds,
    isIdleOver30Min,
    systemOffMinutes: liveSystemOffMinutes,
    activityStatus
  } = useSystemOffTracker(myStats);

  // Live ticking clock for accurate current time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial fetch for Daily Panel (Admins/HR only)
  useEffect(() => {
    if (isAdminOrHR && activeTab === 'panel') {
      fetchDailyAttendance(selectedDate);
    }
  }, [selectedDate, statusFilter, isAdminOrHR, activeTab]);

  // Fetch Self Attendance & Self Monthly Records
  useEffect(() => {
    if (!isAdminOrHR || activeTab === 'self') {
      fetchSelfAttendance();
      fetchSelfMonthlyAttendance(selfYear, selfMonth, selfStatusFilter, selfDateSearch);
    }
  }, [isAdminOrHR, activeTab, selfYear, selfMonth, selfStatusFilter]);

  // Fetch Daily Attendance from Backend (Admins / HR)
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

  // Fetch Personal Attendance Stats (Today's status)
  const fetchSelfAttendance = async () => {
    try {
      setSelfLoading(true);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const statsRes = await api.get('/attendance/stats', { params: { date: dateStr } }).catch(() => ({ data: { data: {} } }));
      setMyStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching personal attendance:', err);
    } finally {
      setSelfLoading(false);
    }
  };

  // Fetch Complete Personal Monthly Attendance
  const fetchSelfMonthlyAttendance = async (year, month, status, search) => {
    try {
      setSelfMonthlyLoading(true);
      setSelfMonthlyError('');

      const params = {
        year: year !== undefined ? year : selfYear,
        month: month !== undefined ? month : selfMonth
      };
      if (status && status !== 'all') params.status = status;
      if (search) params.dateSearch = search;

      const empId = user?.employee?.id || user?.id;
      if (empId) params.employeeId = empId;

      const res = await api.get('/attendance/employee-monthly', { params });
      if (res.data && res.data.success) {
        setSelfMonthlyData(res.data);
      } else {
        setSelfMonthlyError(res.data?.message || 'Failed to load personal monthly attendance');
      }
    } catch (err) {
      console.error('Fetch self monthly error:', err);
      setSelfMonthlyError(err.response?.data?.message || 'Error loading monthly attendance records.');
    } finally {
      setSelfMonthlyLoading(false);
    }
  };

  const handlePrevSelfMonth = () => {
    if (selfMonth === 'all') {
      setSelfMonth(12);
      return;
    }
    if (selfMonth === 1) {
      setSelfYear(prev => prev - 1);
      setSelfMonth(12);
    } else {
      setSelfMonth(prev => prev - 1);
    }
  };

  const handleNextSelfMonth = () => {
    if (selfMonth === 'all') {
      setSelfMonth(1);
      return;
    }
    if (selfMonth === 12) {
      setSelfYear(prev => prev + 1);
      setSelfMonth(1);
    } else {
      setSelfMonth(prev => prev + 1);
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

  // Trigger camera modal for punch-in
  const triggerPunchInModal = (allowUpdate = false) => {
    if (isMobile) {
      alert('⚠️ Office Desktop/Laptop Required\n\nPunch-In is restricted on mobile devices. Attendance punches must be performed from an office desktop or laptop computer.');
      return;
    }
    setCameraPunchType('check-in');
    setIsCameraUpdate(allowUpdate);
    setShowCameraModal(true);
  };

  // Trigger camera modal for punch-out
  const triggerPunchOutModal = (allowUpdate = false) => {
    if (isMobile) {
      alert('⚠️ Office Desktop/Laptop Required\n\nPunch-Out is restricted on mobile devices. Attendance punches must be performed from an office desktop or laptop computer.');
      return;
    }
    setCameraPunchType('check-out');
    setIsCameraUpdate(allowUpdate);
    setShowCameraModal(true);
  };

  // Personal check-in / check-out with client's exact current time and captured photo
  const handleConfirmPunchWithPhoto = async (photoBase64, punchType, isUpdate = false) => {
    if (isMobile) {
      alert('⚠️ Mobile Punch Restricted: Punch-in and Punch-out can only be performed from an office desktop or laptop computer.');
      return;
    }
    try {
      setPunchSubmitting(true);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const endpoint = punchType === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      const payload = {
        time: timeStr,
        date: dateStr,
        allowUpdate: !!isUpdate,
        image: photoBase64,
        isMobile: false,
        deviceType: 'desktop'
      };

      if (punchType === 'check-out') {
        const storedOff = parseInt(localStorage.getItem('ptk_att_off_minutes'), 10) || 0;
        payload.system_off_minutes = Math.max(liveSystemOffMinutes || 0, storedOff);
      }

      await api.post(endpoint, payload);

      if (punchType === 'check-in') {
        startSystemOffTracking({ date: dateStr, checkInTime: timeStr, initialOffMinutes: 0 });
      } else {
        stopSystemOffTracking();
      }

      setShowCameraModal(false);
      fetchSelfAttendance();
      fetchSelfMonthlyAttendance(selfYear, selfMonth, selfStatusFilter, selfDateSearch);
      if (isAdminOrHR) fetchDailyAttendance(selectedDate || dateStr);
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${punchType}`);
    } finally {
      setPunchSubmitting(false);
    }
  };

  // Direct helper wrappers
  const handleCheckIn = async (allowUpdate = false) => {
    triggerPunchInModal(allowUpdate);
  };

  const handleCheckOut = async (allowUpdate = false) => {
    triggerPunchOutModal(allowUpdate);
  };

  // Export Self Monthly Attendance to CSV
  const handleExportSelfCSV = () => {
    if (!selfMonthlyData || !selfMonthlyData.days || selfMonthlyData.days.length === 0) return;
    const empName = selfMonthlyData.employee?.name || user?.employee?.first_name || 'My_Attendance';
    const monthLabel = selfMonth === 'all' ? 'All_Months' : MONTH_NAMES[selfMonth - 1];

    const headers = [
      'Date', 'Day', 'Status', 'Check-In', 'Late Comment',
      'Check-Out', 'Early Departure Comment', 'System Off Time', 'Working Hours', 'Net Working Hours', 'Remarks'
    ];
    const rows = selfMonthlyData.days.map(d => [
      `"${d.date}"`,
      `"${d.dayOfWeek} (${d.fullDay})"`,
      `"${d.status}"`,
      `"${d.check_in_formatted || '--:--'}"`,
      `"${d.late_comment || ''}"`,
      `"${d.check_out_formatted || '--:--'}"`,
      `"${d.early_leave_comment || ''}"`,
      `"${d.system_off_formatted || `${d.system_off_minutes || 0}m`}"`,
      `"${d.working_hours || 0}"`,
      `"${d.net_working_hours !== undefined ? d.net_working_hours : (d.working_hours || 0)}"`,
      `"${d.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${empName.replace(/\s+/g, '_')}_Attendance_${monthLabel}_${selfYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h2 className="fs-3 fw-bold mb-1 text-dark">
            {isAdminOrHR && activeTab === 'panel' ? 'Attendance Management Panel' : 'My Attendance & Biometric Portal'}
          </h2>
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

          {isAdminOrHR && activeTab === 'panel' && (
            <Button 
              variant="outline-secondary" 
              className="d-flex align-items-center gap-2 bg-white"
              onClick={handleExportCSV}
              disabled={dailyData.length === 0}
            >
              <FaFileDownload />
              <span>Export Daily CSV</span>
            </Button>
          )}

          {(!isAdminOrHR || activeTab === 'self') && (
            <Button 
              variant="outline-secondary" 
              className="d-flex align-items-center gap-2 bg-white"
              onClick={handleExportSelfCSV}
              disabled={!selfMonthlyData?.days || selfMonthlyData.days.length === 0}
            >
              <FaFileDownload />
              <span>Export Monthly CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation: Only shown to Admin, HR, and Manager */}
      {isAdminOrHR && (
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
      )}

      {/* TAB 1: DAILY ATTENDANCE & TEAM PANEL (Admins / HR / Managers only) */}
      {isAdminOrHR && activeTab === 'panel' && (
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
            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
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

            <Col xs={6} sm={4} md={3} lg>
              <Card 
                className={`kpi-stat-card h-100 ${statusFilter === 'system_off' ? 'border border-danger border-2 bg-danger bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(statusFilter === 'system_off' ? 'all' : 'system_off')}
                title="Click to toggle filter: Staff with System Off Time (> 30m Inactive)"
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="kpi-icon-wrapper systemoff">
                    <FaPauseCircle />
                  </div>
                  <div>
                    <div className="kpi-label text-danger">System Off</div>
                    <div className="kpi-value text-danger">
                      {summary.systemOffCount !== undefined ? summary.systemOffCount : dailyData.filter(r => r.is_present && (r.system_off_minutes || 0) > 0).length}
                    </div>
                    <div className="kpi-subtext">
                      {statusFilter === 'system_off' ? '✓ Active' : '> 30m inactive'}
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
                  { id: 'system_off', label: `System Off (${summary.systemOffCount !== undefined ? summary.systemOffCount : dailyData.filter(r => r.is_present && (r.system_off_minutes || 0) > 0).length})` },
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
                        <th>System Off Time</th>
                        <th>Working Hours</th>
                        <th>Actions</th>
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
                              <div className="d-flex align-items-center gap-2">
                                {record.check_in_image && (
                                  <div 
                                    className="punch-photo-thumb-wrapper"
                                    onClick={() => setPreviewPhotoData({
                                      image: record.check_in_image,
                                      imageSrc: getImageSrc(record.check_in_image),
                                      punchType: 'check-in',
                                      employeeName: record.name,
                                      jobNo: record.job_no,
                                      date: record.date,
                                      time: record.check_in_formatted
                                    })}
                                    title="Click to view full Check-In photo"
                                    style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', cursor: 'pointer' }}
                                  >
                                    <img 
                                      src={getImageSrc(record.check_in_image)} 
                                      alt="In" 
                                      className="punch-photo-thumb" 
                                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', objectFit: 'cover' }}
                                      onError={handleImageError}
                                    />
                                    <div className="punch-photo-badge in">IN</div>
                                  </div>
                                )}
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
                              </div>
                            ) : (
                              <span className="text-muted small">--:-- (Absent)</span>
                            )}
                          </td>

                          {/* Check-Out */}
                          <td>
                            {record.is_present ? (
                              record.check_out ? (
                                <div className="d-flex align-items-center gap-2">
                                  {record.check_out_image && (
                                    <div 
                                      className="punch-photo-thumb-wrapper"
                                      onClick={() => setPreviewPhotoData({
                                        image: record.check_out_image,
                                        imageSrc: getImageSrc(record.check_out_image),
                                        punchType: 'check-out',
                                        employeeName: record.name,
                                        jobNo: record.job_no,
                                        date: record.date,
                                        time: record.check_out_formatted
                                      })}
                                      title="Click to view full Check-Out photo"
                                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', cursor: 'pointer' }}
                                    >
                                      <img 
                                        src={getImageSrc(record.check_out_image)} 
                                        alt="Out" 
                                        className="punch-photo-thumb" 
                                        style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', objectFit: 'cover' }}
                                        onError={handleImageError}
                                      />
                                      <div className="punch-photo-badge out">OUT</div>
                                    </div>
                                  )}
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

                          {/* System Off Time */}
                          <td>
                            {record.is_present ? (
                              record.system_off_minutes > 0 ? (
                                <div>
                                  <div className="d-flex align-items-center gap-1">
                                    <span 
                                      className={`badge ${record.is_live_off ? 'bg-danger text-white' : 'bg-danger bg-opacity-10 text-danger border border-danger-subtle'} py-1 px-2 font-monospace`}
                                      style={{ fontSize: '11px' }}
                                    >
                                      ⏸ {record.system_off_formatted || `${record.system_off_minutes}m`}
                                    </span>
                                  </div>
                                  <div className="text-muted mt-1" style={{ fontSize: '10px' }}>
                                    {record.is_live_off ? (
                                      <span className="text-danger fw-semibold">🔴 Live Off (&gt; 30m)</span>
                                    ) : (
                                      <span>Inactive &gt; 30m</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle py-1 px-2 font-monospace" style={{ fontSize: '11px' }}>
                                    ✓ 0m (Active)
                                  </span>
                                  <div className="text-muted mt-1" style={{ fontSize: '10px' }}>Continuous</div>
                                </div>
                              )
                            ) : (
                              <span className="text-muted small">--</span>
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
                                {record.system_off_minutes > 0 ? (
                                  <div className="mt-1" style={{ fontSize: '11px' }}>
                                    <span className="text-muted">Net: </span>
                                    <strong className="text-success font-monospace">{record.net_working_hours}h</strong>
                                  </div>
                                ) : (
                                  <div className="text-muted mt-1" style={{ fontSize: '10px' }}>
                                    Net: <strong className="text-success">{record.working_hours}h</strong>
                                  </div>
                                )}
                                <div className="mt-1" style={{ maxWidth: '100px' }}>
                                  <ProgressBar 
                                    now={Math.min(100, ((record.net_working_hours !== undefined ? record.net_working_hours : record.working_hours) / 9) * 100)} 
                                    variant={(record.net_working_hours !== undefined ? record.net_working_hours : record.working_hours) >= 8 ? 'success' : (record.net_working_hours !== undefined ? record.net_working_hours : record.working_hours) >= 4 ? 'warning' : 'danger'}
                                    style={{ height: '4px' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">0 hrs</span>
                            )}
                          </td>

                          {/* Actions: Punch Details & Salary Slip */}
                          <td>
                            <div className="d-flex align-items-center gap-1">
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
                                <span className="text-muted small me-1">No punches</span>
                              )}

                              {isAdminOrHR && (
                                <Button 
                                  variant="outline-success" 
                                  size="sm" 
                                  className="py-1 px-2 d-flex align-items-center gap-1"
                                  onClick={() => {
                                    const yr = selectedDate ? selectedDate.substring(0, 4) : 2026;
                                    const mo = selectedDate ? parseInt(selectedDate.substring(5, 7), 10) : 9;
                                    navigate(`/salary?employeeId=${record.employee_id || record.id}&year=${yr}&month=${mo}`);
                                  }}
                                  title="Check & approve salary for this employee"
                                >
                                  <FaMoneyBillWave size={12} />
                                  <span>Salary</span>
                                </Button>
                              )}
                            </div>
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

      {/* TAB 2: PERSONAL ATTENDANCE & PUNCH (Shown to regular employees and to managers on 'self' tab) */}
      {(!isAdminOrHR || activeTab === 'self') && (
        <div>
          {/* Top 2 Action & Profile Cards */}
          <Row className="g-3 mb-4">
            {/* Action Card: Today's Status & Punch */}
            <Col xs={12} lg={6}>
              <Card className="attendance-action-card h-100 shadow-sm border-0">
                <Card.Body className="d-flex flex-column justify-content-between p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="card-title fw-bold mb-0">Today's Punch Status</h5>
                      <div className="small text-primary fw-semibold mt-1 d-flex align-items-center gap-1">
                        <FaClock size={12} />
                        <span>Current Time: <strong>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</strong></span>
                      </div>
                    </div>
                    <Badge bg="light" className="text-secondary border py-2 px-3">
                      <FaCalendarDay className="me-1 text-primary" /> {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </Badge>
                  </div>

                  <div className="text-center py-3">
                    {myStats?.todayStatus === 'checked-in' ? (
                      <>
                        <div className="status-icon checked-in mb-3">
                          <FaClock size={40} className="text-success" />
                        </div>
                        <h4 className="fw-bold text-success mb-1">Checked In</h4>
                        <p className="text-muted mb-2">
                          First punch recorded at: <strong className="text-dark font-monospace fs-5">{myStats?.checkInTime}</strong>
                        </p>

                        {/* Punch In Photo Thumbnail */}
                        {myStats?.checkInImage && (
                          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                            <div 
                              className="rounded overflow-hidden shadow-sm border position-relative" 
                              style={{ width: '60px', height: '60px', cursor: 'pointer', background: '#000' }}
                              onClick={() => setPreviewPhotoData({
                                image: myStats.checkInImage,
                                punchType: 'check-in',
                                employeeName: selfMonthlyData?.employee?.name || user?.employee?.first_name || 'Staff Member',
                                jobNo: selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || '',
                                date: currentTime.toLocaleDateString('en-GB'),
                                time: myStats?.checkInTime
                              })}
                              title="Click to view arrival selfie"
                            >
                              <img 
                                src={getImageSrc(myStats.checkInImage)} 
                                alt="Check-in Photo" 
                                className="w-100 h-100" 
                                style={{ objectFit: 'cover' }} 
                                onError={handleImageError}
                              />
                              <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-1" style={{ fontSize: '8px', lineHeight: 1 }}>
                                <FaSearchPlus />
                              </div>
                            </div>
                            <div className="text-start">
                              <div className="small fw-semibold text-dark">Arrival Photo</div>
                              <Badge bg="success" className="d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                                <FaCamera size={9} /> Verified In
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Live Activity & System Off Time Status Card */}
                        <div className="bg-light p-3 rounded border mb-3 text-start small">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted fw-semibold">Current Activity:</span>
                            {activityStatus === 'active' ? (
                              <Badge bg="success" className="d-inline-flex align-items-center gap-1 py-1 px-2">
                                <span className="spinner-grow spinner-grow-sm text-white" style={{ width: '8px', height: '8px' }} />
                                <span>Active & Working</span>
                              </Badge>
                            ) : activityStatus === 'grace' ? (
                              <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1 py-1 px-2">
                                <span>🟡 Away: {Math.floor(idleSeconds / 60)}m (Grace up to 30m)</span>
                              </Badge>
                            ) : (
                              <Badge bg="danger" className="d-inline-flex align-items-center gap-1 py-1 px-2">
                                <span>🔴 System Off ({Math.floor(idleSeconds / 60)}m inactive)</span>
                              </Badge>
                            )}
                          </div>

                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            <div>
                              <span className="text-muted d-block" style={{ fontSize: '11px' }}>System Off Time:</span>
                              <span className={`fw-bold font-monospace ${liveSystemOffMinutes > 0 ? 'text-danger' : 'text-success'}`}>
                                {liveSystemOffMinutes > 0 ? `${liveSystemOffMinutes} mins` : '0 mins'}
                              </span>
                            </div>
                            <div className="text-end">
                              <span className="text-muted d-block" style={{ fontSize: '11px' }}>Net Productive Hours:</span>
                              <span className="fw-bold font-monospace text-primary">
                                {myStats?.netWorkingHours !== undefined ? `${myStats.netWorkingHours} hrs` : '--'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isMobile && (
                          <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 px-3 mb-3 text-start border-warning shadow-sm mx-auto" style={{ maxWidth: '440px' }}>
                            <FaDesktop className="fs-3 text-warning flex-shrink-0" />
                            <div>
                              <strong className="d-block text-dark">Office System Login Required</strong>
                              <span className="text-muted small">
                                Punch-Out is restricted on mobile devices. Please log in using an office desktop or laptop computer to punch out.
                              </span>
                            </div>
                          </Alert>
                        )}

                        <div className="d-flex flex-column align-items-center gap-2">
                          <Button 
                            variant={isMobile ? "secondary" : "danger"} 
                            onClick={() => triggerPunchOutModal(false)}
                            disabled={checkingOut || punchSubmitting || isMobile}
                            className="px-4 py-2 shadow-sm fw-semibold d-flex align-items-center gap-2"
                            title={isMobile ? "Punching is restricted on mobile devices. Please log in from a desktop or laptop system." : undefined}
                          >
                            {isMobile ? <FaDesktop size={14} /> : <FaCamera size={14} />}
                            <span>{isMobile ? 'Punch-Out Disabled on Mobile (Use PC)' : `Punch Check Out (${currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })})`}</span>
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-muted text-decoration-none p-0 mt-1"
                            onClick={() => triggerPunchInModal(true)}
                            disabled={checkingIn || punchSubmitting || isMobile}
                            title={isMobile ? "Restricted on mobile devices" : "Update check in punch with new photo"}
                          >
                            <small>↻ Update Check In to Current Time</small>
                          </Button>
                        </div>
                      </>
                    ) : myStats?.todayStatus === 'checked-out' ? (
                      <>
                        <div className="status-icon completed mb-3">
                          <FaCheckCircle size={40} className="text-primary" />
                        </div>
                        <h4 className="fw-bold text-success mb-1">Attendance Completed</h4>
                        <p className="text-muted mb-2">
                          Checked out at: <strong className="text-dark font-monospace fs-5">{myStats?.checkOutTime}</strong>
                        </p>

                        {/* Working Hours & System Off Time Summary */}
                        <div className="bg-light p-3 rounded border mb-3 small d-flex justify-content-between align-items-center text-center">
                          <div>
                            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Gross Working</span>
                            <strong className="text-dark font-monospace">{myStats?.workingHours || 0} hrs</strong>
                          </div>
                          <div>
                            <span className="text-muted d-block" style={{ fontSize: '11px' }}>System Off Time (&gt;30m)</span>
                            <span className={`badge ${myStats?.systemOffMinutes > 0 ? 'bg-danger' : 'bg-success bg-opacity-25 text-success'}`}>
                              {myStats?.systemOffMinutes || 0}m
                            </span>
                          </div>
                          <div>
                            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Net Productive</span>
                            <strong className="text-primary font-monospace">{myStats?.netWorkingHours || myStats?.workingHours || 0} hrs</strong>
                          </div>
                        </div>

                        {/* Punch In and Punch Out Photos Side by Side */}
                        <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                          {myStats?.checkInImage && (
                            <div 
                              className="text-center"
                              onClick={() => setPreviewPhotoData({
                                image: myStats.checkInImage,
                                punchType: 'check-in',
                                employeeName: selfMonthlyData?.employee?.name || user?.employee?.first_name || 'Staff Member',
                                jobNo: selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || '',
                                date: currentTime.toLocaleDateString('en-GB'),
                                time: myStats?.checkInTime
                              })}
                              style={{ cursor: 'pointer' }}
                              title="Click to view arrival photo"
                            >
                              <div className="rounded overflow-hidden shadow-sm border mx-auto position-relative" style={{ width: '56px', height: '56px', background: '#000' }}>
                                <img src={getImageSrc(myStats.checkInImage)} alt="In Photo" className="w-100 h-100" style={{ objectFit: 'cover' }} onError={handleImageError} />
                                <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-1" style={{ fontSize: '8px', lineHeight: 1 }}>
                                  <FaSearchPlus />
                                </div>
                              </div>
                              <div className="text-muted mt-1 fw-semibold" style={{ fontSize: '10px' }}>Arrival Photo</div>
                            </div>
                          )}

                          {myStats?.checkOutImage && (
                            <div 
                              className="text-center"
                              onClick={() => setPreviewPhotoData({
                                image: myStats.checkOutImage,
                                punchType: 'check-out',
                                employeeName: selfMonthlyData?.employee?.name || user?.employee?.first_name || 'Staff Member',
                                jobNo: selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || '',
                                date: currentTime.toLocaleDateString('en-GB'),
                                time: myStats?.checkOutTime
                              })}
                              style={{ cursor: 'pointer' }}
                              title="Click to view departure photo"
                            >
                              <div className="rounded overflow-hidden shadow-sm border mx-auto position-relative" style={{ width: '56px', height: '56px', background: '#000' }}>
                                <img src={getImageSrc(myStats.checkOutImage)} alt="Out Photo" className="w-100 h-100" style={{ objectFit: 'cover' }} onError={handleImageError} />
                                <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-1" style={{ fontSize: '8px', lineHeight: 1 }}>
                                  <FaSearchPlus />
                                </div>
                              </div>
                              <div className="text-muted mt-1 fw-semibold" style={{ fontSize: '10px' }}>Departure Photo</div>
                            </div>
                          )}
                        </div>

                        <div className="d-flex flex-column align-items-center gap-2">
                          <Badge bg="success" className="py-2 px-3 fs-6">
                            ✓ Today's punches recorded with photo
                          </Badge>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-muted text-decoration-none p-0 mt-1"
                            onClick={() => triggerPunchOutModal(true)}
                            disabled={checkingOut || punchSubmitting || isMobile}
                            title={isMobile ? "Restricted on mobile devices" : "Update check out punch with new photo"}
                          >
                            <small>↻ Update Check Out to Current Time</small>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="status-icon not-checked mb-3">
                          <FaCalendarCheck size={40} className="text-warning" />
                        </div>
                        <h4 className="fw-bold mb-1">Not Checked In Yet</h4>
                        <p className="text-muted mb-3">
                          Standard office timing: <strong>09:30 AM – 06:30 PM</strong>
                        </p>

                        {isMobile && (
                          <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 px-3 mb-3 text-start border-warning shadow-sm mx-auto" style={{ maxWidth: '440px' }}>
                            <FaDesktop className="fs-3 text-warning flex-shrink-0" />
                            <div>
                              <strong className="d-block text-dark">Office System Login Required</strong>
                              <span className="text-muted small">
                                Punch-In is restricted on mobile devices. Please log in using your office desktop or laptop computer to record attendance punches.
                              </span>
                            </div>
                          </Alert>
                        )}

                        <Button 
                          variant={isMobile ? "secondary" : "primary"} 
                          onClick={() => triggerPunchInModal(false)}
                          disabled={checkingIn || punchSubmitting || isMobile}
                          className="px-4 py-2 shadow-sm fw-semibold d-flex align-items-center gap-2 mx-auto"
                          title={isMobile ? "Punching is restricted on mobile devices. Please log in from a desktop or laptop system." : undefined}
                        >
                          {isMobile ? <FaDesktop size={14} /> : <FaCamera size={14} />}
                          <span>{isMobile ? 'Punch-In Disabled on Mobile (Use PC)' : `Punch Check In (${currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })})`}</span>
                        </Button>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Profile Greeting & Quick Stats */}
            <Col xs={12} lg={6}>
              <Card className="stats-card h-100 shadow-sm border-0">
                <Card.Body className="d-flex flex-column justify-content-between p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div 
                      className="employee-avatar shadow-sm"
                      style={{ width: '52px', height: '52px', fontSize: '20px' }}
                    >
                      {getInitials(selfMonthlyData?.employee?.name || user?.employee?.first_name || user?.email)}
                    </div>
                    <div>
                      <h5 className="fw-bold mb-0 text-dark">
                        {selfMonthlyData?.employee?.name || `${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || 'My Attendance'}
                      </h5>
                      <div className="text-muted small">
                        Job No: <span className="fw-bold text-primary font-monospace">{selfMonthlyData?.employee?.job_no || user?.employee?.employee_id || '--'}</span>
                        <span className="mx-2">•</span>
                        <span>{user?.employee?.department || 'Staff'}</span>
                        <span className="mx-2">•</span>
                        <span>{user?.employee?.position || 'Employee'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Highlights for selected month */}
                  <Row className="g-2 text-center">
                    <Col xs={4}>
                      <div className="p-3 rounded bg-primary bg-opacity-10">
                        <div className="text-primary small fw-bold">WORKING DAYS</div>
                        <h3 className="text-primary fw-bold mb-0">{selfMonthlyData?.summary?.workingDays || 0}</h3>
                        <div className="text-muted" style={{ fontSize: '11px' }}>of {selfMonthlyData?.summary?.totalDays || 0} days</div>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="p-3 rounded bg-success bg-opacity-10">
                        <div className="text-success small fw-bold">PRESENT</div>
                        <h3 className="text-success fw-bold mb-0">{selfMonthlyData?.summary?.presentCount || 0}</h3>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          {(selfMonthlyData?.summary?.workingDays || 0) > 0 
                            ? `${Math.round(((selfMonthlyData?.summary?.presentCount || 0) / selfMonthlyData.summary.workingDays) * 100)}% attendance`
                            : '0%'}
                        </div>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="p-3 rounded bg-purple bg-opacity-10" style={{ backgroundColor: '#f3e8ff' }}>
                        <div className="text-purple small fw-bold">LOGGED HOURS</div>
                        <h3 className="text-purple fw-bold mb-0">{selfMonthlyData?.summary?.totalWorkingHours || 0}h</h3>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          Avg: {selfMonthlyData?.summary?.avgWorkingHours || 0}h/day
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Monthly Detailed Breakdown Card */}
          <Card className="attendance-table-card shadow-sm border-0 mb-4">
            <Card.Header className="bg-white p-3 border-bottom">
              <Row className="g-2 align-items-center">
                {/* Year Selector */}
                <Col xs={6} sm={4} md={2}>
                  <Form.Label className="small text-muted fw-bold mb-1">Year</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={selfYear} 
                    onChange={(e) => setSelfYear(parseInt(e.target.value, 10))}
                  >
                    {[2025, 2026, 2027].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </Form.Select>
                </Col>

                {/* Month Selector with Prev/Next */}
                <Col xs={6} sm={8} md={4}>
                  <Form.Label className="small text-muted fw-bold mb-1">Month</Form.Label>
                  <div className="d-flex align-items-center gap-1">
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handlePrevSelfMonth}
                      title="Previous Month"
                      className="px-2"
                    >
                      <FaChevronLeft size={10} />
                    </Button>
                    <Form.Select 
                      size="sm" 
                      value={selfMonth} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelfMonth(val === 'all' ? 'all' : parseInt(val, 10));
                      }}
                      className="fw-semibold"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {mName} {selfYear}
                        </option>
                      ))}
                      <option value="all">Full Year ({selfYear})</option>
                    </Form.Select>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handleNextSelfMonth}
                      title="Next Month"
                      className="px-2"
                    >
                      <FaChevronRight size={10} />
                    </Button>
                  </div>
                </Col>

                {/* Status Filter */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Label className="small text-muted fw-bold mb-1">Status Filter</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={selfStatusFilter} 
                    onChange={(e) => setSelfStatusFilter(e.target.value)}
                  >
                    <option value="all">All Days</option>
                    <option value="working_days">Working Days Only</option>
                    <option value="present">Present Days Only</option>
                    <option value="absent">Absent Days Only</option>
                    <option value="late">Late Comers (&gt; 09:30 AM)</option>
                    <option value="early_leave">Left Early (&lt; 06:30 PM)</option>
                    <option value="on_time">On Time Days</option>
                    <option value="weekend">Weekends (Sundays)</option>
                  </Form.Select>
                </Col>

                {/* Search Day / Date */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Label className="small text-muted fw-bold mb-1">Find Day / Date</Form.Label>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-white border-end-0">
                      <FaSearch className="text-muted" size={12} />
                    </InputGroup.Text>
                    <Form.Control 
                      placeholder="e.g. 15 or Mon" 
                      value={selfDateSearch}
                      onChange={(e) => {
                        setSelfDateSearch(e.target.value);
                        fetchSelfMonthlyAttendance(selfYear, selfMonth, selfStatusFilter, e.target.value);
                      }}
                      className="border-start-0 ps-0"
                    />
                    {selfDateSearch && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => {
                          setSelfDateSearch('');
                          fetchSelfMonthlyAttendance(selfYear, selfMonth, selfStatusFilter, '');
                        }}
                      >
                        ✕
                      </Button>
                    )}
                  </InputGroup>
                </Col>
              </Row>
            </Card.Header>

            <Card.Body className="p-3">
              {/* Monthly KPI Summary Cards (All Clickable Filters) */}
              <Row className="g-2 mb-4">
                <Col xs={6} sm={4} md={2}>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'working_days' ? 'border-primary border-2 bg-primary bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'working_days' ? 'all' : 'working_days')}
                    title="Click to toggle filter: Working Days only"
                  >
                    <div className="text-primary small fw-bold">WORKING DAYS</div>
                    <div className="fs-5 fw-bold text-primary mt-1">{selfMonthlyData?.summary?.workingDays || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      of {selfMonthlyData?.summary?.totalDays || 0} days {selfStatusFilter === 'working_days' ? '✓ Active' : ''}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2}>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'present' ? 'border-success border-2 bg-success bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'present' ? 'all' : 'present')}
                    title="Click to toggle filter: Present Days"
                  >
                    <div className="text-success small fw-bold">PRESENT</div>
                    <div className="fs-5 fw-bold text-success mt-1">{selfMonthlyData?.summary?.presentCount || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'present' ? '✓ Active' : ((selfMonthlyData?.summary?.workingDays || 0) > 0 ? `${Math.round(((selfMonthlyData?.summary?.presentCount || 0) / selfMonthlyData.summary.workingDays) * 100)}% attendance` : '0%')}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2}>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'absent' ? 'border-danger border-2 bg-danger bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'absent' ? 'all' : 'absent')}
                    title="Click to toggle filter: Absent Days"
                  >
                    <div className="text-danger small fw-bold">ABSENT</div>
                    <div className="fs-5 fw-bold text-danger mt-1">{selfMonthlyData?.summary?.absentCount || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'absent' ? '✓ Active' : 'Unpunched days'}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2}>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'late' ? 'border-warning border-2 bg-warning bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'late' ? 'all' : 'late')}
                    title="Click to toggle filter: Late Arrivals (> 09:30 AM)"
                  >
                    <div className="text-warning small fw-bold">LATE ARRIVALS</div>
                    <div className="fs-5 fw-bold text-warning mt-1">{selfMonthlyData?.summary?.lateCount || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'late' ? '✓ Active' : '> 09:30 AM'}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2}>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'early_leave' ? 'border-info border-2 bg-info bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'early_leave' ? 'all' : 'early_leave')}
                    title="Click to toggle filter: Left Early (< 06:30 PM)"
                  >
                    <div className="text-purple small fw-bold">LEFT EARLY</div>
                    <div className="fs-5 fw-bold text-purple mt-1">{selfMonthlyData?.summary?.earlyLeaveCount || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'early_leave' ? '✓ Active' : '< 06:30 PM'}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2} xl>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'on_time' ? 'border-success border-2 bg-success bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'on_time' ? 'all' : 'on_time')}
                    title="Click to toggle filter: On Time Days"
                  >
                    <div className="text-success small fw-bold">ON TIME</div>
                    <div className="fs-5 fw-bold text-success mt-1">{selfMonthlyData?.summary?.onTimeCount || 0}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'on_time' ? '✓ Active' : `${selfMonthlyData?.summary?.totalWorkingHours || 0}h total`}
                    </div>
                  </div>
                </Col>

                <Col xs={6} sm={4} md={2} xl>
                  <div 
                    className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                      selfStatusFilter === 'system_off' ? 'border-danger border-2 bg-danger bg-opacity-10 active-filter' : ''
                    }`}
                    onClick={() => setSelfStatusFilter(selfStatusFilter === 'system_off' ? 'all' : 'system_off')}
                    title="Click to toggle filter: Days with System Off Time"
                  >
                    <div className="text-danger small fw-bold">SYSTEM OFF</div>
                    <div className="fs-5 fw-bold text-danger mt-1">
                      {selfMonthlyData?.summary?.totalSystemOffFormatted || `${selfMonthlyData?.summary?.totalSystemOffMinutes || 0}m`}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {selfStatusFilter === 'system_off' ? '✓ Active' : `Net: ${selfMonthlyData?.summary?.totalNetWorkingHours || selfMonthlyData?.summary?.totalWorkingHours || 0}h`}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Attendance Table */}
              {selfMonthlyLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted small">Loading personal attendance records...</p>
                </div>
              ) : selfMonthlyError ? (
                <Alert variant="danger">{selfMonthlyError}</Alert>
              ) : !selfMonthlyData?.days || selfMonthlyData.days.length === 0 ? (
                <div className="text-center py-5 bg-white border rounded">
                  <FaCalendarDay size={40} className="text-muted opacity-50 mb-2" />
                  <p className="fw-bold mb-1">No attendance records found matching filters.</p>
                  <p className="text-muted small">Try choosing another month or resetting the status filter.</p>
                </div>
              ) : (
                <div className="table-responsive border rounded bg-white shadow-sm">
                  <Table hover size="sm" className="attendance-table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date & Day</th>
                        <th>Status</th>
                        <th>Check-In (09:30 AM)</th>
                        <th>Check-Out (06:30 PM)</th>
                        <th>System Off Time</th>
                        <th>Working Hours</th>
                        <th>Remarks / Comment</th>
                        <th>Biometric Logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selfMonthlyData.days.map((day) => (
                        <tr key={day.date} className={day.isWeekend ? 'bg-light bg-opacity-50' : ''}>
                          {/* Date & Day */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold font-monospace">{day.date}</span>
                              <Badge bg={day.isWeekend ? 'secondary' : 'light'} className={day.isWeekend ? '' : 'text-dark border'}>
                                {day.dayOfWeek}
                              </Badge>
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            {day.status === 'present' ? (
                              <span className="badge-present d-inline-flex align-items-center gap-1">
                                <FaCheckCircle size={10} />
                                <span>Present</span>
                              </span>
                            ) : day.status === 'absent' ? (
                              <span className="badge-absent d-inline-flex align-items-center gap-1">
                                <FaTimesCircle size={10} />
                                <span>Absent</span>
                              </span>
                            ) : day.status === 'weekend' ? (
                              <span className="badge bg-secondary d-inline-flex align-items-center gap-1 py-1 px-2">
                                <span>Weekly Off</span>
                              </span>
                            ) : day.status === 'holiday' ? (
                              <span className="badge bg-info d-inline-flex align-items-center gap-1 py-1 px-2">
                                <span>Holiday</span>
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border">Upcoming</span>
                            )}
                          </td>

                          {/* Check In */}
                          <td>
                            {day.is_present ? (
                              <div className="d-flex align-items-center gap-2">
                                {day.check_in_image && (
                                  <div 
                                    className="punch-photo-thumb-wrapper"
                                    onClick={() => setPreviewPhotoData({
                                      image: day.check_in_image,
                                      imageSrc: getImageSrc(day.check_in_image),
                                      punchType: 'check-in',
                                      title: `Punch-In Photo - ${selfMonthlyData?.employee?.name || 'Me'}`,
                                      employeeName: selfMonthlyData?.employee?.name || user?.name || 'Me',
                                      jobNo: selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || '',
                                      time: day.check_in_formatted,
                                      date: day.date,
                                      type: 'Check-In'
                                    })}
                                    title="Click to view full Check-In photo"
                                    style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', cursor: 'pointer' }}
                                  >
                                    <img 
                                      src={getImageSrc(day.check_in_image)} 
                                      alt="In" 
                                      className="punch-photo-thumb" 
                                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', objectFit: 'cover' }}
                                      onError={handleImageError}
                                    />
                                    <div className="punch-photo-badge in">IN</div>
                                  </div>
                                )}
                                <div>
                                  <span className="fw-bold font-monospace">{day.check_in_formatted}</span>
                                  {day.is_late ? (
                                    <div className="mt-1">
                                      <span className="badge-late">⚠️ Late ({day.late_minutes}m)</span>
                                    </div>
                                  ) : (
                                    <div className="mt-1">
                                      <span className="badge-ontime">✓ On Time</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">--:--</span>
                            )}
                          </td>

                          {/* Check Out */}
                          <td>
                            {day.is_present ? (
                              day.check_out ? (
                                <div className="d-flex align-items-center gap-2">
                                  {day.check_out_image && (
                                    <div 
                                      className="punch-photo-thumb-wrapper"
                                      onClick={() => setPreviewPhotoData({
                                        image: day.check_out_image,
                                        imageSrc: getImageSrc(day.check_out_image),
                                        punchType: 'check-out',
                                        title: `Punch-Out Photo - ${selfMonthlyData?.employee?.name || 'Me'}`,
                                        employeeName: selfMonthlyData?.employee?.name || user?.name || 'Me',
                                        jobNo: selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || '',
                                        time: day.check_out_formatted,
                                        date: day.date,
                                        type: 'Check-Out'
                                      })}
                                      title="Click to view full Check-Out photo"
                                      style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', cursor: 'pointer' }}
                                    >
                                      <img 
                                        src={getImageSrc(day.check_out_image)} 
                                        alt="Out" 
                                        className="punch-photo-thumb" 
                                        style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', objectFit: 'cover' }}
                                        onError={handleImageError}
                                      />
                                      <div className="punch-photo-badge out">OUT</div>
                                    </div>
                                  )}
                                  <div>
                                    <span className="fw-bold font-monospace">{day.check_out_formatted}</span>
                                    {day.is_early_leave ? (
                                      <div className="mt-1">
                                        <span className="badge-early-leave">⏱ Left early ({day.early_leave_minutes}m)</span>
                                      </div>
                                    ) : (
                                      <div className="mt-1">
                                        <span className="badge-ontime">✓ Full Day</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-warning small fw-bold">No Check-Out</span>
                                  <div className="text-muted" style={{ fontSize: '11px' }}>Missed exit punch</div>
                                </div>
                              )
                            ) : (
                              <span className="text-muted small">--:--</span>
                            )}
                          </td>

                          {/* System Off Time */}
                          <td>
                            {day.is_present ? (
                              day.system_off_minutes > 0 ? (
                                <div>
                                  <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle py-1 px-2 font-monospace" style={{ fontSize: '11px' }}>
                                    ⏸ {day.system_off_formatted || `${day.system_off_minutes}m`}
                                  </span>
                                  <div className="text-muted mt-1" style={{ fontSize: '10px' }}>Inactive &gt; 30m</div>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle py-1 px-2 font-monospace" style={{ fontSize: '11px' }}>
                                    ✓ 0m (Active)
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-muted small">--</span>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td>
                            {day.is_present && day.working_hours > 0 ? (
                              <div>
                                <span className="hours-pill">
                                  <FaClock size={11} className="text-primary" />
                                  <span>{day.working_hours_formatted}</span>
                                </span>
                                {day.system_off_minutes > 0 ? (
                                  <div className="mt-1" style={{ fontSize: '11px' }}>
                                    <span className="text-muted">Net: </span>
                                    <strong className="text-success font-monospace">{day.net_working_hours}h</strong>
                                  </div>
                                ) : (
                                  <div className="text-muted mt-1" style={{ fontSize: '10px' }}>
                                    Net: <strong className="text-success">{day.working_hours}h</strong>
                                  </div>
                                )}
                                <div className="mt-1" style={{ maxWidth: '100px' }}>
                                  <ProgressBar 
                                    now={Math.min(100, ((day.net_working_hours !== undefined ? day.net_working_hours : day.working_hours) / 9) * 100)} 
                                    variant={(day.net_working_hours !== undefined ? day.net_working_hours : day.working_hours) >= 8 ? 'success' : (day.net_working_hours !== undefined ? day.net_working_hours : day.working_hours) >= 4 ? 'warning' : 'danger'}
                                    style={{ height: '4px' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">0 hrs</span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td>
                            {day.is_present ? (
                              <span className="small text-secondary">{day.remarks || 'Standard punch'}</span>
                            ) : day.isWeekend ? (
                              <span className="small text-muted fst-italic">Sunday Off</span>
                            ) : day.isHoliday ? (
                              <span className="small text-info fw-semibold">{day.remarks}</span>
                            ) : (
                              <span className="small text-danger">No punch recorded</span>
                            )}
                          </td>

                          {/* Biometric Raw Punches */}
                          <td>
                            {day.raw_punches && day.raw_punches.length > 0 ? (
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="py-1 px-2 d-flex align-items-center gap-1"
                                onClick={() => handleViewPunches({
                                  name: selfMonthlyData?.employee?.name || user?.employee?.first_name || 'My Punches',
                                  job_no: selfMonthlyData?.employee?.job_no || user?.employee?.employee_id || '--',
                                  date: day.date,
                                  raw_punches: day.raw_punches
                                })}
                                title="Inspect raw biometric timestamps"
                              >
                                <FaEye size={12} />
                                <span>{day.raw_punches.length} punches</span>
                              </Button>
                            ) : (
                              <span className="text-muted small">--</span>
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
        onViewPhoto={(photoData) => setPreviewPhotoData(photoData)}
      />

      {/* Camera Punch Verification Modal */}
      <CameraPunchModal
        show={showCameraModal}
        onHide={() => setShowCameraModal(false)}
        punchType={cameraPunchType}
        isUpdate={isCameraUpdate}
        employeeName={selfMonthlyData?.employee?.name || `${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || user?.name || 'Staff Member'}
        jobNo={selfMonthlyData?.employee?.employee_id || user?.employee?.employee_id || ''}
        onConfirmPunch={handleConfirmPunchWithPhoto}
        submitting={punchSubmitting}
      />

      {/* High-Resolution Attendance Photo Viewer Modal */}
      {previewPhotoData && (
        <AttendancePhotoModal
          show={!!previewPhotoData}
          onHide={() => setPreviewPhotoData(null)}
          photoData={previewPhotoData}
        />
      )}
    </div>
  );
};

export default AttendanceTracker;