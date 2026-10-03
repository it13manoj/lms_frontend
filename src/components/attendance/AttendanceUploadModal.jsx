import React, { useState, useRef } from 'react';
import { Modal, Button, Alert, ProgressBar, Badge, Table } from 'react-bootstrap';
import { 
  FaUpload, FaFileCsv, FaCheckCircle, FaExclamationTriangle, 
  FaDownload, FaInfoCircle, FaCalendarAlt, FaUsers 
} from 'react-icons/fa';
import api from '../../services/api';

const AttendanceUploadModal = ({ show, onHide, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError('');
    setUploadResult(null);
    setIsDragOver(false);
  };

  const handleClose = () => {
    resetState();
    onHide();
  };

  const handleFileChange = (selectedFile) => {
    setError('');
    setUploadResult(null);

    if (!selectedFile) return;

    // Validate file extension
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setError('Please select a valid CSV or TXT file.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setProgress(30);

      const formData = new FormData();
      formData.append('file', file);

      setProgress(60);
      const res = await api.post('/attendance/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProgress(100);
      if (res.data && res.data.success) {
        setUploadResult(res.data.data);
        if (onUploadSuccess) {
          // If dates exist, pick the first or latest date
          const targetDate = res.data.data.dates?.[0] || null;
          onUploadSuccess(targetDate);
        }
      } else {
        setError(res.data.message || 'Upload failed.');
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload attendance CSV.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/sample_attendance.csv';
    link.setAttribute('download', 'sample_attendance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="d-flex align-items-center gap-2 fs-5">
          <FaUpload className="text-primary" />
          <span>Upload Biometric Attendance CSV</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="py-4">
        {/* Office Timings Notice */}
        <div className="alert alert-primary d-flex align-items-center gap-2 py-2 mb-3">
          <FaInfoCircle className="flex-shrink-0" />
          <div className="small">
            <strong>Office Timings: 09:30 AM to 06:30 PM</strong>. Punches will automatically be mapped to calculate 
            <strong> Present/Absent</strong>, <strong>Late Arrival</strong> (&gt; 09:30 AM), and <strong>Early Departure</strong> (&lt; 06:30 PM).
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Upload Success Alert */}
        {uploadResult && (
          <Alert variant="success" className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCheckCircle className="text-success fs-5" />
              <strong>Attendance Data Processed Successfully!</strong>
            </div>
            <div className="row g-2 small mt-2">
              <div className="col-6 col-md-3">
                <div className="p-2 bg-white rounded border text-center">
                  <div className="text-muted">Total Punches</div>
                  <div className="fw-bold fs-6 text-primary">{uploadResult.totalRows}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 bg-white rounded border text-center">
                  <div className="text-muted">Records Mapped</div>
                  <div className="fw-bold fs-6 text-success">{uploadResult.recordsMapped}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 bg-white rounded border text-center">
                  <div className="text-muted">Dates Covered</div>
                  <div className="fw-bold fs-6 text-info">{uploadResult.dates?.length || 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 bg-white rounded border text-center">
                  <div className="text-muted">New Employees</div>
                  <div className="fw-bold fs-6 text-secondary">{uploadResult.newEmployeesCreated || 0}</div>
                </div>
              </div>
            </div>
            {uploadResult.dates && uploadResult.dates.length > 0 && (
              <div className="mt-3 text-muted small">
                <strong>Dates processed: </strong>
                {uploadResult.dates.map(d => (
                  <Badge key={d} bg="secondary" className="me-1 mb-1">{d}</Badge>
                ))}
              </div>
            )}
          </Alert>
        )}

        {/* Drag & Drop Upload Zone */}
        {!uploadResult && (
          <div
            className={`upload-dropzone p-4 text-center border rounded-3 mb-3 ${
              isDragOver ? 'border-primary bg-light' : 'border-dashed'
            }`}
            style={{
              borderStyle: 'dashed',
              borderWidth: '2px',
              backgroundColor: isDragOver ? '#f0f7ff' : '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e.target.files[0])}
              accept=".csv,.txt"
              style={{ display: 'none' }}
            />
            <div className="mb-2">
              <FaFileCsv size={48} className={file ? 'text-success' : 'text-primary opacity-75'} />
            </div>
            {file ? (
              <div>
                <p className="fw-bold mb-1 text-success">{file.name}</p>
                <p className="text-muted small mb-0">{(file.size / 1024).toFixed(1)} KB — Ready to upload</p>
                <span className="badge bg-light text-dark border mt-2">Click to choose another file</span>
              </div>
            ) : (
              <div>
                <p className="fw-bold mb-1">Drag and drop your attendance CSV file here</p>
                <p className="text-muted small mb-2">Supports machine biometric logs (.csv, .txt)</p>
                <Button variant="outline-primary" size="sm" className="px-3">
                  Browse Files
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-3">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Uploading and analyzing punches...</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar animated now={progress} variant="primary" />
          </div>
        )}

        {/* Sample Template & Specifications */}
        <div className="card bg-light border-0 p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-bold text-secondary">
              Expected CSV Format (Biometric Machine Log):
            </span>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="d-flex align-items-center gap-1"
              onClick={handleDownloadSample}
            >
              <FaDownload size={12} />
              <span>Download Sample CSV</span>
            </Button>
          </div>
          <div className="table-responsive">
            <Table size="sm" bordered className="bg-white small mb-0 text-nowrap" style={{ fontSize: '11px' }}>
              <thead className="table-light">
                <tr>
                  <th>sName</th>
                  <th>sJobNo</th>
                  <th>sCard</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>IN/OUT</th>
                  <th>AttendanceStatus</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>'Manoj Sharma'</td>
                  <td>'1'</td>
                  <td>'NULL'</td>
                  <td>08-08-2026</td>
                  <td>14:37:22</td>
                  <td>'NULL'</td>
                  <td>checkIn</td>
                </tr>
                <tr>
                  <td>'Alok Kumar'</td>
                  <td>'PT2025080101'</td>
                  <td>'NULL'</td>
                  <td>10-08-2026</td>
                  <td>08:55:57</td>
                  <td>'NULL'</td>
                  <td>checkIn</td>
                </tr>
                <tr>
                  <td>'Komal Kushawaha'</td>
                  <td>'PT2026080102'</td>
                  <td>'NULL'</td>
                  <td>10-08-2026</td>
                  <td>18:16:25</td>
                  <td>'NULL'</td>
                  <td>checkOut</td>
                </tr>
              </tbody>
            </Table>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top">
        <Button variant="secondary" onClick={handleClose}>
          {uploadResult ? 'Close' : 'Cancel'}
        </Button>
        {!uploadResult ? (
          <Button 
            variant="primary" 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="d-flex align-items-center gap-2"
          >
            <FaUpload />
            <span>{uploading ? 'Processing...' : 'Upload & Process CSV'}</span>
          </Button>
        ) : (
          <Button 
            variant="success" 
            onClick={handleClose}
            className="d-flex align-items-center gap-2"
          >
            <FaCheckCircle />
            <span>View Attendance Panel</span>
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AttendanceUploadModal;
