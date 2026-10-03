import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Table, Badge, Row, Col, 
  Spinner, Alert, Form, InputGroup, ProgressBar, Card 
} from 'react-bootstrap';
import { 
  FaCalendarAlt, FaCalendarDay, FaClock, FaUserCheck, 
  FaUserTimes, FaExclamationTriangle, FaDoorOpen, FaCheckCircle, 
  FaFileDownload, FaSearch, FaChevronLeft, FaChevronRight, 
  FaBusinessTime, FaEye, FaTimesCircle, FaBuilding, FaUserTie 
} from 'react-icons/fa';
import api from '../../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EmployeeMonthlyModal = ({ show, onHide, employee, onViewPunches }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(9); // 1-12 or 'all'
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateSearch, setDateSearch] = useState('');

  // Initial load when employee or modal opens
  useEffect(() => {
    if (show && employee) {
      fetchMonthlyAttendance(selectedYear, selectedMonth, statusFilter, dateSearch);
    }
  }, [show, employee, selectedYear, selectedMonth, statusFilter]);

  const fetchMonthlyAttendance = async (year, month, status, search) => {
    if (!employee) return;
    try {
      setLoading(true);
      setError('');

      const empIdentifier = employee.employee_id || employee.id || employee.job_no;
      const params = {
        employeeId: empIdentifier,
        year: year,
        month: month,
      };
      if (status && status !== 'all') params.status = status;
      if (search) params.dateSearch = search;

      const res = await api.get('/attendance/employee-monthly', { params });
      if (res.data && res.data.success) {
        setAttendanceData(res.data);
      } else {
        setError(res.data.message || 'Failed to fetch monthly attendance');
      }
    } catch (err) {
      console.error('Fetch monthly error:', err);
      setError(err.response?.data?.message || 'Error loading monthly attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(12);
      return;
    }
    if (selectedMonth === 1) {
      setSelectedYear(prev => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(1);
      return;
    }
    if (selectedMonth === 12) {
      setSelectedYear(prev => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Export Monthly Table to CSV
  const handleExportCSV = () => {
    if (!attendanceData || !attendanceData.days || attendanceData.days.length === 0) return;
    const empName = attendanceData.employee?.name || employee?.name || 'Employee';
    const monthLabel = selectedMonth === 'all' ? 'All_Months' : MONTH_NAMES[selectedMonth - 1];

    const headers = [
      'Date', 'Day', 'Status', 'Check-In', 'Late Comment',
      'Check-Out', 'Early Departure Comment', 'Working Hours', 'Remarks'
    ];
    const rows = attendanceData.days.map(d => [
      `"${d.date}"`,
      `"${d.dayOfWeek} (${d.fullDay})"`,
      `"${d.status}"`,
      `"${d.check_in_formatted || '--:--'}"`,
      `"${d.late_comment || ''}"`,
      `"${d.check_out_formatted || '--:--'}"`,
      `"${d.early_leave_comment || ''}"`,
      `"${d.working_hours || 0}"`,
      `"${d.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${empName.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const summary = attendanceData?.summary || {
    totalDays: 0,
    workingDays: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    onTimeCount: 0,
    totalWorkingHours: 0,
    avgWorkingHours: 0
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton className="border-bottom bg-light py-3">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <FaCalendarAlt className="text-primary" />
          <span>Monthly Attendance Detailed Records</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4">
        {/* Employee Header Banner */}
        <div className="bg-white border rounded-3 p-3 mb-4 shadow-sm">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="employee-avatar shadow-sm"
                style={{ width: '48px', height: '48px', fontSize: '18px' }}
              >
                {getInitials(attendanceData?.employee?.name || employee?.name)}
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-dark">
                  {attendanceData?.employee?.name || employee?.name || 'Employee'}
                </h4>
                <div className="text-muted small d-flex flex-wrap align-items-center gap-2 mt-1">
                  <span>Job No: <strong className="text-dark font-monospace">{attendanceData?.employee?.employee_id || employee?.job_no || '--'}</strong></span>
                  <span>•</span>
                  <span>{attendanceData?.employee?.department || employee?.department || 'Department'}</span>
                  <span>•</span>
                  <span>{attendanceData?.employee?.position || employee?.position || 'Staff'}</span>
                  <span>•</span>
                  <span>{attendanceData?.employee?.email || employee?.email || ''}</span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="office-timing-badge shadow-sm">
                <FaBusinessTime />
                <span>Office: 09:30 AM – 06:30 PM</span>
              </span>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="d-flex align-items-center gap-2 bg-white"
                onClick={handleExportCSV}
                disabled={!attendanceData?.days || attendanceData.days.length === 0}
              >
                <FaFileDownload />
                <span>Export Month</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar: Year, Month, Status, Search */}
        <div className="bg-white border rounded-3 p-3 mb-4 shadow-sm">
          <Row className="g-2 align-items-center">
            {/* Year Selector */}
            <Col xs={6} sm={4} md={2}>
              <Form.Label className="small text-muted fw-bold mb-1">Year</Form.Label>
              <Form.Select 
                size="sm" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
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
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="px-2"
                >
                  <FaChevronLeft size={10} />
                </Button>
                <Form.Select 
                  size="sm" 
                  value={selectedMonth} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMonth(val === 'all' ? 'all' : parseInt(val, 10));
                  }}
                  className="fw-semibold"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName} {selectedYear}
                    </option>
                  ))}
                  <option value="all">Full Year ({selectedYear})</option>
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

            {/* Status Filter */}
            <Col xs={12} sm={6} md={3}>
              <Form.Label className="small text-muted fw-bold mb-1">Status Filter</Form.Label>
              <Form.Select 
                size="sm" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
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

            {/* Search Date / Day */}
            <Col xs={12} sm={6} md={3}>
              <Form.Label className="small text-muted fw-bold mb-1">Find Day / Date</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <FaSearch className="text-muted" size={12} />
                </InputGroup.Text>
                <Form.Control 
                  placeholder="e.g. 15 or Mon" 
                  value={dateSearch}
                  onChange={(e) => {
                    setDateSearch(e.target.value);
                    fetchMonthlyAttendance(selectedYear, selectedMonth, statusFilter, e.target.value);
                  }}
                  className="border-start-0 ps-0"
                />
                {dateSearch && (
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      setDateSearch('');
                      fetchMonthlyAttendance(selectedYear, selectedMonth, statusFilter, '');
                    }}
                  >
                    ✕
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>
        </div>

        {/* Monthly Summary KPI Cards - All Clickable Filters */}
        <Row className="g-2 mb-4">
          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'working_days' ? 'border-primary border-2 bg-primary bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'working_days' ? 'all' : 'working_days')}
              title="Click to toggle filter: Working Days only"
            >
              <div className="text-primary small fw-bold">WORKING DAYS</div>
              <div className="fs-5 fw-bold text-primary mt-1">{summary.workingDays}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                of {summary.totalDays} days {statusFilter === 'working_days' ? '✓ Active' : ''}
              </div>
            </div>
          </Col>

          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'present' ? 'border-success border-2 bg-success bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
              title="Click to toggle filter: Present Days"
            >
              <div className="text-success small fw-bold">PRESENT</div>
              <div className="fs-5 fw-bold text-success mt-1">{summary.presentCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {statusFilter === 'present' ? '✓ Active' : (summary.workingDays > 0 ? `${Math.round((summary.presentCount / summary.workingDays) * 100)}% attendance` : '0%')}
              </div>
            </div>
          </Col>

          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'absent' ? 'border-danger border-2 bg-danger bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
              title="Click to toggle filter: Absent Days"
            >
              <div className="text-danger small fw-bold">ABSENT</div>
              <div className="fs-5 fw-bold text-danger mt-1">{summary.absentCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {statusFilter === 'absent' ? '✓ Active' : 'Unpunched days'}
              </div>
            </div>
          </Col>

          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'late' ? 'border-warning border-2 bg-warning bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
              title="Click to toggle filter: Late Arrivals (> 09:30 AM)"
            >
              <div className="text-warning small fw-bold">LATE ARRIVALS</div>
              <div className="fs-5 fw-bold text-warning mt-1">{summary.lateCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {statusFilter === 'late' ? '✓ Active' : '> 09:30 AM'}
              </div>
            </div>
          </Col>

          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'early_leave' ? 'border-info border-2 bg-info bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'early_leave' ? 'all' : 'early_leave')}
              title="Click to toggle filter: Left Early (< 06:30 PM)"
            >
              <div className="text-purple small fw-bold">LEFT EARLY</div>
              <div className="fs-5 fw-bold text-purple mt-1">{summary.earlyLeaveCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {statusFilter === 'early_leave' ? '✓ Active' : '< 06:30 PM'}
              </div>
            </div>
          </Col>

          <Col xs={6} sm={4} md={2}>
            <div 
              className={`border rounded p-2 text-center bg-white shadow-sm modal-kpi-card ${
                statusFilter === 'on_time' ? 'border-success border-2 bg-success bg-opacity-10 active-filter' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}
              title="Click to toggle filter: On Time Days"
            >
              <div className="text-success small fw-bold">ON TIME</div>
              <div className="fs-5 fw-bold text-success mt-1">{summary.onTimeCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {statusFilter === 'on_time' ? '✓ Active' : `${summary.totalWorkingHours}h total`}
              </div>
            </div>
          </Col>
        </Row>

        {/* Attendance Days Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted small">Loading monthly records...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : !attendanceData?.days || attendanceData.days.length === 0 ? (
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
                  <th>Working Hours</th>
                  <th>Remarks / Comment</th>
                  <th>Punches</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.days.map((day) => (
                  <tr key={day.date} className={day.isWeekend ? 'bg-light bg-opacity-50' : ''}>
                    {/* Date */}
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
                        <span className="badge bg-light text-muted border">
                          Upcoming
                        </span>
                      )}
                    </td>

                    {/* Check In */}
                    <td>
                      {day.is_present ? (
                        <div>
                          <span className="fw-bold font-monospace">{day.check_in_formatted}</span>
                          {day.is_late ? (
                            <div className="mt-1">
                              <span className="badge-late">
                                ⚠️ Late ({day.late_minutes}m)
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="badge-ontime">
                                ✓ On Time
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted small">--:--</span>
                      )}
                    </td>

                    {/* Check Out */}
                    <td>
                      {day.is_present ? (
                        day.check_out ? (
                          <div>
                            <span className="fw-bold font-monospace">{day.check_out_formatted}</span>
                            {day.is_early_leave ? (
                              <div className="mt-1">
                                <span className="badge-early-leave">
                                  ⏱ Left early ({day.early_leave_minutes}m)
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="badge-ontime">
                                  ✓ Full Day
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted small">--:--</span>
                            <div className="mt-1">
                              <Badge bg="secondary" className="small">Missed Check-out</Badge>
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-muted small">--:--</span>
                      )}
                    </td>

                    {/* Working Hours */}
                    <td>
                      {day.is_present && day.working_hours > 0 ? (
                        <div>
                          <span className="hours-pill">
                            <FaClock size={10} className="text-primary" />
                            <span>{day.working_hours_formatted}</span>
                          </span>
                          <div className="mt-1" style={{ maxWidth: '90px' }}>
                            <ProgressBar 
                              now={Math.min(100, (day.working_hours / 9) * 100)} 
                              variant={day.working_hours >= 8 ? 'success' : day.working_hours >= 4 ? 'warning' : 'danger'}
                              style={{ height: '3px' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted small">0 hrs</span>
                      )}
                    </td>

                    {/* Remarks / Comments */}
                    <td>
                      <small className="text-muted">{day.remarks}</small>
                    </td>

                    {/* Punches Button */}
                    <td>
                      {day.raw_punches && day.raw_punches.length > 0 ? (
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="py-0 px-2"
                          style={{ fontSize: '11px' }}
                          onClick={() => {
                            if (onViewPunches) {
                              onViewPunches({
                                ...day,
                                name: attendanceData?.employee?.name || employee?.name,
                                job_no: attendanceData?.employee?.employee_id || employee?.job_no,
                                department: attendanceData?.employee?.department || employee?.department
                              });
                            }
                          }}
                        >
                          <FaEye size={10} className="me-1" />
                          <span>{day.raw_punches.length}</span>
                        </Button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top py-2">
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmployeeMonthlyModal;
