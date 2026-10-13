import React from 'react';
import { Toast, ToastContainer, Badge } from 'react-bootstrap';
import { FaClock, FaPauseCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useSystemOffTracker } from '../../services/systemOffTracker';

const SystemOffTrackerWidget = () => {
  const {
    isCheckedIn,
    idleSeconds,
    isIdleOver30Min,
    systemOffMinutes,
    activityStatus,
    returnNotification,
    dismissNotification
  } = useSystemOffTracker();

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
    </>
  );
};

export default SystemOffTrackerWidget;

