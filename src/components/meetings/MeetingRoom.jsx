import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Button, Badge, Spinner, Alert, Form, 
  InputGroup, OverlayTrigger, Tooltip, Modal 
} from 'react-bootstrap';
import { 
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, 
  FaDesktop, FaComments, FaPaperclip, FaPhoneSlash, 
  FaCopy, FaCheck, FaUsers, FaArrowLeft, FaDownload, 
  FaFileUpload, FaFileAlt, FaFilePdf, FaFileWord, 
  FaFileExcel, FaImage, FaTimes, FaShieldAlt, FaExpand, FaCompress,
  FaCircle, FaStop, FaPalette, FaUserPlus, FaLink, FaMagic, FaUpload,
  FaCheckCircle, FaPlayCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './MeetingPanel.css';

// Professional Virtual Background Presets
const BACKGROUND_PRESETS = [
  { id: 'none', label: 'None', type: 'none', icon: '🚫', thumbnail: '' },
  { id: 'blur-soft', label: 'Subtle Blur', type: 'blur', blurAmount: '12px', icon: '🌫️', thumbnail: '' },
  { id: 'blur-heavy', label: 'Studio Bokeh', type: 'blur', blurAmount: '24px', icon: '✨', thumbnail: '' },
  { 
    id: 'office', 
    label: 'Executive Boardroom', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
    icon: '🏢' 
  },
  { 
    id: 'minimalist', 
    label: 'Modern Open Office', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80',
    icon: '🏙️' 
  },
  { 
    id: 'library', 
    label: 'Executive Library', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1000&q=80',
    icon: '📚' 
  },
  { 
    id: 'skyline', 
    label: 'Skyline Penthouse', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
    icon: '🌆' 
  },
  { 
    id: 'warm', 
    label: 'Warm Workspace', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1000&q=80',
    icon: '🌿' 
  },
  { 
    id: 'studio', 
    label: 'Dark Tech Studio', 
    type: 'gradient', 
    url: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
    icon: '💻' 
  }
];

const MeetingRoom = ({ meetingData: initialMeeting, onLeave, isGuest = false, guestUser = null }) => {
  const { meetingId: paramMeetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const meetingId = initialMeeting?.meeting_id || paramMeetingId || 'general-room';

  // Meeting Details State
  const [meeting, setMeeting] = useState(initialMeeting || null);
  const [loadingMeeting, setLoadingMeeting] = useState(!initialMeeting);

  // Local Media State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState('');

  // Virtual Background State
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[0]);
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const bgFileInputRef = useRef(null);

  // Meeting Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [showSavedRecordingModal, setShowSavedRecordingModal] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Drawers (Side Panel) State
  const [activeDrawer, setActiveDrawer] = useState(null); // 'chat' | 'documents' | 'participants' | 'backgrounds' | null
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Link copy states
  const [callDuration, setCallDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);

  // Media Stream Refs
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // Compute Self Name & Role
  const selfName = isGuest && guestUser?.name
    ? guestUser.name
    : (user?.employee?.first_name ? `${user.employee.first_name} ${user.employee.last_name || ''}` : (user?.email?.split('@')[0] || 'You'));
  const selfRole = isGuest ? 'Guest' : (user?.role === 'admin' ? 'Host (Admin)' : 'Participant');

  // Only real registered participants in the meeting room
  const [participants, setParticipants] = useState([
    {
      id: 'self',
      name: selfName,
      role: selfRole,
      isLocal: true,
      isMicOn: true,
      isCameraOn: true,
      isSpeaking: false,
      avatarBg: '#3b82f6'
    }
  ]);

  // Load registered employees invited to this meeting
  useEffect(() => {
    if (meeting) {
      let invitedList = [];
      if (meeting.invited_employees) {
        try {
          invitedList = typeof meeting.invited_employees === 'string'
            ? JSON.parse(meeting.invited_employees)
            : meeting.invited_employees;
        } catch (e) {
          invitedList = [];
        }
      }

      const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];

      if (Array.isArray(invitedList) && invitedList.length > 0) {
        setParticipants(prev => {
          const selfPart = prev.find(p => p.isLocal) || {
            id: 'self',
            name: selfName,
            role: selfRole,
            isLocal: true,
            isMicOn: isMicOn,
            isCameraOn: isCameraOn,
            isSpeaking: false,
            avatarBg: '#3b82f6'
          };

          const newOthers = invitedList
            .filter(emp => emp.email !== user?.email && emp.name !== selfName)
            .map((emp, idx) => ({
              id: `emp-${emp.id || idx}`,
              name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email,
              role: emp.role || emp.position || emp.department || 'Registered Employee',
              isLocal: false,
              isMicOn: false,
              isCameraOn: false,
              isSpeaking: false,
              avatarBg: colors[idx % colors.length]
            }));

          return [selfPart, ...newOthers];
        });
      }
    }
  }, [meeting, selfName, selfRole, user, isMicOn, isCameraOn]);

  // Fetch Meeting Details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoadingMeeting(true);
        const res = await api.get(`/meetings/${meetingId}`);
        if (res.data && res.data.success) {
          setMeeting(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch meeting details, using default room settings:', err);
      } finally {
        setLoadingMeeting(false);
      }
    };

    if (!meeting) {
      fetchMeeting();
    }
  }, [meetingId]);

  // Setup Call Duration Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Call Timer (HH:MM:SS or MM:SS)
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hrs = Math.floor(mins / 60);
    const displayMins = mins % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Initialize Local Media (Camera & Mic)
  useEffect(() => {
    let isMounted = true;

    const startLocalMedia = async () => {
      try {
        setMediaError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (isMounted) {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera/Mic permission warning:', err);
        // Fallback: try audio only
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (isMounted) {
            localStreamRef.current = audioOnly;
            setIsCameraOn(false);
          }
        } catch (audioErr) {
          console.warn('No media devices available, joining in viewer mode:', audioErr);
          setIsCameraOn(false);
          setIsMicOn(false);
          setMediaError('Microphone/Camera permission not granted. You are connected in spectator mode.');
        }
      }
    };

    startLocalMedia();

    return () => {
      isMounted = false;
      // Stop all tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync Video Element when camera turns on/off
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isCameraOn]);

  // Toggle Microphone
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isMicOn;
        audioTracks.forEach(track => {
          track.enabled = nextState;
        });
        setIsMicOn(nextState);
        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, isMicOn: nextState } : p));
      }
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !isCameraOn;
        videoTracks.forEach(track => {
          track.enabled = nextState;
        });
        setIsCameraOn(nextState);
        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, isCameraOn: nextState } : p));
      }
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  // Synchronize Screen Sharing Video Stream to DOM
  useEffect(() => {
    if (isScreenSharing && screenStreamRef.current && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
      screenVideoRef.current.play().catch(err => console.warn('Screen share autoplay notice:', err));
    }
  }, [isScreenSharing]);

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        setMediaError('');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        setTimeout(() => {
          if (screenVideoRef.current && screenStreamRef.current) {
            screenVideoRef.current.srcObject = screenStreamRef.current;
            screenVideoRef.current.play().catch(e => console.warn('Screen video play error:', e));
          }
        }, 100);

        // Handle user clicking "Stop sharing" from browser native chrome banner
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            stopScreenShare();
          };
        }
      } catch (err) {
        console.warn('Screen share canceled or not supported:', err);
        setIsScreenSharing(false);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    const elem = document.querySelector('.meeting-room-container');
    if (!document.fullscreenElement) {
      elem?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Fetch In-Meeting Chat Messages
  const fetchMessages = async () => {
    try {
      const res = await api.get(`/meetings/${meetingId}/messages`);
      if (res.data && res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      // Fallback local chat
    }
  };

  // Fetch In-Meeting Shared Documents
  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/meetings/${meetingId}/documents`);
      if (res.data && res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      // Fallback local documents
    }
  };

  // Poll chat messages and documents
  useEffect(() => {
    fetchMessages();
    fetchDocuments();

    const interval = setInterval(() => {
      fetchMessages();
      fetchDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [meetingId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeDrawer === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeDrawer]);

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const myName = selfName;
    const myRole = selfRole;

    const msgPayload = {
      message: chatInput.trim(),
      sender_name: myName,
      sender_role: myRole
    };

    setSendingMsg(true);
    try {
      const res = await api.post(`/meetings/${meetingId}/messages`, msgPayload);
      if (res.data && res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        setChatInput('');
      }
    } catch (err) {
      // Offline fallback
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now(), 
          meeting_id: meetingId, 
          sender_name: myName, 
          sender_role: myRole,
          message: chatInput.trim(),
          createdAt: new Date().toISOString()
        }
      ]);
      setChatInput('');
    } finally {
      setSendingMsg(false);
    }
  };

  // Handle Document Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploader_name', selfName);

    setUploadingDoc(true);
    setUploadSuccess('');
    try {
      const res = await api.post(`/meetings/${meetingId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.success) {
        setDocuments(prev => [res.data.data, ...prev]);
        setUploadSuccess(`Document "${file.name}" shared with all participants!`);
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch (err) {
      alert('Failed to upload document: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy Meeting Member Invite Link
  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}/meetings/${meetingId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Copy Public Guest Join Link
  const handleCopyGuestLink = () => {
    const guestUrl = `${window.location.origin}/meeting/guest/${meetingId}`;
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopiedGuestLink(true);
      setTimeout(() => setCopiedGuestLink(false), 3000);
    });
  };

  // Virtual Background Handlers
  const handleSelectBackground = (preset) => {
    setSelectedBg(preset);
  };

  const handleUploadCustomBg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setCustomBgUrl(dataUrl);
      const customPreset = {
        id: 'custom-' + Date.now(),
        label: 'Custom Photo',
        type: 'image',
        url: dataUrl,
        icon: '🖼️'
      };
      setSelectedBg(customPreset);
    };
    reader.readAsDataURL(file);
  };

  // Meeting Recording Handlers
  const handleStartRecording = async () => {
    try {
      recordedChunksRef.current = [];
      let captureStream = null;

      try {
        captureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } catch (err) {
        // Fallback: If user cancels screen share, record local camera stream
        if (localStreamRef.current) {
          captureStream = localStreamRef.current;
        } else {
          alert('No active screen or video stream available to record.');
          return;
        }
      }

      const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      const selectedMime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(captureStream, selectedMime ? { mimeType: selectedMime } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: selectedMime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingBlob(blob);
        setRecordingUrl(url);
        setShowSavedRecordingModal(true);

        // Auto download trigger
        const a = document.createElement('a');
        a.href = url;
        a.download = `PARAKSHTECH-Meeting-${meetingId}-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (captureStream !== localStreamRef.current) {
          captureStream.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Leave Meeting
  const handleLeaveMeeting = () => {
    if (window.confirm('Are you sure you want to leave this meeting?')) {
      if (isRecording) {
        handleStopRecording();
      }
      stopScreenShare();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (onLeave) {
        onLeave();
      } else {
        navigate('/meetings');
      }
    }
  };

  const getDocIcon = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className="text-danger" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-primary" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="text-success" />;
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) return <FaImage className="text-warning" />;
    return <FaFileAlt className="text-info" />;
  };

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  return (
    <div className="meeting-room-container">
      {/* Top Header Bar */}
      <div className="meeting-room-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleLeaveMeeting}
            className="d-flex align-items-center gap-1 border-secondary py-1 px-2"
          >
            <FaArrowLeft size={12} />
            <span>Leave</span>
          </Button>

          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '16px' }}>
                {meeting?.title || 'Group Video Conference'}
              </h5>
              <Badge bg="success" className="px-2 py-1" style={{ fontSize: '11px' }}>
                <span className="live-dot me-1">●</span> LIVE
              </Badge>
              <Badge bg="secondary" className="font-monospace" style={{ fontSize: '11px' }}>
                ID: {meetingId}
              </Badge>
            </div>
            <div className="text-muted small mt-1 d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
              <span>Host: <strong className="text-light">{meeting?.host_name || 'Admin'}</strong></span>
              <span>•</span>
              <span>Duration: <strong className="text-light font-monospace">{formatTimer(callDuration)}</strong></span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Live Recording Indicator */}
          {isRecording && (
            <div className="recording-live-indicator me-1">
              <span className="pulse-red-dot"></span>
              <span>REC {formatTimer(recordingDuration)}</span>
            </div>
          )}

          {/* Copy Public Guest Link */}
          <Button 
            variant="outline-info" 
            size="sm" 
            onClick={handleCopyGuestLink}
            className="d-flex align-items-center gap-1 border-info"
            title="Copy link for external guests / clients (no login needed)"
          >
            {copiedGuestLink ? <><FaCheck className="text-success" /> Guest Link Copied</> : <><FaUserPlus /> Guest Link</>}
          </Button>

          {/* Copy Meeting Link */}
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleCopyInvite}
            className="d-flex align-items-center gap-1 border-secondary"
            title="Copy invite link to share with colleagues"
          >
            {copiedLink ? <><FaCheck className="text-success" /> Copied!</> : <><FaCopy /> Share Link</>}
          </Button>

          {/* Fullscreen Button */}
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={toggleFullscreen}
            className="border-secondary px-2"
            title="Toggle fullscreen mode"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
        </div>
      </div>

      {mediaError && (
        <Alert variant="warning" className="m-2 mb-0 py-2 px-3 small border-0 rounded-0" dismissible onClose={() => setMediaError('')}>
          <FaShieldAlt className="me-2" />
          {mediaError}
        </Alert>
      )}

      {/* Main Video Conference Body Area */}
      <div className="meeting-room-body">
        
        {/* Stage Wrapper */}
        <div className="video-stage-wrapper">
          {/* When Screen Share is Active, Show Spotlight Stage */}
          {isScreenSharing ? (
            <>
              <div className="screen-share-spotlight">
                <div className="screen-share-banner">
                  <FaDesktop />
                  <span>You are sharing your screen</span>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={stopScreenShare}
                    className="py-0 px-2 ms-2 fw-semibold"
                    style={{ fontSize: '11px' }}
                  >
                    Stop Sharing
                  </Button>
                </div>
                <video 
                  ref={screenVideoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="screen-share-video" 
                />
              </div>

              {/* Bottom Filmstrip of Participants during screen share */}
              <div className="filmstrip-row">
                {participants.map(p => (
                  <div key={p.id} className={`participant-tile ${p.isLocal ? 'is-local' : ''}`}>
                    {p.isLocal ? (
                      isCameraOn ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="participant-video-element" />
                      ) : (
                        <div className="participant-avatar-placeholder">
                          <div className="participant-avatar-circle" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="participant-avatar-placeholder">
                        <div className="participant-avatar-circle" style={{ width: '48px', height: '48px', fontSize: '18px', background: p.avatarBg }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="tile-overlay-info py-0 px-2" style={{ fontSize: '11px' }}>
                      <span>{p.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Multi-Participant Grid View */
            <div className={`participants-grid grid-${participants.length <= 4 ? participants.length : 'many'}`}>
              {participants.map(p => (
                <div 
                  key={p.id} 
                  className={`participant-tile ${p.isLocal ? 'is-local' : ''} ${p.isSpeaking ? 'active-speaker' : ''} ${p.isLocal && selectedBg.type !== 'none' ? 'has-virtual-bg' : ''}`}
                >
                  {/* Virtual Background Backdrop Layer */}
                  {p.isLocal && selectedBg.type === 'blur' && (
                    <div className="virtual-bg-tile-backdrop blur-mode" />
                  )}
                  {p.isLocal && selectedBg.type === 'image' && (
                    <div 
                      className="virtual-bg-tile-backdrop" 
                      style={{ backgroundImage: `url(${selectedBg.url})` }}
                    />
                  )}
                  {p.isLocal && selectedBg.type === 'gradient' && (
                    <div 
                      className="virtual-bg-tile-backdrop" 
                      style={{ background: selectedBg.url }}
                    />
                  )}
                  {p.isLocal && selectedBg.type !== 'none' && (
                    <div className="active-bg-badge">
                      <span>✨ {selectedBg.label}</span>
                    </div>
                  )}

                  {p.isLocal ? (
                    isCameraOn ? (
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`participant-video-element ${selectedBg.type !== 'none' ? 'with-virtual-bg' : ''}`} 
                        style={selectedBg.type === 'blur' ? { filter: `blur(${selectedBg.blurAmount || '12px'})` } : {}}
                      />
                    ) : (
                      <div className="participant-avatar-placeholder">
                        <div className="participant-avatar-circle">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-light small mt-2 fw-semibold">{p.name} (You)</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>Camera is Off</div>
                      </div>
                    )
                  ) : (
                    <div className="participant-avatar-placeholder">
                      <div className="participant-avatar-circle" style={{ background: p.avatarBg }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-light small mt-2 fw-semibold">{p.name}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{p.role}</div>
                    </div>
                  )}

                  {/* Top Status Icons */}
                  <div className="tile-status-icons">
                    <div className={`status-icon-pill ${!p.isMicOn ? 'muted' : ''}`} title={p.isMicOn ? 'Mic Active' : 'Muted'}>
                      {p.isMicOn ? <FaMicrophone size={12} className="text-success" /> : <FaMicrophoneSlash size={12} />}
                    </div>
                  </div>

                  {/* Bottom Info Tag */}
                  <div className="tile-overlay-info">
                    <span className="fw-semibold">{p.name} {p.isLocal && '(You)'}</span>
                    {p.isSpeaking && (
                      <Badge bg="success" className="px-1 py-0 ms-1" style={{ fontSize: '9px' }}>
                        SPEAKING
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IN-MEETING SIDE DRAWER (Chat, Documents, Participants, Backgrounds) */}
        {activeDrawer && (
          <div className="meeting-side-drawer">
            <div className="drawer-header">
              <h6 className="fw-bold mb-0 text-white d-flex align-items-center gap-2">
                {activeDrawer === 'chat' && <><FaComments className="text-primary" /> Group Chat</>}
                {activeDrawer === 'documents' && <><FaPaperclip className="text-success" /> Shared Documents ({documents.length})</>}
                {activeDrawer === 'participants' && <><FaUsers className="text-info" /> Participants ({participants.length})</>}
                {activeDrawer === 'backgrounds' && <><FaPalette className="text-warning" /> Professional Backgrounds</>}
              </h6>
              <Button 
                variant="link" 
                size="sm" 
                className="text-secondary p-0" 
                onClick={() => setActiveDrawer(null)}
              >
                <FaTimes size={16} />
              </Button>
            </div>

            {/* Sub Nav Tabs */}
            <div className="drawer-nav-tabs">
              <button 
                className={`drawer-tab-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveDrawer('chat')}
              >
                <FaComments size={14} /> Chat
              </button>
              <button 
                className={`drawer-tab-btn ${activeDrawer === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveDrawer('documents')}
              >
                <FaPaperclip size={14} /> Docs
              </button>
              <button 
                className={`drawer-tab-btn ${activeDrawer === 'backgrounds' ? 'active' : ''}`}
                onClick={() => setActiveDrawer('backgrounds')}
              >
                <FaPalette size={14} /> Backgrounds
              </button>
              <button 
                className={`drawer-tab-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
                onClick={() => setActiveDrawer('participants')}
              >
                <FaUsers size={14} /> People
              </button>
            </div>

            {/* Drawer Body - CHAT TAB */}
            {activeDrawer === 'chat' && (
              <>
                <div className="drawer-content-body">
                  <div className="chat-messages-stream">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted py-5 small">
                        <FaComments size={32} className="mb-2 text-secondary" /><br />
                        No messages yet.<br />
                        Send a message to everyone in the meeting!
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMine = msg.sender_id === user?.id || msg.sender_name === selfName || msg.sender_name === 'You';
                        return (
                          <div key={msg.id || idx} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="chat-sender-info">
                              {isMine ? 'You' : msg.sender_name} {msg.sender_role && <span className="opacity-75">({msg.sender_role})</span>}
                            </div>
                            <div className="chat-bubble-box">
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </div>

                <div className="chat-input-area">
                  <Form onSubmit={handleSendMessage}>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Type a message to group..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="bg-dark text-white border-secondary"
                        size="sm"
                      />
                      <Button 
                        variant="primary" 
                        size="sm" 
                        type="submit" 
                        disabled={sendingMsg || !chatInput.trim()}
                      >
                        Send
                      </Button>
                    </InputGroup>
                  </Form>
                </div>
              </>
            )}

            {/* Drawer Body - DOCUMENTS TAB */}
            {activeDrawer === 'documents' && (
              <div className="drawer-content-body">
                {uploadSuccess && (
                  <Alert variant="success" className="py-2 px-3 small border-0 mb-3">
                    {uploadSuccess}
                  </Alert>
                )}

                {/* Upload File Button */}
                <div className="mb-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                  />
                  <div 
                    className="document-upload-dropzone" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingDoc ? (
                      <><Spinner size="sm" className="me-2" /> Uploading & Sharing Document...</>
                    ) : (
                      <>
                        <FaFileUpload size={24} className="text-primary mb-2 d-block mx-auto" />
                        <span className="fw-semibold text-light small d-block">Click to Share Document</span>
                        <span className="text-muted" style={{ fontSize: '11px' }}>PDF, DOCX, XLSX, Images (Max 25MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Document List */}
                <h6 className="fw-bold text-white small mb-2">Meeting Attachments</h6>
                {documents.length === 0 ? (
                  <div className="text-center text-muted py-4 small">
                    <FaFileAlt size={28} className="mb-2 text-secondary" /><br />
                    No documents shared yet.<br />
                    Click above to share files with everyone in this call.
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="document-item-card">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <div className="doc-icon-badge">
                          {getDocIcon(doc.file_name)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-white text-truncate fw-semibold small" title={doc.file_name}>
                            {doc.file_name}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {formatFileSize(doc.file_size)} • by {doc.uploader_name || 'Participant'}
                          </div>
                        </div>
                      </div>
                      
                      <a 
                        href={`http://localhost:5000${doc.file_path}`} 
                        download={doc.file_name} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-outline-info btn-sm py-1 px-2"
                        title="Download Document"
                      >
                        <FaDownload size={12} />
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Drawer Body - VIRTUAL BACKGROUNDS TAB */}
            {activeDrawer === 'backgrounds' && (
              <div className="drawer-content-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted small">Choose Professional Studio Setting</span>
                  {selectedBg.type !== 'none' && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={() => setSelectedBg(BACKGROUND_PRESETS[0])}
                      className="py-0 px-2"
                      style={{ fontSize: '11px' }}
                    >
                      Reset None
                    </Button>
                  )}
                </div>

                {/* Custom Photo Upload */}
                <input 
                  type="file" 
                  ref={bgFileInputRef} 
                  accept="image/*" 
                  onChange={handleUploadCustomBg} 
                  style={{ display: 'none' }} 
                />
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => bgFileInputRef.current?.click()}
                >
                  <FaUpload size={13} />
                  <span>Upload Custom Background Photo</span>
                </Button>

                {/* Presets Grid */}
                <div className="virtual-bg-grid">
                  {BACKGROUND_PRESETS.map((preset) => {
                    const isActive = selectedBg.id === preset.id;
                    return (
                      <div 
                        key={preset.id}
                        className={`virtual-bg-card ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectBackground(preset)}
                        style={
                          preset.type === 'image' 
                            ? { backgroundImage: `url(${preset.url})` }
                            : preset.type === 'gradient'
                            ? { background: preset.url }
                            : preset.type === 'blur'
                            ? { background: '#1e293b' }
                            : { background: '#0f172a' }
                        }
                      >
                        <div className="bg-label">
                          <span className="text-truncate">{preset.icon} {preset.label}</span>
                          {isActive && <FaCheckCircle size={12} className="text-primary flex-shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-2 rounded bg-dark border border-secondary text-muted small" style={{ fontSize: '11px' }}>
                  <FaMagic className="text-warning me-1" />
                  Your selected professional background is applied directly to your webcam stream for all attendees to see.
                </div>
              </div>
            )}

            {/* Drawer Body - PARTICIPANTS TAB */}
            {activeDrawer === 'participants' && (
              <div className="drawer-content-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small">In this call ({participants.length})</span>
                  <Button variant="outline-primary" size="sm" onClick={handleCopyInvite} className="py-0 px-2" style={{ fontSize: '11px' }}>
                    + Invite
                  </Button>
                </div>

                {participants.map(p => (
                  <div key={p.id} className="d-flex justify-content-between align-items-center p-2 rounded mb-2 bg-dark">
                    <div className="d-flex align-items-center gap-2">
                      <div className="participant-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '13px', background: p.avatarBg }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white small fw-semibold">
                          {p.name} {p.isLocal && <span className="text-muted">(You)</span>}
                        </div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{p.role}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {p.isMicOn ? <FaMicrophone size={12} className="text-success" /> : <FaMicrophoneSlash size={12} className="text-danger" />}
                      {p.isCameraOn ? <FaVideo size={12} className="text-primary" /> : <FaVideoSlash size={12} className="text-secondary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="meeting-controls-bar">
        {/* Left Side Info */}
        <div className="d-flex align-items-center gap-2 text-muted small d-none d-md-flex" style={{ fontSize: '13px' }}>
          <FaShieldAlt className="text-success" />
          <span>Encrypted Call</span>
          <span>•</span>
          <span className="font-monospace text-light">{meetingId}</span>
          {isRecording && (
            <Badge bg="danger" className="ms-2 d-flex align-items-center gap-1 font-monospace">
              <span className="pulse-red-dot"></span> REC {formatTimer(recordingDuration)}
            </Badge>
          )}
        </div>

        {/* Center Main Action Controls */}
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          {/* Microphone Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>{isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}</Tooltip>}>
            <button 
              className={`meeting-control-btn ${!isMicOn ? 'danger' : ''}`}
              onClick={toggleMicrophone}
            >
              {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
          </OverlayTrigger>

          {/* Camera Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>{isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}</Tooltip>}>
            <button 
              className={`meeting-control-btn ${!isCameraOn ? 'danger' : ''}`}
              onClick={toggleCamera}
            >
              {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
            </button>
          </OverlayTrigger>

          {/* Screen Share Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</Tooltip>}>
            <button 
              className={`meeting-control-btn ${isScreenSharing ? 'active' : ''}`}
              onClick={toggleScreenShare}
            >
              <FaDesktop />
            </button>
          </OverlayTrigger>

          {/* Virtual Background Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Change Virtual Background</Tooltip>}>
            <button 
              className={`meeting-control-btn ${selectedBg.type !== 'none' || activeDrawer === 'backgrounds' ? 'active' : ''}`}
              onClick={() => setActiveDrawer(activeDrawer === 'backgrounds' ? null : 'backgrounds')}
            >
              <FaPalette />
            </button>
          </OverlayTrigger>

          {/* Meeting Recording Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>{isRecording ? 'Stop Recording' : 'Record Meeting'}</Tooltip>}>
            <button 
              className={`meeting-control-btn ${isRecording ? 'recording-active' : ''}`}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              title={isRecording ? 'Stop Recording' : 'Record Meeting'}
            >
              {isRecording ? <FaStop /> : <FaCircle className="text-danger" />}
            </button>
          </OverlayTrigger>

          {/* End Call / Leave Button */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Leave Meeting</Tooltip>}>
            <button 
              className="meeting-control-btn danger leave-btn"
              onClick={handleLeaveMeeting}
            >
              <FaPhoneSlash />
              <span className="d-none d-sm-inline">Leave</span>
            </button>
          </OverlayTrigger>
        </div>

        {/* Right Drawer Toggles */}
        <div className="d-flex align-items-center gap-2">
          {/* Quick Copy Guest Link */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Copy Guest Link (No Login Needed)</Tooltip>}>
            <button 
              className={`meeting-control-btn ${copiedGuestLink ? 'active' : ''}`}
              onClick={handleCopyGuestLink}
            >
              {copiedGuestLink ? <FaCheck className="text-success" /> : <FaUserPlus />}
            </button>
          </OverlayTrigger>

          {/* Chat Drawer Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>In-Meeting Chat</Tooltip>}>
            <button 
              className={`meeting-control-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
            >
              <FaComments />
              {messages.length > 0 && activeDrawer !== 'chat' && (
                <span className="badge-unread-indicator">{messages.length}</span>
              )}
            </button>
          </OverlayTrigger>

          {/* Document Sharing Drawer Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Share Documents</Tooltip>}>
            <button 
              className={`meeting-control-btn ${activeDrawer === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveDrawer(activeDrawer === 'documents' ? null : 'documents')}
            >
              <FaPaperclip />
              {documents.length > 0 && activeDrawer !== 'documents' && (
                <span className="badge-unread-indicator">{documents.length}</span>
              )}
            </button>
          </OverlayTrigger>

          {/* Participants Toggle */}
          <OverlayTrigger placement="top" overlay={<Tooltip>Participants List</Tooltip>}>
            <button 
              className={`meeting-control-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
            >
              <FaUsers />
            </button>
          </OverlayTrigger>
        </div>
      </div>

      {/* SAVED RECORDING MODAL */}
      <Modal 
        show={showSavedRecordingModal} 
        onHide={() => setShowSavedRecordingModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-dark text-white border-secondary">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <FaCheckCircle className="text-success" /> Meeting Recording Saved
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p className="text-light small">
            Your recorded meeting has been successfully captured and saved to your device! You can preview it below or download it again.
          </p>

          {recordingUrl && (
            <div className="mb-3 rounded overflow-hidden border border-secondary" style={{ maxHeight: '380px', background: '#000' }}>
              <video 
                src={recordingUrl} 
                controls 
                style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }}
              />
            </div>
          )}

          <div className="p-3 rounded bg-secondary bg-opacity-25 d-flex justify-content-between align-items-center small">
            <div>
              <div className="fw-semibold text-white">File: PARAKSHTECH-Meeting-{meetingId}.webm</div>
              <div className="text-muted">Recorded Duration: {formatTimer(recordingDuration)}</div>
            </div>
            {recordingBlob && (
              <Badge bg="info">{(recordingBlob.size / (1024 * 1024)).toFixed(2)} MB</Badge>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowSavedRecordingModal(false)}>
            Close
          </Button>
          {recordingUrl && (
            <a 
              href={recordingUrl} 
              download={`PARAKSHTECH-Meeting-${meetingId}-${new Date().toISOString().slice(0, 10)}.webm`}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <FaDownload size={14} /> Download Recording Again
            </a>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MeetingRoom;

