import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { 
  FaUserClock, FaCalendarAlt, FaClock, FaCheckCircle, 
  FaTimesCircle, FaExclamationTriangle, FaTrash, FaSave, 
  FaUser, FaStickyNote, FaPauseCircle
} from 'react-icons/fa';
import api from '../../services/api';

const QUICK_REASONS = [
  'Biometric device offline / sensor malfunction',
  'Client site visit / Official outdoor duty',
  'Forgot to punch attendance',
  'Approved Work from Home',
  'System / network connectivity downtime',
  'Regularized by Management'
];

const ManualAttendanceModal = ({ 
  show, 
  onHide, 
  initialRecord = null, 
  defaultDate = '', 
  onSuccess 
}) => {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [date, setDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('present');
  const [systemOffMinutes, setSystemOffMinutes] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all employees for dropdown selector
  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        // Try dropdown endpoint first, fallback to /employees
        const res = await api.get('/employees/dropdown').catch(() => api.get('/employees'));
        if (isMounted && res.data && res.data.success) {
          const list = res.data.data || [];
          setEmployees(list);
        }
      } catch (err) {
        console.error('Failed to load employee list:', err);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    };

    if (show) {
      fetchEmployees();
    }
    return () => { isMounted = false; };
  }, [show]);

  // Helper to extract HH:mm from various time formats
  const extractTimeHM = (t) => {
    if (!t || t === '--:--' || t === 'null') return '';
    const parts = String(t).trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return '';
  };

  // Initialize or reset form when modal opens or initialRecord changes
  useEffect(() => {
    if (show) {
      setError('');
      setSuccessMsg('');

      const todayStr = new Date().toISOString().slice(0, 10);
      const targetDate = initialRecord?.date || defaultDate || todayStr;
      setDate(targetDate);

      // Selected employee ID
      const empId = initialRecord?.employee_id || initialRecord?.id;
      // If it's an absent placeholder like 'absent_12', parse number
      if (typeof empId === 'string' && empId.startsWith('absent_')) {
        setSelectedEmpId(empId.replace('absent_', ''));
      } else if (empId) {
        setSelectedEmpId(String(empId));
      } else {
        setSelectedEmpId('');
      }

      setCheckIn(extractTimeHM(initialRecord?.check_in));
      setCheckOut(extractTimeHM(initialRecord?.check_out));
      setStatus(initialRecord?.status || (initialRecord?.is_absent ? 'absent' : 'present'));
      setSystemOffMinutes(initialRecord?.system_off_minutes || 0);
      setRemarks(initialRecord?.remarks || '');
    }
  }, [show, initialRecord, defaultDate]);

  // Selected employee object
  const selectedEmployee = useMemo(() => {
    if (!selectedEmpId || employees.length === 0) return null;
    return employees.find(e => String(e.id) === String(selectedEmpId) || String(e.employee_id) === String(selectedEmpId));
  }, [selectedEmpId, employees]);

  // Live Calculations Preview
  const previewCalculation = useMemo(() => {
    if (!checkIn) {
      return {
        hasPunches: false,
        workingHours: 0,
        netHours: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        lateText: 'No check-in (Absent)',
        earlyText: 'No check-out',
        suggestedStatus: 'absent'
      };
    }

    const parseToMin = (timeStr) => {
      if (!timeStr) return null;
      const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
      return h * 60 + m;
    };

    const inMin = parseToMin(checkIn);
    const officeStartMin = 9 * 60 + 30; // 09:30 = 570
    const officeEndMin = 18 * 60 + 30;  // 18:30 = 1110

    let lateMinutes = 0;
    let lateText = 'On Time (09:30 AM)';
    if (inMin > officeStartMin) {
      lateMinutes = inMin - officeStartMin;
      const hrs = Math.floor(lateMinutes / 60);
      const mins = lateMinutes % 60;
      lateText = `Late by ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
    }

    let outMin = parseToMin(checkOut);
    let earlyLeaveMinutes = 0;
    let earlyText = 'Not checked out yet';
    let workingHours = 0;

    if (outMin !== null) {
      if (outMin < officeEndMin) {
        earlyLeaveMinutes = officeEndMin - outMin;
        const hrs = Math.floor(earlyLeaveMinutes / 60);
        const mins = earlyLeaveMinutes % 60;
        earlyText = `Left early by ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
      } else {
        earlyText = 'Completed full day (06:30+ PM)';
      }

      if (outMin >= inMin) {
        workingHours = parseFloat(((outMin - inMin) / 60).toFixed(2));
      }
    }

    const offMin = parseInt(systemOffMinutes, 10) || 0;
    const netHours = parseFloat(Math.max(0, workingHours - (offMin / 60)).toFixed(2));

    let suggestedStatus = 'present';
    if (!checkOut && !checkIn) suggestedStatus = 'absent';
    else if (workingHours > 0 && workingHours < 4.5) suggestedStatus = 'half-day';
    else if (lateMinutes > 0) suggestedStatus = 'late';

    return {
      hasPunches: true,
      workingHours,
      netHours,
      lateMinutes,
      earlyLeaveMinutes,
      lateText,
      earlyText,
      suggestedStatus
    };
  }, [checkIn, checkOut, systemOffMinutes]);

  // Quick Action Handlers
  const handleSetFullDay = () => {
    setCheckIn('09:30');
    setCheckOut('18:30');
    setStatus('present');
    setSystemOffMinutes(0);
    setError('');
  };

  const handleSetHalfDay = () => {
    setCheckIn('09:30');
    setCheckOut('13:30');
    setStatus('half-day');
    setError('');
  };

  const handleSetAbsent = () => {
    setCheckIn('');
    setCheckOut('');
    setStatus('absent');
    setSystemOffMinutes(0);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedEmpId) {
      setError('Please select an employee.');
      return;
    }

    if (!date) {
      setError('Please select an attendance date.');
      return;
    }

    if (checkIn && checkOut && checkOut < checkIn) {
      setError('Check-out time cannot be earlier than check-in time.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        employee_id: selectedEmpId,
        date,
        check_in: checkIn ? `${checkIn}:00` : null,
        check_out: checkOut ? `${checkOut}:00` : null,
        status,
        system_off_minutes: parseInt(systemOffMinutes, 10) || 0,
        remarks: remarks.trim()
      };

      const res = await api.post('/attendance/manual-entry', payload);
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Attendance saved successfully!');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(res.data.data, date);
            onHide();
          }, 700);
        }
      } else {
        setError(res.data?.message || 'Failed to save attendance record.');
      }
    } catch (err) {
      console.error('Save manual attendance error:', err);
      setError(err.response?.data?.message || 'Error occurred while saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Delete attendance record
  const handleDelete = async () => {
    const recId = initialRecord?.id;
    if (!recId || String(recId).startsWith('absent_')) {
      // Just mark as absent in form
      handleSetAbsent();
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the attendance record for ${initialRecord.name || 'this employee'} on ${date}?`)) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      const res = await api.delete(`/attendance/manual/${recId}`);
      if (res.data && res.data.success) {
        setSuccessMsg('Attendance record deleted successfully.');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(null, date);
            onHide();
          }, 700);
        }
      } else {
        setError(res.data?.message || 'Failed to delete attendance record.');
      }
    } catch (err) {
      console.error('Delete attendance error:', err);
      setError(err.response?.data?.message || 'Error occurred while deleting attendance record.');
    } finally {
      setDeleting(false);
    }
  };

  const isExistingDbRecord = initialRecord?.id && !String(initialRecord.id).startsWith('absent_');

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-light py-3 border-bottom">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-dark">
          <FaUserClock className="text-primary" />
          <span>{isExistingDbRecord ? 'Edit Employee Attendance' : 'Manual Attendance Entry'}</span>
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {error && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}
          {successMsg && <Alert variant="success" className="py-2 px-3 small">{successMsg}</Alert>}

          {/* Quick Presets Bar */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-2 mb-3 bg-light rounded border">
            <span className="small text-muted fw-semibold">Quick Presets:</span>
            <div className="d-flex flex-wrap gap-1">
              <Button 
                variant="outline-success" 
                size="sm" 
                className="py-1 px-2" 
                style={{ fontSize: '11px' }}
                onClick={handleSetFullDay}
              >
                ✓ Standard Full Day (09:30 - 06:30)
              </Button>
              <Button 
                variant="outline-warning" 
                size="sm" 
                className="py-1 px-2" 
                style={{ fontSize: '11px' }}
                onClick={handleSetHalfDay}
              >
                ⏱ Half Day (09:30 - 01:30)
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm" 
                className="py-1 px-2" 
                style={{ fontSize: '11px' }}
                onClick={handleSetAbsent}
              >
                ✕ Mark Absent
              </Button>
            </div>
          </div>

          <Row className="g-3 mb-3">
            {/* Employee Selector */}
            <Col xs={12} md={7}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center gap-1">
                  <FaUser className="text-primary" size={12} />
                  <span>Select Employee <span className="text-danger">*</span></span>
                </Form.Label>
                {loadingEmployees ? (
                  <div className="d-flex align-items-center gap-2 text-muted small py-1">
                    <Spinner size="sm" animation="border" />
                    <span>Loading employee directory...</span>
                  </div>
                ) : (
                  <Form.Select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    required
                    className="border"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => {
                      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.email;
                      const job = emp.employee_id || emp.job_no || 'No ID';
                      const dept = emp.department ? ` (${emp.department})` : '';
                      return (
                        <option key={emp.id} value={emp.id}>
                          [{job}] {empName}{dept}
                        </option>
                      );
                    })}
                  </Form.Select>
                )}
                {selectedEmployee && (
                  <div className="text-muted small mt-1" style={{ fontSize: '11px' }}>
                    Job No: <strong className="font-monospace text-primary">{selectedEmployee.employee_id || selectedEmployee.job_no || '--'}</strong> • {selectedEmployee.department || 'General'} • {selectedEmployee.position || 'Staff'}
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Date Selector */}
            <Col xs={12} md={5}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center gap-1">
                  <FaCalendarAlt className="text-primary" size={12} />
                  <span>Attendance Date <span className="text-danger">*</span></span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="border"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            {/* Check-In Time */}
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center justify-content-between">
                  <span>Punch-In Time (09:30 AM)</span>
                  {checkIn && (
                    <button 
                      type="button" 
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                      style={{ fontSize: '11px' }}
                      onClick={() => setCheckIn('')}
                    >
                      Clear
                    </button>
                  )}
                </Form.Label>
                <Form.Control
                  type="time"
                  step="60"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="font-monospace"
                />
                <div className="d-flex gap-1 mt-1">
                  <Button 
                    variant="light" 
                    size="sm" 
                    className="py-0 px-1 border" 
                    style={{ fontSize: '10px' }}
                    onClick={() => setCheckIn('09:30')}
                  >
                    09:30 (On Time)
                  </Button>
                  <Button 
                    variant="light" 
                    size="sm" 
                    className="py-0 px-1 border" 
                    style={{ fontSize: '10px' }}
                    onClick={() => setCheckIn('10:00')}
                  >
                    10:00 (Late)
                  </Button>
                </div>
              </Form.Group>
            </Col>

            {/* Check-Out Time */}
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center justify-content-between">
                  <span>Punch-Out Time (06:30 PM)</span>
                  {checkOut && (
                    <button 
                      type="button" 
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                      style={{ fontSize: '11px' }}
                      onClick={() => setCheckOut('')}
                    >
                      Clear
                    </button>
                  )}
                </Form.Label>
                <Form.Control
                  type="time"
                  step="60"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="font-monospace"
                />
                <div className="d-flex gap-1 mt-1">
                  <Button 
                    variant="light" 
                    size="sm" 
                    className="py-0 px-1 border" 
                    style={{ fontSize: '10px' }}
                    onClick={() => setCheckOut('18:30')}
                  >
                    18:30 (Full Day)
                  </Button>
                  <Button 
                    variant="light" 
                    size="sm" 
                    className="py-0 px-1 border" 
                    style={{ fontSize: '10px' }}
                    onClick={() => setCheckOut('17:30')}
                  >
                    17:30 (Early)
                  </Button>
                </div>
              </Form.Group>
            </Col>

            {/* Status Selector */}
            <Col xs={12} sm={12} md={4}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark">
                  Attendance Status
                </Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="late">Late Arrival</option>
                  <option value="half-day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="holiday">Holiday / Weekly Off</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            {/* System Off Time */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center gap-1">
                  <FaPauseCircle className="text-danger" size={12} />
                  <span>System Off / Idle Time (Minutes)</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="600"
                  value={systemOffMinutes}
                  onChange={(e) => setSystemOffMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="font-monospace"
                />
                <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                  Minutes inactive beyond 30-min threshold (deducted from gross working hours).
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Remarks / Reason */}
            <Col xs={12} sm={6}>
              <Form.Group>
                <Form.Label className="small fw-bold text-dark d-flex align-items-center gap-1">
                  <FaStickyNote className="text-secondary" size={12} />
                  <span>Remarks / Reason for Manual Entry</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Biometric device issue, Official outdoor duty"
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Quick Reason Chips */}
          <div className="mb-3">
            <span className="text-muted small me-2" style={{ fontSize: '11px' }}>Reason presets:</span>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {QUICK_REASONS.map((r) => (
                <Badge
                  key={r}
                  bg="light"
                  text="dark"
                  className="border py-1 px-2"
                  style={{ cursor: 'pointer', fontSize: '10px' }}
                  onClick={() => setRemarks(r)}
                  title="Click to use this reason"
                >
                  + {r}
                </Badge>
              ))}
            </div>
          </div>

          {/* Live Calculation Preview Card */}
          <div className="bg-light p-3 rounded-3 border">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-bold small text-dark d-flex align-items-center gap-1">
                <FaClock className="text-primary" />
                <span>Calculated Summary Preview:</span>
              </span>
              <Badge bg={previewCalculation.hasPunches ? 'success' : 'secondary'}>
                {status.toUpperCase()}
              </Badge>
            </div>

            <Row className="g-2 text-center" style={{ fontSize: '12px' }}>
              <Col xs={6} sm={3}>
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted" style={{ fontSize: '10px' }}>ARRIVAL</div>
                  <strong className={previewCalculation.lateMinutes > 0 ? 'text-warning' : 'text-success'}>
                    {previewCalculation.lateText}
                  </strong>
                </div>
              </Col>
              <Col xs={6} sm={3}>
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted" style={{ fontSize: '10px' }}>DEPARTURE</div>
                  <strong className={previewCalculation.earlyLeaveMinutes > 0 ? 'text-purple' : 'text-dark'}>
                    {previewCalculation.earlyText}
                  </strong>
                </div>
              </Col>
              <Col xs={6} sm={3}>
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted" style={{ fontSize: '10px' }}>GROSS HOURS</div>
                  <strong className="text-primary font-monospace">
                    {previewCalculation.workingHours} hrs
                  </strong>
                </div>
              </Col>
              <Col xs={6} sm={3}>
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted" style={{ fontSize: '10px' }}>NET WORKING HOURS</div>
                  <strong className="text-success font-monospace">
                    {previewCalculation.netHours} hrs
                  </strong>
                </div>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-light py-2 border-top d-flex justify-content-between">
          <div>
            {isExistingDbRecord && (
              <Button
                variant="outline-danger"
                size="sm"
                className="d-flex align-items-center gap-1"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? <Spinner size="sm" animation="border" /> : <FaTrash size={12} />}
                <span>Delete Record</span>
              </Button>
            )}
          </div>

          <div className="d-flex gap-2">
            <Button variant="secondary" size="sm" onClick={onHide} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              className="d-flex align-items-center gap-2 shadow-sm"
              disabled={saving || deleting || !selectedEmpId}
            >
              {saving ? <Spinner size="sm" animation="border" /> : <FaSave />}
              <span>{isExistingDbRecord ? 'Update Attendance' : 'Save Attendance'}</span>
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ManualAttendanceModal;

