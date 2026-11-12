import React, { useState } from 'react';
import { Toast, ToastContainer, Badge, Button } from 'react-bootstrap';
import { FaPauseCircle, FaExclamationTriangle, FaDesktop } from 'react-icons/fa';
import { useSystemOffTracker } from '../../services/systemOffTracker';
import { useScreenshotCapture, AUTO_CAPTURE_INTERVAL_MINUTES } from '../../services/screenshotCapture';
import { isMobileDevice } from '../../utils/deviceDetector';

const SystemOffTrackerWidget = () => {
  const {
    isCheckedIn,
    idleSeconds,
    isIdleOver30Min,
    returnNotification,
    dismissNotification
  } = useSystemOffTracker();

  const {
    isSharing: isScreenSharing,
    istClock,
    start: startScreenMonitoring
  } = useScreenshotCapture();
  const [promptDismissed, setPromptDismissed] = useState(false);
  const isMobile = isMobileDevice();

  if (!isCheckedIn) return null;

  // Format seconds to mm:ss or hh:mm
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <>
      {/* Return Toast Notification when user comes back after > 30 minutes of inactivity */}
      {returnNotification && (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
          <Toast 
            onClose={dismissNotification} 
            show={!!returnNotification} 
            delay={10000} 
            autohide 
            className="shadow-lg border-warning"
          >
            <Toast.Header className="bg-warning text-dark">
              <FaPauseCircle className="me-2" />
              <strong className="me-auto">System Off Time Logged</strong>
              <small className="text-dark">Just now</small>
            </Toast.Header>
            <Toast.Body className="bg-white">
              <div>
                You were inactive for <strong>{returnNotification.idleMinutes} minutes</strong> (exceeded 30m threshold).
              </div>
              <div className="mt-1 text-danger fw-semibold">
                + {returnNotification.offMinutesAdded} minutes recorded as System Off Time.
              </div>
              <div className="text-muted small mt-1">
                Total System Off Time today: {returnNotification.totalOffMinutes}m
              </div>
            </Toast.Body>
          </Toast>
        </ToastContainer>
      )}

      {/* Floating System Off / Inactivity Live Status Banner (Visible when idle > 30m) */}
      {isIdleOver30Min && (
        <div 
          className="position-fixed bottom-0 end-0 m-3 p-3 bg-dark text-white rounded-3 shadow-lg border border-danger d-flex align-items-center gap-3"
          style={{ zIndex: 9990, maxWidth: '380px' }}
        >
          <div className="p-2 rounded-circle bg-danger bg-opacity-25 text-danger d-flex align-items-center justify-content-center">
            <FaExclamationTriangle size={24} />
          </div>
          <div className="flex-grow-1 small">
            <div className="fw-bold text-danger d-flex align-items-center justify-content-between">
              <span>SYSTEM OFF TIME ACTIVE</span>
              <Badge bg="danger">Idle &gt; 30m</Badge>
            </div>
            <div className="text-light mt-1" style={{ fontSize: '12px' }}>
              Inactive for <strong>{formatDuration(idleSeconds)}</strong>.
            </div>
            <div className="text-warning fw-semibold mt-0" style={{ fontSize: '11px' }}>
              System off duration is being deducted from net working hours.
            </div>
          </div>
        </div>
      )}
      {/* Auto Screenshot Resume Prompt (Visible on desktop during 9:30 AM - 6:30 PM IST when checked in & not sharing) */}
      {!isMobile && !isScreenSharing && istClock?.isOfficeHours && !promptDismissed && (
        <div
          className="position-fixed bottom-0 start-0 m-3 p-3 bg-white rounded-3 shadow-lg border border-primary d-flex align-items-center gap-3"
          style={{ zIndex: 9985, maxWidth: '390px' }}
        >
          <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center">
            <FaDesktop size={20} />
          </div>
          <div className="flex-grow-1 small">
            <div className="fw-bold text-dark">Auto Screenshot Required (Every {AUTO_CAPTURE_INTERVAL_MINUTES}m)</div>
            <div className="text-muted" style={{ fontSize: '11px' }}>
              Office hours active (09:30 AM – 06:30 PM IST). Enable screen sharing to upload automatically.
            </div>
            <div className="d-flex gap-2 mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => startScreenMonitoring({ intervalMinutes: AUTO_CAPTURE_INTERVAL_MINUTES, captureImmediately: true })}
              >
                Enable Auto 10m Capture
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-muted text-decoration-none px-1"
                onClick={() => setPromptDismissed(true)}
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemOffTrackerWidget;

