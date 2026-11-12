import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Badge,
  Spinner, Alert, Modal, ButtonGroup
} from 'react-bootstrap';
import {
  FaCamera, FaCheckCircle, FaTimesCircle, FaTrash,
  FaClock, FaFilter, FaSearchPlus, FaSyncAlt, FaCalendarDay,
  FaCalendarAlt, FaUsers, FaCheckDouble, FaDownload
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getISTNowParts } from '../../services/screenshotCapture';
import { checkDesktopAgentStatus, startDesktopAgent, DESKTOP_AGENT_DOWNLOAD_URL } from '../../services/desktopAgent';
import { isMobileDevice } from '../../utils/deviceDetector';

const API_ORIGIN = (process.env.REACT_APP_API_URL || 'https://lms.parakshtech.com/api').replace(/\/api\/?$/, '');

const getScreenshotSrc = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
  const clean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  // Prefer /api/uploads/ so Express serves it directly with CORS headers even in cross-origin/dev setups
  const apiUploadPath = clean.startsWith('/uploads/') ? clean.replace('/uploads/', '/api/uploads/') : clean;
  return `${API_ORIGIN}${apiUploadPath}`;
};

const handleScreenshotImgError = (e) => {
  const img = e?.target;
  if (!img || !img.src) return;
  const currentSrc = img.src;
  if (!img.dataset.triedDirect && currentSrc.includes('/api/uploads/')) {
    img.dataset.triedDirect = 'true';
    img.src = currentSrc.replace('/api/uploads/', '/uploads/');
  } else if (!img.dataset.triedApi && currentSrc.includes('/uploads/') && !currentSrc.includes('/api/uploads/')) {
    img.dataset.triedApi = 'true';
    img.src = currentSrc.replace('/uploads/', '/api/uploads/');
  }
};

const ScreenshotPanel = () => {
  const { user } = useAuth();
  const isAdminOrHR = ['admin', 'hr', 'manager'].includes(String(user?.role || '').toLowerCase());
  const isMobile = isMobileDevice();

  const initialIST = getISTNowParts();
  const [filterMode, setFilterMode] = useState('day'); // 'day' | 'month' | 'all'
  const [selectedDate, setSelectedDate] = useState(initialIST.dateStr);
  const [selectedMonth, setSelectedMonth] = useState(initialIST.monthStr);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc' (Punch-In -> Punch-Out)

  const [screenshots, setScreenshots] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewNotes, setPreviewNotes] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(null);
  const [agentStatus, setAgentStatus] = useState({ installed: false, running: false, tracking: false, lastStatus: '' });
  const [checkingAgent, setCheckingAgent] = useState(false);

  const refreshAgentStatus = useCallback(async () => {
    setCheckingAgent(true);
    try {
      const st = await checkDesktopAgentStatus();
      if (st?.installed && !st.tracking && localStorage.getItem('token')) {
        await startDesktopAgent({ email: user?.email });
        const st2 = await checkDesktopAgentStatus();
        setAgentStatus(st2);
      } else {
        setAgentStatus(st);
      }
    } finally {
      setCheckingAgent(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!isMobile) {
      refreshAgentStatus();
    }
  }, [isMobile, refreshAgentStatus]);

  const [istClock, setIstClock] = useState(() => getISTNowParts());

  useEffect(() => {
    const timer = setInterval(() => {
      setIstClock(getISTNowParts());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchScreenshots = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterMode === 'day' && selectedDate) {
        params.set('date', selectedDate);
      } else if (filterMode === 'month' && selectedMonth) {
        params.set('month', selectedMonth);
      }
      if (isAdminOrHR && selectedEmployee && selectedEmployee !== 'all') {
        params.set('employeeId', selectedEmployee);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await api.get(`/screenshots?${params.toString()}`);
      const data = res.data?.data || {};
      setScreenshots(data.screenshots || []);
      setSummary(data.summary || { total: 0, pending: 0, verified: 0, rejected: 0 });
      if (Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
      setSelectedIds([]);
    } catch (err) {
      setFeedback({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to load screenshots'
      });
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedDate, selectedMonth, selectedEmployee, statusFilter, isAdminOrHR]);

  useEffect(() => {
    fetchScreenshots();
  }, [fetchScreenshots]);

  useEffect(() => {
    const onUploaded = () => {
      fetchScreenshots();
    };
    window.addEventListener('ptk_screenshot_uploaded', onUploaded);
    return () => window.removeEventListener('ptk_screenshot_uploaded', onUploaded);
  }, [fetchScreenshots]);

  const handleVerifyOne = async (id, nextStatus, notes) => {
    try {
      setActionLoading(true);
      await api.patch(`/screenshots/${id}/verify`, { status: nextStatus, notes });
      setFeedback({ type: 'success', text: `Screenshot marked as ${nextStatus}.` });
      if (previewItem?.id === id) {
        setPreviewItem((prev) => (prev ? { ...prev, status: nextStatus, notes } : null));
      }
      fetchScreenshots();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Verification failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm('Delete this screenshot permanently from the server?')) return;
    try {
      setActionLoading(true);
      await api.delete(`/screenshots/${id}`);
      setFeedback({ type: 'success', text: 'Screenshot deleted from server.' });
      if (previewItem?.id === id) setPreviewItem(null);
      fetchScreenshots();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Delete failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkVerify = async (nextStatus) => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await api.post('/screenshots/bulk-verify', {
        ids: selectedIds,
        status: nextStatus
      });
      setFeedback({ type: 'success', text: res.data?.message || 'Bulk verification completed.' });
      fetchScreenshots();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Bulk verify failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const executeBulkDelete = async () => {
    if (!confirmBulkDelete) return;
    try {
      setActionLoading(true);
      const res = await api.post('/screenshots/bulk-delete', confirmBulkDelete.payload);
      setFeedback({ type: 'success', text: res.data?.message || 'Deleted screenshots.' });
      setConfirmBulkDelete(null);
      fetchScreenshots();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Bulk delete failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === screenshots.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(screenshots.map((s) => s.id));
    }
  };

  const openPreview = (item) => {
    setPreviewItem(item);
    setPreviewNotes(item.notes || '');
  };

  const statusBadge = (st) => {
    if (st === 'verified') return <Badge bg="success">✓ Verified</Badge>;
    if (st === 'rejected') return <Badge bg="danger">✕ Rejected</Badge>;
    return <Badge bg="warning" text="dark">⏳ Pending</Badge>;
  };

  const displayedScreenshots = React.useMemo(() => {
    if (sortOrder === 'asc') {
      return [...screenshots].reverse();
    }
    return screenshots;
  }, [screenshots, sortOrder]);

  const canDeleteFiltered =
    isAdminOrHR &&
    (filterMode === 'day' || filterMode === 'month' || (selectedEmployee && selectedEmployee !== 'all')) &&
    screenshots.length > 0;

  return (
    <Container fluid className="py-3 px-md-4">
      {/* Header & Office Hours Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaCamera className="text-primary" />
            <span>Screen Monitoring & Verification</span>
          </h4>
          <p className="text-muted small mb-0">
            Captures and uploads work screenshots strictly during office hours (<strong>09:30 AM – 06:30 PM IST</strong>).
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Badge bg="dark" className="py-2 px-3 font-monospace fs-6">
            <FaClock className="me-1" /> IST: {istClock.time12}
          </Badge>
          {istClock.isOfficeHours ? (
            <Badge bg="success" className="py-2 px-3">
              🟢 Office Hours Active (9:30 AM – 6:30 PM)
            </Badge>
          ) : (
            <Badge bg="secondary" className="py-2 px-3">
              🔒 Outside Office Hours — Capture Locked
            </Badge>
          )}
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} dismissible onClose={() => setFeedback(null)} className="py-2 small">
          {feedback.text}
        </Alert>
      )}

      {/* Desktop Auto-Tracker (.exe) Setup & Live Status */}
      {!isMobile && (
        <Card className="shadow-sm border-0 mb-3 border-start border-4 border-primary">
          <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3 py-3">
            <div>
              <div className="fw-bold d-flex align-items-center gap-2 flex-wrap">
                <span>Windows Desktop Auto-Tracker (.exe)</span>
                {agentStatus.installed && agentStatus.tracking ? (
                  <Badge bg="success">Connected & Auto-Tracking (No Browser Popup)</Badge>
                ) : agentStatus.installed ? (
                  <Badge bg="info" text="dark">Installed & Ready</Badge>
                ) : (
                  <Badge bg="warning" text="dark">Not Running on This PC</Badge>
                )}
              </div>
              <div className="text-muted small mt-1">
                {agentStatus.installed && agentStatus.tracking
                  ? `Status: ${agentStatus.lastStatus || 'Active — uploading silently every 10 mins (09:30 AM – 06:30 PM IST). Stops automatically on LMS logout.'}`
                  : 'One-time setup: Download & extract ParakshTechTracker.zip, then double-click ParakshTechTracker.exe once (if SmartScreen appears, click More info -> Run anyway). It auto-starts on LMS login, captures silently every 10 mins (09:30 AM – 06:30 PM IST), and stops on logout.'}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={refreshAgentStatus}
                disabled={checkingAgent}
              >
                <FaSyncAlt className={checkingAgent ? 'fa-spin me-1' : 'me-1'} />
                {checkingAgent ? 'Checking...' : 'Check Status'}
              </Button>
              <a
                href={DESKTOP_AGENT_DOWNLOAD_URL}
                download="ParakshTechTracker.zip"
                className="btn btn-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1"
              >
                <FaDownload /> Download Tracker (.zip)
              </a>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Summary KPIs */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card
            className={`border-0 shadow-sm h-100 ${statusFilter === 'all' ? 'border border-primary border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter('all')}
          >
            <Card.Body className="py-3">
              <div className="text-muted small fw-semibold">TOTAL SCREENSHOTS</div>
              <h3 className="fw-bold mb-0 text-primary">{summary.total}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`border-0 shadow-sm h-100 ${statusFilter === 'pending' ? 'border border-warning border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <Card.Body className="py-3">
              <div className="text-muted small fw-semibold">PENDING REVIEW</div>
              <h3 className="fw-bold mb-0 text-warning">{summary.pending}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`border-0 shadow-sm h-100 ${statusFilter === 'verified' ? 'border border-success border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === 'verified' ? 'all' : 'verified')}
          >
            <Card.Body className="py-3">
              <div className="text-muted small fw-semibold">VERIFIED</div>
              <h3 className="fw-bold mb-0 text-success">{summary.verified}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card
            className={`border-0 shadow-sm h-100 ${statusFilter === 'rejected' ? 'border border-danger border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          >
            <Card.Body className="py-3">
              <div className="text-muted small fw-semibold">REJECTED</div>
              <h3 className="fw-bold mb-0 text-danger">{summary.rejected}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters Bar: Day-wise / Month-wise / User-wise */}
      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold text-muted mb-1">
                <FaFilter className="me-1" /> View Period
              </Form.Label>
              <ButtonGroup className="w-100" size="sm">
                <Button
                  variant={filterMode === 'day' ? 'primary' : 'outline-secondary'}
                  onClick={() => setFilterMode('day')}
                >
                  <FaCalendarDay className="me-1" /> Day-wise
                </Button>
                <Button
                  variant={filterMode === 'month' ? 'primary' : 'outline-secondary'}
                  onClick={() => setFilterMode('month')}
                >
                  <FaCalendarAlt className="me-1" /> Month-wise
                </Button>
                <Button
                  variant={filterMode === 'all' ? 'primary' : 'outline-secondary'}
                  onClick={() => setFilterMode('all')}
                >
                  All
                </Button>
              </ButtonGroup>
            </Col>

            {filterMode === 'day' && (
              <Col xs={12} sm={6} md={2}>
                <Form.Label className="small fw-semibold text-muted mb-1">Select Date</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Col>
            )}

            {filterMode === 'month' && (
              <Col xs={12} sm={6} md={2}>
                <Form.Label className="small fw-semibold text-muted mb-1">Select Month</Form.Label>
                <Form.Control
                  type="month"
                  size="sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </Col>
            )}

            {isAdminOrHR && (
              <Col xs={12} sm={6} md={3}>
                <Form.Label className="small fw-semibold text-muted mb-1">
                  <FaUsers className="me-1" /> Filter by User
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.job_no})
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            <Col xs={12} sm={6} md={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">Status</Form.Label>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} md={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">Sort Order</Form.Label>
              <Form.Select
                size="sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First (Latest)</option>
                <option value="asc">Punch-In → Punch-Out</option>
              </Form.Select>
            </Col>

            <Col xs={12} md={2} className="d-flex justify-content-md-end gap-2">
              <Button variant="outline-primary" size="sm" onClick={fetchScreenshots} disabled={loading}>
                <FaSyncAlt className={loading ? 'fa-spin me-1' : 'me-1'} /> Refresh
              </Button>
            </Col>
          </Row>

          {/* Admin Bulk Action Bar */}
          {isAdminOrHR && (screenshots.length > 0 || selectedIds.length > 0) && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
              <div className="d-flex align-items-center gap-2">
                <Form.Check
                  type="checkbox"
                  id="select-all-screenshots"
                  label={
                    selectedIds.length > 0
                      ? `${selectedIds.length} selected`
                      : `Select All (${screenshots.length})`
                  }
                  checked={screenshots.length > 0 && selectedIds.length === screenshots.length}
                  onChange={toggleSelectAll}
                  className="small fw-semibold"
                />
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {selectedIds.length > 0 && (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleBulkVerify('verified')}
                    >
                      <FaCheckDouble className="me-1" /> Verify Selected ({selectedIds.length})
                    </Button>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleBulkVerify('rejected')}
                    >
                      <FaTimesCircle className="me-1" /> Reject Selected
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() =>
                        setConfirmBulkDelete({
                          title: `Delete ${selectedIds.length} Selected Screenshot(s)?`,
                          payload: { ids: selectedIds }
                        })
                      }
                    >
                      <FaTrash className="me-1" /> Delete Selected
                    </Button>
                  </>
                )}

                {canDeleteFiltered && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() =>
                      setConfirmBulkDelete({
                        title: 'Delete All Filtered Screenshots?',
                        description: `This will permanently delete all ${screenshots.length} matching screenshot(s) for the active ${
                          filterMode === 'day'
                            ? `date (${selectedDate})`
                            : filterMode === 'month'
                            ? `month (${selectedMonth})`
                            : 'filter'
                        }${selectedEmployee !== 'all' ? ' and selected user' : ''}.`,
                        payload: {
                          date: filterMode === 'day' ? selectedDate : undefined,
                          month: filterMode === 'month' ? selectedMonth : undefined,
                          employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined,
                          status: statusFilter !== 'all' ? statusFilter : undefined
                        }
                      })
                    }
                  >
                    <FaTrash className="me-1" /> Delete Filtered ({screenshots.length})
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Screenshots Gallery */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="text-muted small mt-2">Loading screenshots...</div>
        </div>
      ) : screenshots.length === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <FaCamera size={38} className="text-muted mb-2 opacity-50" />
            <h6 className="fw-bold text-muted">No Screenshots Found</h6>
            <p className="text-muted small mb-0">
              Try changing the Day / Month / User filter or capture during office hours (09:30 AM – 06:30 PM IST).
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {displayedScreenshots.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Col key={item.id} xs={12} sm={6} lg={4} xl={3}>
                <Card
                  className={`h-100 shadow-sm border ${
                    isSelected ? 'border-primary border-2' : 'border-light-subtle'
                  }`}
                >
                  <div className="position-relative bg-dark" style={{ height: '170px', overflow: 'hidden' }}>
                    <img
                      src={getScreenshotSrc(item.image_path)}
                      alt={`Screenshot ${item.employee_name || ''} ${item.capture_time_formatted}`}
                      className="w-100 h-100"
                      style={{ objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => openPreview(item)}
                      onError={handleScreenshotImgError}
                    />

                    {isAdminOrHR && (
                      <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectId(item.id)}
                        className="position-absolute top-0 start-0 m-2 bg-white rounded px-1 shadow-sm"
                        aria-label={`Select screenshot ${item.id}`}
                      />
                    )}

                    <div className="position-absolute top-0 end-0 m-2">{statusBadge(item.status)}</div>

                    <Button
                      variant="dark"
                      size="sm"
                      className="position-absolute bottom-0 end-0 m-2 opacity-75"
                      onClick={() => openPreview(item)}
                      title="View Full Size"
                    >
                      <FaSearchPlus size={12} />
                    </Button>
                  </div>

                  <Card.Body className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start gap-1">
                        <div className="fw-bold text-dark text-truncate" title={item.employee_name}>
                          {item.employee_name || 'Employee'}
                        </div>
                        {item.job_no && (
                          <span className="badge bg-light text-primary border font-monospace">
                            {item.job_no}
                          </span>
                        )}
                      </div>
                      <div className="text-muted small mt-1 d-flex justify-content-between">
                        <span>{item.date}{item.file_size_kb ? ` • ${item.file_size_kb} KB` : ''}</span>
                        <span className="font-monospace fw-semibold">{item.capture_time_formatted}</span>
                      </div>
                      {item.verified_by_name && (
                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                          Reviewed by <strong>{item.verified_by_name}</strong>
                        </div>
                      )}
                    </div>

                    {isAdminOrHR && (
                      <div className="d-flex gap-1 mt-3 pt-2 border-top">
                        <Button
                          variant={item.status === 'verified' ? 'success' : 'outline-success'}
                          size="sm"
                          className="flex-grow-1"
                          disabled={actionLoading}
                          onClick={() => handleVerifyOne(item.id, 'verified', item.notes)}
                        >
                          <FaCheckCircle className="me-1" /> Verify
                        </Button>
                        <Button
                          variant={item.status === 'rejected' ? 'warning' : 'outline-warning'}
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleVerifyOne(item.id, 'rejected', item.notes)}
                          title="Reject"
                        >
                          <FaTimesCircle />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleDeleteOne(item.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Full-Resolution Preview & Admin Verification Modal */}
      <Modal show={!!previewItem} onHide={() => setPreviewItem(null)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 d-flex align-items-center gap-2">
            <span>{previewItem?.employee_name}</span>
            {previewItem?.job_no && <Badge bg="secondary">{previewItem.job_no}</Badge>}
            <span className="text-muted fw-normal">
              • {previewItem?.date} at {previewItem?.capture_time_formatted} IST
            </span>
            {previewItem && statusBadge(previewItem.status)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-center p-2">
          {previewItem && (
            <img
              src={getScreenshotSrc(previewItem.image_path)}
              alt="Screenshot preview"
              style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }}
              onError={handleScreenshotImgError}
            />
          )}
        </Modal.Body>
        {isAdminOrHR && previewItem && (
          <Modal.Footer className="d-flex flex-wrap justify-content-between gap-2">
            <Form.Control
              size="sm"
              type="text"
              placeholder="Optional verification note..."
              value={previewNotes}
              onChange={(e) => setPreviewNotes(e.target.value)}
              style={{ maxWidth: '380px' }}
            />
            <div className="d-flex gap-2">
              <Button
                variant="success"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleVerifyOne(previewItem.id, 'verified', previewNotes)}
              >
                <FaCheckCircle className="me-1" /> Verify
              </Button>
              <Button
                variant="warning"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleVerifyOne(previewItem.id, 'rejected', previewNotes)}
              >
                <FaTimesCircle className="me-1" /> Reject
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleDeleteOne(previewItem.id)}
              >
                <FaTrash className="me-1" /> Delete
              </Button>
            </div>
          </Modal.Footer>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal show={!!confirmBulkDelete} onHide={() => setConfirmBulkDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 text-danger">{confirmBulkDelete?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          {confirmBulkDelete?.description ||
            'Are you sure you want to permanently delete the selected screenshot(s) from the server?'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setConfirmBulkDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" disabled={actionLoading} onClick={executeBulkDelete}>
            {actionLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ScreenshotPanel;

