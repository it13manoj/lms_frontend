import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { 
  FaCamera, FaRedo, FaCheckCircle, FaTimes, 
  FaUser, FaClock, FaExclamationTriangle, FaSync,
  FaShieldAlt, FaUpload
} from 'react-icons/fa';

const CameraPunchModal = ({
  show,
  onHide,
  punchType = 'check-in', // 'check-in' | 'check-out'
  isUpdate = false,
  employeeName = '',
  jobNo = '',
  onConfirmPunch,
  submitting = false
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Stop camera stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Check available video devices
  const checkDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }
    } catch {
      // Ignore device enumeration error
    }
  };

  // Start webcam
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCameraLoading(true);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your current browser. You can upload a photo instead.');
      setCameraLoading(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      checkDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser address bar to punch attendance.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this system. You can upload a photo instead.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode]);

  // Initialize or cleanup camera on modal open/close
  useEffect(() => {
    if (show) {
      setCapturedImage(null);
      setCameraError('');
      startCamera();
    } else {
      stopStream();
      setCapturedImage(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [show]);

  // Re-attach stream when videoRef becomes ready
  useEffect(() => {
    if (stream && videoRef.current && !capturedImage) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedImage]);

  // Toggle front and back camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture photo from video feed
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // If front camera, mirror image for natural selfie feel
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Watermark overlay at the bottom
    const bannerHeight = 44;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Watermark text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial, sans-serif';
    const punchLabel = punchType === 'check-in' ? 'PUNCH IN (ARRIVAL)' : 'PUNCH OUT (DEPARTURE)';
    ctx.fillText(`${punchLabel} • ${employeeName || 'Staff'}`, 12, height - bannerHeight + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Arial, sans-serif';
    const dateStr = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    ctx.fillText(`${dateStr} • ${timeStr} • ParakshTech Biometric Verify`, 12, height - bannerHeight + 35);

    // Convert to compressed JPEG data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Temporarily pause stream while viewing snapshot
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // File upload fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width > 800 ? 800 : img.width;
        canvas.height = (canvas.width / img.width) * img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Watermark banner
        const bannerHeight = 40;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillText(`${punchType === 'check-in' ? 'PUNCH IN' : 'PUNCH OUT'} • ${employeeName || 'Staff'}`, 10, canvas.height - bannerHeight + 17);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Arial, sans-serif';
        ctx.fillText(`${new Date().toLocaleString()}`, 10, canvas.height - bannerHeight + 32);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopStream();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Confirm punch with captured photo
  const handleConfirm = () => {
    if (!capturedImage) return;
    onConfirmPunch(capturedImage, punchType, isUpdate);
  };

  const isCheckIn = punchType === 'check-in';

  return (
    <Modal 
      show={show} 
      onHide={() => {
        stopStream();
        onHide();
      }} 
      centered 
      backdrop="static"
      className="camera-punch-modal"
    >
      <Modal.Header closeButton className="border-bottom py-2 px-3 bg-light">
        <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
          <FaCamera className={isCheckIn ? 'text-success' : 'text-danger'} />
          <span>
            {isUpdate ? 'Update Punch' : isCheckIn ? 'Punch Check-In' : 'Punch Check-Out'} — Photo Verification
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 text-center">
        {/* Verification Banner */}
        <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-3 small border">
          <div className="d-flex align-items-center gap-2 text-start">
            <FaUser className="text-secondary" />
            <div>
              <strong>{employeeName || 'Staff Member'}</strong>
              {jobNo && <span className="text-muted ms-1">({jobNo})</span>}
            </div>
          </div>
          <Badge bg={isCheckIn ? 'success' : 'danger'} className="py-1 px-2 d-flex align-items-center gap-1">
            <FaClock size={11} />
            <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </Badge>
        </div>

        {/* Camera Error Alert */}
        {cameraError && (
          <Alert variant="warning" className="text-start py-2 px-3 small mb-3">
            <div className="d-flex align-items-center gap-2 fw-semibold mb-1">
              <FaExclamationTriangle />
              <span>Camera Notice</span>
            </div>
            <div className="text-muted">{cameraError}</div>
            <div className="mt-2 d-flex gap-2">
              <Button size="sm" variant="outline-dark" onClick={startCamera}>
                <FaSync className="me-1" /> Retry Camera
              </Button>
              <Button 
                size="sm" 
                variant="outline-primary" 
                onClick={() => fileInputRef.current?.click()}
              >
                <FaUpload className="me-1" /> Choose File
              </Button>
            </div>
          </Alert>
        )}

        {/* Video / Snapshot Viewport */}
        <div 
          className="position-relative mx-auto rounded overflow-hidden shadow-sm bg-dark d-flex align-items-center justify-content-center"
          style={{ 
            width: '100%', 
            maxWidth: '420px', 
            height: '315px', 
            border: isCheckIn ? '3px solid #10b981' : '3px solid #ef4444' 
          }}
        >
          {cameraLoading ? (
            <div className="text-white text-center p-3">
              <Spinner animation="border" variant="light" size="sm" className="mb-2" />
              <div className="small">Starting camera feed...</div>
            </div>
          ) : capturedImage ? (
            // Captured Snapshot
            <div className="w-100 h-100 position-relative">
              <img 
                src={capturedImage} 
                alt="Punch Verification" 
                className="w-100 h-100" 
                style={{ objectFit: 'cover' }} 
              />
              <Badge 
                bg="success" 
                className="position-absolute top-0 end-0 m-2 py-1 px-2 shadow-sm d-flex align-items-center gap-1"
              >
                <FaCheckCircle size={11} /> Photo Captured
              </Badge>
            </div>
          ) : (
            // Live Video Feed
            <div className="w-100 h-100 position-relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Oval guideline for selfie alignment */}
              <div 
                className="position-absolute top-50 start-50 translate-middle pointer-events-none"
                style={{
                  width: '190px',
                  height: '240px',
                  border: '2px dashed rgba(255, 255, 255, 0.7)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)',
                  pointerEvents: 'none'
                }}
              />

              {/* Live Badge */}
              <div className="position-absolute top-0 start-0 m-2">
                <Badge bg="danger" className="d-flex align-items-center gap-1 py-1 px-2 shadow-sm">
                  <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '6px', height: '6px' }}></span>
                  <span style={{ fontSize: '10px' }}>LIVE CAMERA</span>
                </Badge>
              </div>

              {/* Flip camera button */}
              {hasMultipleCameras && (
                <Button
                  variant="dark"
                  size="sm"
                  className="position-absolute top-0 end-0 m-2 bg-opacity-75 rounded-circle p-2"
                  onClick={handleFlipCamera}
                  title="Switch camera"
                >
                  <FaSync size={12} />
                </Button>
              )}

              {/* Instruction banner */}
              <div 
                className="position-absolute bottom-0 start-0 w-100 text-center text-white py-1 px-2 small bg-dark bg-opacity-75"
                style={{ fontSize: '11px' }}
              >
                Face the camera clearly inside the frame & click capture
              </div>
            </div>
          )}
        </div>

        {/* Hidden Canvas & File Input */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          capture="user" 
          style={{ display: 'none' }} 
          onChange={handleFileUpload} 
        />

        {/* Security / Verification Note */}
        <div className="mt-2 text-muted small d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '11px' }}>
          <FaShieldAlt className="text-primary" />
          <span>Photo is securely stamped with current timestamp & verified for attendance records.</span>
        </div>
      </Modal.Body>

      <Modal.Footer className="py-2 px-3 bg-light border-top d-flex justify-content-between">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => {
            stopStream();
            onHide();
          }}
          disabled={submitting}
        >
          Cancel
        </Button>

        <div className="d-flex gap-2">
          {capturedImage ? (
            <>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={handleRetake}
                disabled={submitting}
                className="d-flex align-items-center gap-1"
              >
                <FaRedo size={12} />
                <span>Retake</span>
              </Button>
              <Button 
                variant={isCheckIn ? 'success' : 'danger'} 
                size="sm" 
                onClick={handleConfirm}
                disabled={submitting}
                className="d-flex align-items-center gap-1 shadow-sm px-3"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle size={12} />
                    <span>Confirm & {isCheckIn ? 'Punch In' : 'Punch Out'}</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload image from file if camera has issues"
              >
                <FaUpload size={12} className="me-1" />
                <span>Upload</span>
              </Button>
              <Button 
                variant={isCheckIn ? 'success' : 'danger'} 
                size="sm" 
                onClick={handleCapturePhoto}
                disabled={cameraLoading || !stream}
                className="d-flex align-items-center gap-1 shadow-sm px-3"
              >
                <FaCamera size={13} />
                <span>Take Photo</span>
              </Button>
            </>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CameraPunchModal;

