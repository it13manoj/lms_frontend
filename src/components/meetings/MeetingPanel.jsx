import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Card, Row, Col, Button, Badge, Table, Form, 
  Modal, InputGroup, Spinner, Alert, Dropdown 
} from 'react-bootstrap';
import { 
  FaVideo, FaCalendarPlus, FaSignInAlt, FaDesktop, 
  FaComments, FaPaperclip, FaUsers, FaClock, 
  FaCopy, FaCheck, FaTrash, FaPlay, FaCalendarAlt, 
  FaSearch, FaFilter, FaBuilding, FaLock, FaGlobe
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MeetingRoom from './MeetingRoom';
import './MeetingPanel.css';

const MeetingPanel = () => {
  const { meetingId: urlMeetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  // Live in-room state
  const [activeMeetingInRoom, setActiveMeetingInRoom] = useState(null);

  // Meetings List State
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Schedule Form State
  const [scheduleData, setScheduleData] = useState({
    title: '',
    description: '',
    meeting_type: 'group',
    scheduled_date: new Date().toISOString().slice(0, 10),
    start_time: '10:00',
    duration_minutes: 45,
    department: 'All',
    passcode: '',
    custom_meeting_id: '',
    allowScreenShare: true,
    allowChat: true,
    allowDocumentShare: true
  });
  const [scheduling, setScheduling] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch Meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/meetings', { params });
      if (res.data && res.data.success) {
        setMeetings(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError(err.response?.data?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter, searchQuery]);

  // Handle URL deep link into a meeting room: e.g. /meetings/ptk-123-456
  useEffect(() => {
    if (urlMeetingId) {
      setActiveMeetingInRoom({ meeting_id: urlMeetingId, title: `Meeting ${urlMeetingId}` });
    }
  }, [urlMeetingId]);

  // Quick Instant Meeting (Start right now)
  const handleStartInstantMeeting = async () => {
    try {
      setScheduling(true);
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const myName = user?.employee?.first_name 
        ? `${user.employee.first_name} ${user.employee.last_name || ''}` 
        : (user?.email || 'Host');

      const payload = {
        title: `Instant Group Call by ${myName}`,
        description: 'Quick collaborative group conference session',
        meeting_type: 'group',
        scheduled_date: todayDate,
        start_time: timeStr,
        duration_minutes: 60,
        department: 'All'
      };

      const res = await api.post('/meetings', payload);
      if (res.data && res.data.success) {
        setActiveMeetingInRoom(res.data.data);
      }
    } catch (err) {
      alert('Failed to start instant meeting: ' + (err.response?.data?.message || err.message));
    } finally {
      setScheduling(false);
    }
  };

  // Schedule New Meeting Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleData.title || !scheduleData.scheduled_date || !scheduleData.start_time) {
      alert('Please fill in title, date, and start time');
      return;
    }

    try {
      setScheduling(true);
      const payload = {
        ...scheduleData,
        settings: {
          allowScreenShare: scheduleData.allowScreenShare,
          allowChat: scheduleData.allowChat,
          allowDocumentShare: scheduleData.allowDocumentShare
        }
      };

      const res = await api.post('/meetings', payload);
      if (res.data && res.data.success) {
        setShowScheduleModal(false);
        setActionSuccess(`Meeting "${scheduleData.title}" scheduled successfully! Share Code: ${res.data.data?.meeting_id}`);
        fetchMeetings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setScheduling(false);
    }
  };

  // Join by Meeting Code
  const handleJoinWithCode = (e) => {
    e?.preventDefault();
    setJoinError('');
    const code = joinCodeInput.trim().toLowerCase().replace(/\s+/g, '');
    if (!code) {
      setJoinError('Please enter a valid meeting code or room link');
      return;
    }

    setShowJoinModal(false);
    setActiveMeetingInRoom({ meeting_id: code, title: `Meeting Room (${code})` });
  };

  // Join Existing Meeting
  const handleJoinMeeting = (meeting) => {
    setActiveMeetingInRoom(meeting);
  };

  // Copy Meeting Invite Link
  const handleCopyLink = (mId) => {
    const link = `${window.location.origin}/meetings/${mId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(mId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Cancel Meeting
  const handleDeleteMeeting = async (id) => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
      try {
        await api.delete(`/meetings/${id}`);
        setActionSuccess('Meeting cancelled successfully');
        fetchMeetings();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to cancel meeting');
      }
    }
  };

  // If currently inside an active meeting room, render MeetingRoom
  if (activeMeetingInRoom) {
    return (
      <MeetingRoom 
        meetingData={activeMeetingInRoom} 
        onLeave={() => {
          setActiveMeetingInRoom(null);
          navigate('/meetings');
          fetchMeetings();
        }} 
      />
    );
  }

  const upcomingList = meetings.filter(m => m.status === 'scheduled' || m.status === 'in-progress');
  const historyList = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');
  const displayedMeetings = activeTab === 'upcoming' ? upcomingList : historyList;

  return (
    <div className="meeting-hub-container container-fluid px-3 px-md-4 py-4">
      {/* Top Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 bg-white p-4 rounded-3 shadow-sm border mb-4">
        <div>
          <h2 className="fs-3 fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <FaVideo className="text-primary" />
            <span>Group Meetings & Collaboration Panel</span>
          </h2>
          <div className="text-muted small">
            High-definition video conferences with real-time screen sharing, in-meeting group chat, and document sharing.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Instant Meeting Button */}
          <Button 
            variant="primary" 
            onClick={handleStartInstantMeeting}
            disabled={scheduling}
            className="d-flex align-items-center gap-2 shadow-sm fw-semibold"
          >
            {scheduling ? <Spinner size="sm" /> : <FaPlay size={12} />}
            <span>Start Instant Meeting</span>
          </Button>

          {/* Schedule Meeting Button */}
          <Button 
            variant="outline-primary" 
            onClick={() => setShowScheduleModal(true)}
            className="d-flex align-items-center gap-2 shadow-sm fw-semibold"
          >
            <FaCalendarPlus />
            <span>Schedule Meeting</span>
          </Button>

          {/* Join with Code Button */}
          <Button 
            variant="outline-dark" 
            onClick={() => setShowJoinModal(true)}
            className="d-flex align-items-center gap-2 shadow-sm"
          >
            <FaSignInAlt />
            <span>Join with Code</span>
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <Alert variant="success" className="d-flex justify-content-between align-items-center shadow-sm" dismissible onClose={() => setActionSuccess('')}>
          <div><strong>Success:</strong> {actionSuccess}</div>
        </Alert>
      )}

      {/* KPI Stats Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="meeting-stat-card shadow-sm border-0 bg-white">
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-3 fs-4">
                <FaVideo />
              </div>
              <div>
                <div className="text-muted small">Total Meetings</div>
                <h4 className="fw-bold mb-0 text-dark">{stats.total}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="meeting-stat-card shadow-sm border-0 bg-white">
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-3 bg-info bg-opacity-10 text-info rounded-3 fs-4">
                <FaCalendarAlt />
              </div>
              <div>
                <div className="text-muted small">Upcoming Scheduled</div>
                <h4 className="fw-bold mb-0 text-dark">{stats.scheduled}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="meeting-stat-card shadow-sm border-0 bg-white">
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-3 bg-success bg-opacity-10 text-success rounded-3 fs-4">
                <FaUsers />
              </div>
              <div>
                <div className="text-muted small">Active Now</div>
                <h4 className="fw-bold mb-0 text-dark">{stats.inProgress}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="meeting-stat-card shadow-sm border-0 bg-white">
            <Card.Body className="d-flex align-items-center gap-3 p-3">
              <div className="p-3 bg-secondary bg-opacity-10 text-secondary rounded-3 fs-4">
                <FaClock />
              </div>
              <div>
                <div className="text-muted small">Completed Sessions</div>
                <h4 className="fw-bold mb-0 text-dark">{stats.completed}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Feature Highlights Banner */}
      <div className="bg-light p-3 rounded-3 mb-4 border d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-4 text-muted small">
          <span className="d-flex align-items-center gap-2 text-dark fw-semibold">
            <FaDesktop className="text-primary" /> Screen Sharing Supported
          </span>
          <span className="d-flex align-items-center gap-2 text-dark fw-semibold">
            <FaComments className="text-success" /> Real-time Group Chat
          </span>
          <span className="d-flex align-items-center gap-2 text-dark fw-semibold">
            <FaPaperclip className="text-warning" /> In-Meeting Document Sharing
          </span>
          <span className="d-flex align-items-center gap-2 text-dark fw-semibold">
            <FaUsers className="text-info" /> Group & One-on-One Calls
          </span>
        </div>

        <Badge bg="primary" className="py-2 px-3 fw-normal">
          PARAKSHTECH Secure Collaboration
        </Badge>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Header className="bg-white border-bottom py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            {/* Tabs */}
            <div className="d-flex gap-2">
              <Button 
                variant={activeTab === 'upcoming' ? 'primary' : 'outline-secondary'} 
                size="sm"
                onClick={() => setActiveTab('upcoming')}
                className="fw-semibold px-3"
              >
                Upcoming & Active ({upcomingList.length})
              </Button>
              <Button 
                variant={activeTab === 'history' ? 'primary' : 'outline-secondary'} 
                size="sm"
                onClick={() => setActiveTab('history')}
                className="fw-semibold px-3"
              >
                Meeting History ({historyList.length})
              </Button>
            </div>

            {/* Search & Filters */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <InputGroup size="sm" style={{ width: '240px' }}>
                <InputGroup.Text className="bg-white border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search meeting by title / ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>

              <Form.Select 
                size="sm" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '130px' }}
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-2" />
              <div className="text-muted">Loading meetings...</div>
            </div>
          ) : displayedMeetings.length === 0 ? (
            <div className="text-center py-5">
              <FaVideo size={48} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-bold text-dark">No {activeTab} meetings found</h5>
              <p className="text-muted small">
                {activeTab === 'upcoming' 
                  ? 'There are no active or scheduled meetings right now. You can start an instant meeting or schedule one!' 
                  : 'No past meetings recorded.'}
              </p>
              {activeTab === 'upcoming' && (
                <Button variant="primary" size="sm" onClick={() => setShowScheduleModal(true)}>
                  <FaCalendarPlus className="me-2" /> Schedule a Meeting
                </Button>
              )}
            </div>
          ) : (
            <Row className="g-3">
              {displayedMeetings.map((m) => (
                <Col key={m.id} xs={12} lg={6}>
                  <Card className={`meeting-card h-100 ${m.status}`}>
                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                      <div>
                        {/* Card Header Tag & Status */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Badge 
                              bg={m.status === 'in-progress' ? 'success' : m.status === 'scheduled' ? 'primary' : 'secondary'}
                              className="text-uppercase py-1 px-2"
                              style={{ fontSize: '10px' }}
                            >
                              {m.status === 'in-progress' ? '● In Progress' : m.status}
                            </Badge>
                            <Badge bg="light" className="text-secondary border text-capitalize">
                              {m.meeting_type} Call
                            </Badge>
                          </div>

                          <span className="font-monospace text-muted small" title="Meeting Code">
                            #{m.meeting_id}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h5 className="fw-bold text-dark mb-1">{m.title}</h5>
                        {m.description && (
                          <p className="text-muted small mb-3 text-truncate" title={m.description}>
                            {m.description}
                          </p>
                        )}

                        {/* Schedule Meta Details */}
                        <div className="d-flex flex-wrap align-items-center gap-3 text-muted small mb-3">
                          <span className="d-flex align-items-center gap-1">
                            <FaCalendarAlt className="text-primary" />
                            <strong>{m.scheduled_date}</strong>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <FaClock className="text-primary" />
                            <span>{m.start_time?.slice(0, 5)} ({m.duration_minutes} min)</span>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <FaBuilding className="text-secondary" />
                            <span>Dept: <strong>{m.department}</strong></span>
                          </span>
                        </div>

                        <div className="text-muted small mb-3">
                          Host: <strong className="text-dark">{m.host_name}</strong>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-2">
                        <div className="d-flex align-items-center gap-2">
                          {/* Join Meeting Action */}
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleJoinMeeting(m)}
                            className="d-flex align-items-center gap-2 fw-semibold px-3"
                          >
                            <FaVideo />
                            <span>Join Meeting</span>
                          </Button>

                          {/* Copy Link Action */}
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => handleCopyLink(m.meeting_id)}
                            title="Copy meeting invite link"
                            className="d-flex align-items-center gap-1"
                          >
                            {copiedId === m.meeting_id ? <FaCheck className="text-success" /> : <FaCopy />}
                            <span>{copiedId === m.meeting_id ? 'Copied' : 'Invite'}</span>
                          </Button>
                        </div>

                        {/* Admin / Host Cancel action */}
                        {isAdminOrHR && m.status !== 'completed' && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-danger p-0"
                            onClick={() => handleDeleteMeeting(m.id)}
                            title="Cancel meeting"
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* SCHEDULE MEETING MODAL */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} size="lg" centered>
        <Form onSubmit={handleScheduleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaCalendarPlus className="text-primary" />
              <span>Schedule New Group Meeting</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Meeting Topic / Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="e.g. Weekly Sprint Review & Product Architecture"
                    value={scheduleData.title}
                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Agenda / Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Outline the goals, discussion items, and deliverables for this session"
                    value={scheduleData.description}
                    onChange={(e) => setScheduleData({ ...scheduleData, description: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={scheduleData.scheduled_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Start Time <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="time"
                    required
                    value={scheduleData.start_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Duration</Form.Label>
                  <Form.Select
                    value={scheduleData.duration_minutes}
                    onChange={(e) => setScheduleData({ ...scheduleData, duration_minutes: parseInt(e.target.value, 10) })}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Meeting Type</Form.Label>
                  <Form.Select
                    value={scheduleData.meeting_type}
                    onChange={(e) => setScheduleData({ ...scheduleData, meeting_type: e.target.value })}
                  >
                    <option value="group">Group Conference Call</option>
                    <option value="department">Department Sync</option>
                    <option value="one-on-one">1-on-1 Discussion</option>
                    <option value="all-hands">All-Hands Company Meeting</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Target Department</Form.Label>
                  <Form.Select
                    value={scheduleData.department}
                    onChange={(e) => setScheduleData({ ...scheduleData, department: e.target.value })}
                  >
                    <option value="All">All Departments</option>
                    <option value="Engineering">Engineering / Development</option>
                    <option value="Sales">Sales & Business</option>
                    <option value="Human Resources">Human Resources (HR)</option>
                    <option value="Quality Assurance">Quality Assurance (QA)</option>
                    <option value="Management">Executive Management</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Custom Meeting Code / Room ID (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. dev-team-sync (leave empty for auto code)"
                    value={scheduleData.custom_meeting_id}
                    onChange={(e) => setScheduleData({ ...scheduleData, custom_meeting_id: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Room Passcode (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Optional pin/password"
                    value={scheduleData.passcode}
                    onChange={(e) => setScheduleData({ ...scheduleData, passcode: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <div className="bg-light p-3 rounded border">
                  <div className="small fw-bold mb-2 text-dark">Collaboration Settings:</div>
                  <div className="d-flex flex-wrap gap-4">
                    <Form.Check
                      type="checkbox"
                      id="allowScreenShare"
                      label="Allow Screen Sharing"
                      checked={scheduleData.allowScreenShare}
                      onChange={(e) => setScheduleData({ ...scheduleData, allowScreenShare: e.target.checked })}
                    />
                    <Form.Check
                      type="checkbox"
                      id="allowChat"
                      label="Allow Group In-Meeting Chat"
                      checked={scheduleData.allowChat}
                      onChange={(e) => setScheduleData({ ...scheduleData, allowChat: e.target.checked })}
                    />
                    <Form.Check
                      type="checkbox"
                      id="allowDocumentShare"
                      label="Allow Document & File Sharing"
                      checked={scheduleData.allowDocumentShare}
                      onChange={(e) => setScheduleData({ ...scheduleData, allowDocumentShare: e.target.checked })}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={scheduling}>
              {scheduling ? <><Spinner size="sm" className="me-2" />Scheduling...</> : 'Schedule Meeting'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* JOIN WITH CODE MODAL */}
      <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
        <Form onSubmit={handleJoinWithCode}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaSignInAlt className="text-primary" />
              <span>Join Meeting</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {joinError && <Alert variant="danger" className="py-2 small">{joinError}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Meeting Code or Link</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter meeting ID, e.g. ptk-492-182"
                required
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                autoFocus
              />
              <Form.Text className="text-muted">
                Paste the invite link or 9-digit code provided by your meeting organizer.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Join Call
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MeetingPanel;

