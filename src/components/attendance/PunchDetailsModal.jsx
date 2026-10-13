import React, { useState } from 'react';
import { Modal, Button, Badge, Table } from 'react-bootstrap';
import { FaClock, FaCalendarDay, FaUser, FaCheckCircle, FaExclamationCircle, FaCamera, FaSearchPlus } from 'react-icons/fa';
import AttendancePhotoModal from './AttendancePhotoModal';

const PunchDetailsModal = ({ show, onHide, record }) => {
  const [previewPhoto, setPreviewPhoto] = useState(null);

  if (!record) return null;

  const rawPunches = Array.isArray(record.raw_punches) ? record.raw_punches : [];

  const getImageSrc = (src) => {
    if (!src) return '';
    if (src.startsWith('data:')) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    const origin = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') 
      : 'https://lms.parakshtech.com';
    const cleanPath = src.startsWith('/') ? src : `/${src}`;
    return `${origin}${cleanPath}`;
  };

  const handleImageError = (e) => {
    if (!e?.target?.src) return;
    const currentSrc = e.target.src;
    if (!e.target.dataset.triedFallback && currentSrc.includes('/uploads/') && !currentSrc.includes('/api/uploads/')) {
      e.target.dataset.triedFallback = 'true';
      e.target.src = currentSrc.replace('/uploads/', '/api/uploads/');
    } else if (!e.target.dataset.triedDirectFallback && currentSrc.includes('/api/uploads/')) {
      e.target.dataset.triedDirectFallback = 'true';
      e.target.src = currentSrc.replace('/api/uploads/', '/uploads/');
    }
  };

  const handleOpenPhoto = (image, punchType, time) => {
    setPreviewPhoto({
      image,
      punchType,
      employeeName: record.name,
      jobNo: record.job_no,
      date: record.date,
      time
    });
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="py-2 px-3 bg-light border-bottom">
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
            <FaClock className="text-primary" />
            <span>Attendance & Photo Verification Logs</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <div className="d-flex align-items-center gap-3 p-3 bg-light rounded mb-3 border">
            <div 
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '45px', height: '45px', fontSize: '18px' }}
            >
              {record.name ? record.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <h6 className="mb-0 fw-bold">{record.name}</h6>
              <div className="text-muted small">
                Job No: <span className="fw-semibold text-dark">{record.job_no}</span> | {record.department || 'General'}
              </div>
              <div className="text-muted small">
                Date: <span className="fw-semibold text-dark">{record.date}</span>
              </div>
            </div>
          </div>

          {/* Punch Photos & Timings Side by Side */}
          <div className="row g-2 mb-3 small">
            {/* First Punch (Check-In) */}
            <div className="col-6">
              <div className="border p-2 rounded text-center h-100 d-flex flex-column justify-content-between bg-light bg-opacity-50">
                <div>
                  <div className="text-muted fw-semibold mb-1">Check-In (Arrival)</div>
                  {record.check_in_image ? (
                    <div 
                      className="position-relative mx-auto mb-2 rounded overflow-hidden shadow-sm border"
                      style={{ width: '80px', height: '80px', cursor: 'pointer', background: '#000' }}
                      onClick={() => handleOpenPhoto(record.check_in_image, 'check-in', record.check_in_formatted || record.check_in)}
                      title="Click to view full check-in photo"
                    >
                      <img 
                        src={getImageSrc(record.check_in_image)} 
                        alt="Check-in" 
                        className="w-100 h-100" 
                        style={{ objectFit: 'cover' }}
                        onError={handleImageError}
                      />
                      <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-1 rounded-top-start" style={{ fontSize: '9px' }}>
                        <FaSearchPlus />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="mx-auto mb-2 rounded border border-dashed d-flex flex-column align-items-center justify-content-center text-muted"
                      style={{ width: '80px', height: '80px', fontSize: '10px' }}
                    >
                      <FaCamera size={18} className="mb-1 opacity-50" />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div className="fw-bold fs-6 text-dark">
                    {record.check_in_formatted || record.check_in || '--:--'}
                  </div>
                </div>

                <Badge 
                  bg={record.is_late ? 'warning' : record.is_present ? 'success' : 'secondary'}
                  className="mt-2 py-1"
                >
                  {record.late_comment || (record.is_late ? `Late (${record.late_minutes}m)` : 'On Time')}
                </Badge>
              </div>
            </div>

            {/* Last Punch (Check-Out) */}
            <div className="col-6">
              <div className="border p-2 rounded text-center h-100 d-flex flex-column justify-content-between bg-light bg-opacity-50">
                <div>
                  <div className="text-muted fw-semibold mb-1">Check-Out (Departure)</div>
                  {record.check_out_image ? (
                    <div 
                      className="position-relative mx-auto mb-2 rounded overflow-hidden shadow-sm border"
                      style={{ width: '80px', height: '80px', cursor: 'pointer', background: '#000' }}
                      onClick={() => handleOpenPhoto(record.check_out_image, 'check-out', record.check_out_formatted || record.check_out)}
                      title="Click to view full check-out photo"
                    >
                      <img 
                        src={getImageSrc(record.check_out_image)} 
                        alt="Check-out" 
                        className="w-100 h-100" 
                        style={{ objectFit: 'cover' }}
                        onError={handleImageError}
                      />
                      <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-1 rounded-top-start" style={{ fontSize: '9px' }}>
                        <FaSearchPlus />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="mx-auto mb-2 rounded border border-dashed d-flex flex-column align-items-center justify-content-center text-muted"
                      style={{ width: '80px', height: '80px', fontSize: '10px' }}
                    >
                      <FaCamera size={18} className="mb-1 opacity-50" />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div className="fw-bold fs-6 text-dark">
                    {record.check_out_formatted || record.check_out || '--:--'}
                  </div>
                </div>

                <Badge 
                  bg={record.is_early_leave ? 'info' : record.check_out ? 'success' : 'secondary'}
                  className="mt-2 py-1"
                >
                  {record.early_leave_comment || (record.is_early_leave ? `Left early (${record.early_leave_minutes}m)` : 'Completed')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Working Hours & System Off Time Breakdown */}
          <div className="p-2 mb-3 rounded bg-light border d-flex justify-content-between align-items-center small">
            <div>
              <span className="text-muted d-block" style={{ fontSize: '11px' }}>Gross Hours</span>
              <strong className="text-dark font-monospace">{record.working_hours || 0} hrs</strong>
            </div>
            <div className="text-center">
              <span className="text-muted d-block" style={{ fontSize: '11px' }}>System Off Time (&gt;30m)</span>
              <span className={`badge ${record.system_off_minutes > 0 ? 'bg-danger' : 'bg-success bg-opacity-25 text-success'}`}>
                {record.system_off_minutes ? `${record.system_off_minutes}m` : '0m'}
              </span>
            </div>
            <div className="text-end">
              <span className="text-muted d-block" style={{ fontSize: '11px' }}>Net Productive</span>
              <strong className="text-primary font-monospace fs-6">
                {record.net_working_hours !== undefined ? record.net_working_hours : (record.working_hours || 0)} hrs
              </strong>
            </div>
          </div>

          {/* All raw punches table */}
          <h6 className="fs-6 fw-bold mb-2">Biometric Punch Timestamps ({rawPunches.length})</h6>
          {rawPunches.length > 0 ? (
            <div className="border rounded overflow-hidden">
              <Table size="sm" hover className="mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Punch Time</th>
                    <th>Punch Type</th>
                  </tr>
                </thead>
                <tbody>
                  {rawPunches.map((punch, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === rawPunches.length - 1 && rawPunches.length > 1;
                    return (
                      <tr key={idx}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="font-monospace fw-bold">{punch}</td>
                        <td>
                          {isFirst && (
                            <Badge bg="success" className="me-1">
                              Earliest (Check-In)
                            </Badge>
                          )}
                          {isLast && (
                            <Badge bg="primary" className="me-1">
                              Latest (Check-Out)
                            </Badge>
                          )}
                          {!isFirst && !isLast && (
                            <Badge bg="light" className="text-muted border">
                              Intermediate Punch
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted py-3 bg-light rounded">
              No punch timestamps available for this employee on this date.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2 px-3 bg-light border-top">
          <Button variant="secondary" size="sm" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Full Photo Preview Modal */}
      {previewPhoto && (
        <AttendancePhotoModal 
          show={!!previewPhoto} 
          onHide={() => setPreviewPhoto(null)} 
          photoData={previewPhoto} 
        />
      )}
    </>
  );
};

export default PunchDetailsModal;
