import React from 'react';
import { Modal, Button, Badge, Table } from 'react-bootstrap';
import { FaClock, FaCalendarDay, FaUser, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const PunchDetailsModal = ({ show, onHide, record }) => {
  if (!record) return null;

  const rawPunches = Array.isArray(record.raw_punches) ? record.raw_punches : [];

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 d-flex align-items-center gap-2">
          <FaClock className="text-primary" />
          <span>Biometric Punch Logs</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center gap-3 p-3 bg-light rounded mb-3">
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

        {/* Office Timings & Summary */}
        <div className="row g-2 mb-3 small">
          <div className="col-6">
            <div className="border p-2 rounded text-center">
              <div className="text-muted">First Punch (Check-In)</div>
              <div className="fw-bold fs-6 text-dark mt-1">
                {record.check_in_formatted || record.check_in || '--:--'}
              </div>
              <Badge 
                bg={record.is_late ? 'warning' : record.is_present ? 'success' : 'secondary'}
                className="mt-1"
              >
                {record.late_comment || (record.is_late ? `Late (${record.late_minutes}m)` : 'On Time')}
              </Badge>
            </div>
          </div>
          <div className="col-6">
            <div className="border p-2 rounded text-center">
              <div className="text-muted">Last Punch (Check-Out)</div>
              <div className="fw-bold fs-6 text-dark mt-1">
                {record.check_out_formatted || record.check_out || '--:--'}
              </div>
              <Badge 
                bg={record.is_early_leave ? 'info' : record.check_out ? 'success' : 'secondary'}
                className="mt-1"
              >
                {record.early_leave_comment || (record.is_early_leave ? `Left early (${record.early_leave_minutes}m)` : 'Completed')}
              </Badge>
            </div>
          </div>
        </div>

        {/* All raw punches table */}
        <h6 className="fs-6 fw-bold mb-2">All Biometric Punch Timestamps ({rawPunches.length})</h6>
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
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PunchDetailsModal;
