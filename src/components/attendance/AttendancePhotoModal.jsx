import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { FaCamera, FaClock, FaCalendarDay, FaUser, FaDownload } from 'react-icons/fa';

const AttendancePhotoModal = ({ show, onHide, photoData }) => {
  const image = photoData?.image || photoData?.imageSrc;
  if (!photoData || !image) return null;

  const {
    employeeName = 'Employee',
    jobNo = '',
    date = '',
    time = '',
  } = photoData;

  const rawType = (photoData.punchType || photoData.type || 'check-in').toLowerCase();
  const isCheckIn = rawType.includes('in');
  const punchType = isCheckIn ? 'check-in' : 'check-out';

  // Helper to handle image source whether local relative or full URL or base64
  const getImageSrc = (src) => {
    if (!src) return '';
    if (src.startsWith('data:')) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    // Prefix with production backend origin or window.location.origin
    const origin = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') 
      : 'https://lms.parakshtech.com';
    const cleanPath = src.startsWith('/') ? src : `/${src}`;
    return `${origin}${cleanPath}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getImageSrc(image);
    link.download = `attendance_${punchType}_${jobNo || 'emp'}_${date || 'today'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal show={show} onHide={onHide} centered className="attendance-photo-modal">
      <Modal.Header closeButton className="py-2 px-3 bg-light border-bottom">
        <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
          <FaCamera className={isCheckIn ? 'text-success' : 'text-danger'} />
          <span>
            {isCheckIn ? 'Check-In Arrival Photo' : 'Check-Out Departure Photo'}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3 text-center bg-dark bg-opacity-10">
        <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded mb-2 shadow-sm text-start small">
          <div className="d-flex align-items-center gap-2">
            <FaUser className="text-secondary" />
            <div>
              <strong>{employeeName}</strong>
              {jobNo && <span className="text-muted ms-1">({jobNo})</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {date && (
              <Badge bg="light" className="text-dark border">
                <FaCalendarDay className="me-1 text-primary" /> {date}
              </Badge>
            )}
            {time && (
              <Badge bg={isCheckIn ? 'success' : 'danger'}>
                <FaClock className="me-1" /> {time}
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded overflow-hidden shadow border bg-black d-inline-block position-relative">
          <img 
            src={getImageSrc(image)} 
            alt="Attendance Punch Verification" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '480px', 
              objectFit: 'contain',
              display: 'block'
            }} 
            onError={(e) => {
              if (!e?.target?.src) return;
              const currentSrc = e.target.src;
              if (!e.target.dataset.triedFallback && currentSrc.includes('/uploads/') && !currentSrc.includes('/api/uploads/')) {
                e.target.dataset.triedFallback = 'true';
                e.target.src = currentSrc.replace('/uploads/', '/api/uploads/');
              } else if (!e.target.dataset.triedDirectFallback && currentSrc.includes('/api/uploads/')) {
                e.target.dataset.triedDirectFallback = 'true';
                e.target.src = currentSrc.replace('/api/uploads/', '/uploads/');
              }
            }}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="py-2 px-3 bg-light border-top d-flex justify-content-between">
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
        <Button variant="outline-primary" size="sm" onClick={handleDownload} className="d-flex align-items-center gap-1">
          <FaDownload size={12} />
          <span>Download Image</span>
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AttendancePhotoModal;
