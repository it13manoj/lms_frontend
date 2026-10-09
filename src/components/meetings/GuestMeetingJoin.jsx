import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { 
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, 
  FaUser, FaLock, FaBuilding, FaClock, FaCheckCircle, 
  FaShieldAlt, FaSignInAlt, FaRedo, FaCalendarAlt
} from 'react-icons/fa';
import api from '../../services/api';
import MeetingRoom from './MeetingRoom';
import companyLogo from '../../assets/parakshtech_logo.jpg';
import './MeetingPanel.css';

const GuestMeetingJoin = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  // Meeting fetch states
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Guest input states
  const [guestName, setGuestName] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  // Local media preview states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);

  // Fetch Meeting Information (Public endpoint)
  useEffect(() => {
    const fetchMeetingInfo = async () => {
      try {
        setLoading(true);
        setFetchError('');
        const res = await api.get(`/meetings/${meetingId}`);
        if (res.data && res.data.success) {
          setMeeting(res.data.data);
        } else {
          setFetchError('Meeting not found or has concluded.');
        }
      } catch (err) {
        console.warn('Error fetching meeting for guest:', err);
        setFetchError(err.response?.data?.message || 'Could not load meeting. Please verify the link or meeting ID.');
      } finally {
        setLoading(false);
      }
    };

    if (meetingId) {
      fetchMeetingInfo();
    }
  }, [meetingId]);

  // Start preview camera & mic for lobby
  useEffect(() => {
    let active = true;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (active) {
          previewStreamRef.current = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Could not start preview camera/mic:', err);
        setIsCameraOn(false);
      }
    };

    if (!hasJoined && !hasLeft) {
      startPreview();
    }

    return () => {
      active = false;
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [hasJoined, hasLeft]);

  // Toggle preview mic
  const togglePreviewMic = () => {
    if (previewStreamRef.current) {
      const audioTracks = previewStreamRef.current.getAudioTracks();
      const next = !isMicOn;
      audioTracks.forEach(t => { t.enabled = next; });
      setIsMicOn(next);
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  // Toggle preview camera
  const togglePreviewCamera = () => {
    if (previewStreamRef.current) {
      const videoTracks = previewStreamRef.current.getVideoTracks();
      const next = !isCameraOn;
      videoTracks.forEach(t => { t.enabled = next; });
      setIsCameraOn(next);
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  // Handle Guest Joining
  const handleJoinMeeting = (e) => {
    e.preventDefault();
    setJoinError('');

    if (!guestName.trim()) {
      setJoinError('Please enter your name to join the meeting.');
      return;
    }

    // Check passcode if meeting has one
    if (meeting?.passcode && meeting.passcode.trim()) {
      if (!passcodeInput || passcodeInput.trim() !== meeting.passcode.trim()) {
        setJoinError('Invalid meeting passcode. Please check with the host.');
        return;
      }
    }

    // Stop lobby stream so MeetingRoom can acquire its own stream
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(t => t.stop());
      previewStreamRef.current = null;
    }

    setHasJoined(true);
  };

  // If already joined the meeting, show full MeetingRoom in guest mode
  if (hasJoined && !hasLeft) {
    return (
      <MeetingRoom 
        meetingData={meeting}
        isGuest={true}
        guestUser={{ name: guestName.trim(), role: 'Guest' }}
        onLeave={() => {
          setHasJoined(false);
          setHasLeft(true);
        }}
      />
    );
  }

  // If left the meeting
  if (hasLeft) {
    return (
      <div className="guest-lobby-wrapper">
        <div className="guest-lobby-card text-center p-5" style={{ maxWidth: '520px' }}>
          <div className="mb-4">
            <img 
              src={companyLogo} 
              alt="PARAKSHTECH LLP" 
              style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '6px' }} 
            />
          </div>
          <h3 className="fw-bold text-white mb-2">You Have Left The Meeting</h3>
          <p className="text-light text-opacity-75 mb-4">
            Thank you for attending <strong>{meeting?.title || 'the conference call'}</strong> with PARAKSHTECH LLP.
          </p>

          <div className="d-flex justify-content-center gap-3">
            <Button 
              variant="primary" 
              className="d-flex align-items-center gap-2 px-4 py-2"
              onClick={() => {
                setHasLeft(false);
                setHasJoined(true);
              }}
            >
              <FaRedo /> Rejoin Meeting
            </Button>
            <Button 
              variant="outline-secondary" 
              className="px-4 py-2"
              onClick={() => navigate('/login')}
            >
              Employee Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-lobby-wrapper">
      <div className="guest-lobby-card">
        {/* Lobby Header */}
        <div className="guest-lobby-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <img 
              src={companyLogo} 
              alt="PARAKSHTECH LLP" 
              style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '3px' }} 
            />
            <div>
              <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '18px' }}>
                PARAKSHTECH LLP
              </h5>
              <span className="text-light text-opacity-75 small" style={{ fontSize: '12px' }}>
                Guest Conference & Collaborative Meeting Hub
              </span>
            </div>
          </div>

          <Badge bg="success" className="px-3 py-2 d-flex align-items-center gap-1">
            <FaShieldAlt /> Secure Guest Entry
          </Badge>
        </div>

        {/* Lobby Body */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="text-light mt-3 small">Loading meeting room details...</div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-4">
              <Alert variant="danger" className="mb-4">
                {fetchError}
              </Alert>
              <Button variant="outline-light" onClick={() => navigate('/login')}>
                Go to LMS Portal
              </Button>
            </div>
          ) : (
            <div className="row g-4 align-items-center">
              {/* Left Column: Live Camera/Mic Test Preview */}
              <div className="col-lg-6">
                <div className="guest-preview-stage">
                  {isCameraOn ? (
                    <video 
                      ref={previewVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="guest-preview-video" 
                    />
                  ) : (
                    <div className="text-center text-muted">
                      <FaVideoSlash size={48} className="mb-2 text-secondary" /><br />
                      <span>Camera is Turned Off</span>
                    </div>
                  )}

                  {/* Preview Media Controls */}
                  <div className="guest-preview-controls">
                    <button 
                      type="button"
                      className={`btn btn-sm rounded-circle ${isMicOn ? 'btn-outline-light' : 'btn-danger'}`}
                      style={{ width: '38px', height: '38px' }}
                      onClick={togglePreviewMic}
                      title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                    >
                      {isMicOn ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
                    </button>
                    <button 
                      type="button"
                      className={`btn btn-sm rounded-circle ${isCameraOn ? 'btn-outline-light' : 'btn-danger'}`}
                      style={{ width: '38px', height: '38px' }}
                      onClick={togglePreviewCamera}
                      title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                    >
                      {isCameraOn ? <FaVideo size={14} /> : <FaVideoSlash size={14} />}
                    </button>
                  </div>
                </div>
                <div className="text-center mt-2 text-light text-opacity-50 small" style={{ fontSize: '11px' }}>
                  Test your camera & microphone before joining the meeting.
                </div>
              </div>

              {/* Right Column: Meeting Info & Guest Entry Form */}
              <div className="col-lg-6">
                {/* Meeting Summary Card */}
                <div className="p-3 rounded mb-3" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold text-white mb-0" style={{ fontSize: '16px' }}>
                      {meeting?.title || 'Team Meeting'}
                    </h5>
                    <Badge bg="primary">Code: {meeting?.meeting_id || meetingId}</Badge>
                  </div>

                  {meeting?.description && (
                    <p className="text-light text-opacity-75 small mb-2" style={{ fontSize: '12px' }}>
                      {meeting.description}
                    </p>
                  )}

                  <div className="d-flex flex-wrap gap-3 text-muted small mt-2" style={{ fontSize: '12px' }}>
                    <span><strong className="text-light">Host:</strong> {meeting?.host_name || 'Admin'}</span>
                    <span><strong className="text-light">Dept:</strong> {meeting?.department || 'General'}</span>
                    {meeting?.scheduled_date && (
                      <span><strong className="text-light">Time:</strong> {meeting.scheduled_date} at {meeting.start_time?.slice(0, 5)}</span>
                    )}
                  </div>
                </div>

                {joinError && (
                  <Alert variant="danger" className="py-2 px-3 small border-0 mb-3">
                    {joinError}
                  </Alert>
                )}

                {/* Guest Join Form */}
                <Form onSubmit={handleJoinMeeting}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small fw-semibold">
                      Your Name / Display Name <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-light">
                        <FaUser size={13} />
                      </span>
                      <Form.Control 
                        type="text"
                        placeholder="Enter your name (e.g. John Doe - Client)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="bg-dark text-white border-secondary"
                        required
                        autoFocus
                      />
                    </div>
                  </Form.Group>

                  {/* Passcode (Required if meeting passcode exists) */}
                  {meeting?.passcode && meeting.passcode.trim() && (
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light small fw-semibold">
                        Meeting Passcode <span className="text-danger">*</span>
                      </Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-dark border-secondary text-light">
                          <FaLock size={13} />
                        </span>
                        <Form.Control 
                          type="password"
                          placeholder="Enter meeting passcode provided by host"
                          value={passcodeInput}
                          onChange={(e) => setPasscodeInput(e.target.value)}
                          className="bg-dark text-white border-secondary"
                          required
                        />
                      </div>
                      <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                        This meeting requires a passcode set by the meeting host.
                      </Form.Text>
                    </Form.Group>
                  )}

                  <Button 
                    type="submit" 
                    variant="success" 
                    className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mt-2"
                  >
                    <FaSignInAlt />
                    <span>Join Meeting as Guest</span>
                  </Button>
                </Form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestMeetingJoin;

