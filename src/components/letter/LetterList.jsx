import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Table, Button, Badge, Modal, Form, 
  Spinner, Alert, InputGroup, ButtonGroup 
} from 'react-bootstrap';
import { 
  FaFileAlt, FaPlus, FaPrint, FaSearch, FaFilter, 
  FaTrash, FaEdit, FaEye, FaUserTie, FaCheckCircle, 
  FaBuilding, FaAward, FaCalendarAlt, FaMoneyBillWave,
  FaColumns, FaDesktop, FaTimes, FaLock, FaKey,
  FaEyeSlash, FaShieldAlt, FaPen, FaExclamationTriangle,
  FaSave, FaUser, FaBriefcase, FaMapMarkerAlt, FaFileSignature
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import letterService from '../../services/letterService';
import api from '../../services/api';
import OfferLetter from './OfferLetter';
import JoiningLetter from './JoiningLetter';
import ExperienceCertificate from './ExprienceLetter';
import './Letters.css';

const INITIAL_FORM_STATE = {
  letter_type: 'offer',
  employee_id: '',
  candidate_name: '',
  candidate_email: '',
  candidate_phone: '',
  candidate_address: 'Buxar, Bihar, 802101',
  position: 'UI Designer',
  department: 'Technology & Engineering',
  joining_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  annual_ctc: '₹1.2 LPA',
  work_location: 'Buxar, Bihar (802101)',
  issue_date: new Date().toISOString().slice(0, 10),
  signatory_name: 'Authorized Signatory',
  signatory_title: 'For ParakshTech LLP',
  custom_terms: '',
  status: 'issued',
  include_signature: false,
  include_stamp: false,
  security_pin: ''
};

export default function LetterList({ defaultType = 'all' }) {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(defaultType);
  const [stats, setStats] = useState({ total: 0, offer: 0, joining: 0, experience: 0 });

  // Registered employees list for quick dropdown selection
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // Create / Edit Full Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [generateViewMode, setGenerateViewMode] = useState('split'); // 'split' | 'form' | 'preview'
  const [generateZoom, setGenerateZoom] = useState(0.78);
  const [showFormPin, setShowFormPin] = useState(false);

  // Preview & Live Editable Details Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [previewFormData, setPreviewFormData] = useState(null);
  const [previewViewMode, setPreviewViewMode] = useState('split'); // 'split' | 'preview' | 'details'
  const [previewModalZoom, setPreviewModalZoom] = useState(0.85);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewFormPin, setPreviewFormPin] = useState(false);

  // Security PIN Configuration Modal State
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinCurrent, setShowPinCurrent] = useState(false);
  const [showPinNew, setShowPinNew] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  // Quick Authorize Modal State (for existing letters)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLetterTarget, setAuthLetterTarget] = useState(null);
  const [authPin, setAuthPin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPin, setShowAuthPin] = useState(false);

  // Check Security PIN status
  const checkPinStatus = async () => {
    try {
      const res = await letterService.getPinStatus();
      if (res && res.success && res.data) {
        setIsPinConfigured(Boolean(res.data.isConfigured));
      }
    } catch (err) {
      console.warn('Could not check Security PIN status:', err);
    }
  };

  // Load Letters
  const loadLetters = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        letter_type: selectedTypeFilter,
        search: search.trim()
      };
      const res = await letterService.getLetters(params);
      if (res.success) {
        setLetters(res.data.letters || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load letters:', err);
      setError('Unable to load letters list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load registered employee dropdown for auto-filling
  const loadEmployeesDropdown = async () => {
    try {
      const res = await api.get('/employees/dropdown');
      if (res.data?.success) {
        setEmployeeOptions(res.data.data || []);
      }
    } catch (err) {
      console.warn('Could not load employees dropdown for letter auto-fill:', err);
    }
  };

  useEffect(() => {
    loadLetters();
    loadEmployeesDropdown();
    checkPinStatus();
  }, [selectedTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLetters();
  };

  // Handle Employee Dropdown selection to auto-fill candidate data
  const handleSelectEmployee = (empId) => {
    if (!empId) {
      setFormData(prev => ({ ...prev, employee_id: '' }));
      return;
    }
    const emp = employeeOptions.find(e => String(e.id) === String(empId));
    if (emp) {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      setFormData(prev => ({
        ...prev,
        employee_id: emp.id,
        candidate_name: fullName || prev.candidate_name,
        candidate_email: emp.email || prev.candidate_email,
        candidate_phone: emp.phone || prev.candidate_phone,
        position: emp.position || emp.designation || prev.position,
        department: emp.department || prev.department,
        joining_date: emp.joining_date ? emp.joining_date.slice(0, 10) : prev.joining_date,
        candidate_address: emp.address || emp.city ? `${emp.address || ''} ${emp.city || ''}`.trim() : prev.candidate_address
      }));
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (type = 'offer') => {
    setEditingLetterId(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      letter_type: type,
      include_signature: false,
      include_stamp: false,
      security_pin: ''
    });
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (letter) => {
    setEditingLetterId(letter.id);
    setFormData({
      letter_type: letter.letter_type,
      employee_id: letter.employee_id || '',
      candidate_name: letter.candidate_name || '',
      candidate_email: letter.candidate_email || '',
      candidate_phone: letter.candidate_phone || '',
      candidate_address: letter.candidate_address || 'Buxar, Bihar, 802101',
      position: letter.position || '',
      department: letter.department || '',
      joining_date: letter.joining_date ? letter.joining_date.slice(0, 10) : '',
      end_date: letter.end_date ? letter.end_date.slice(0, 10) : '',
      annual_ctc: letter.annual_ctc || '₹1.2 LPA',
      work_location: letter.work_location || 'Buxar, Bihar (802101)',
      issue_date: letter.issue_date ? letter.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      signatory_name: letter.signatory_name || 'Authorized Signatory',
      signatory_title: letter.signatory_title || 'For ParakshTech LLP',
      custom_terms: letter.custom_terms || '',
      status: letter.status || 'issued',
      include_signature: Boolean(letter.include_signature),
      include_stamp: Boolean(letter.include_stamp),
      security_pin: ''
    });
    setShowFormModal(true);
  };

  // Open Preview & Live Editable Details Modal
  const handleOpenPreview = (letter, initialMode = 'split') => {
    setPreviewLetter(letter);
    setPreviewFormData({
      ...letter,
      candidate_name: letter.candidate_name || '',
      candidate_email: letter.candidate_email || '',
      candidate_phone: letter.candidate_phone || '',
      candidate_address: letter.candidate_address || 'Buxar, Bihar, 802101',
      position: letter.position || '',
      department: letter.department || '',
      joining_date: letter.joining_date ? letter.joining_date.slice(0, 10) : '',
      end_date: letter.end_date ? letter.end_date.slice(0, 10) : '',
      annual_ctc: letter.annual_ctc || '₹1.2 LPA',
      work_location: letter.work_location || 'Buxar, Bihar (802101)',
      issue_date: letter.issue_date ? letter.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      signatory_name: letter.signatory_name || 'Authorized Signatory',
      signatory_title: letter.signatory_title || 'For ParakshTech LLP',
      custom_terms: letter.custom_terms || '',
      include_signature: Boolean(letter.include_signature),
      include_stamp: Boolean(letter.include_stamp),
      security_pin: ''
    });
    setPreviewViewMode(initialMode);
    setShowPreviewModal(true);
  };

  // Save changes from Preview Editable Details section
  const handleSavePreviewDetails = async (e) => {
    if (e) e.preventDefault();
    if (!previewFormData || !previewLetter) return;

    if (!previewFormData.candidate_name || !previewFormData.position || !previewFormData.joining_date) {
      toast.error('Candidate name, position, and joining date are required');
      return;
    }

    const wantSignature = Boolean(previewFormData.include_signature || previewFormData.include_stamp);
    const isNewlyEnabling = wantSignature && !previewLetter.include_signature;
    if (isNewlyEnabling && !previewFormData.security_pin) {
      toast.error('Security PIN is required to authorize official stamp and signature');
      return;
    }

    try {
      setPreviewSaving(true);
      const res = await letterService.updateLetter(previewLetter.id, previewFormData);
      if (res.success) {
        toast.success('Letter details updated successfully');
        setPreviewLetter(res.data);
        setPreviewFormData({
          ...res.data,
          joining_date: res.data.joining_date ? res.data.joining_date.slice(0, 10) : '',
          end_date: res.data.end_date ? res.data.end_date.slice(0, 10) : '',
          issue_date: res.data.issue_date ? res.data.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          include_signature: Boolean(res.data.include_signature),
          include_stamp: Boolean(res.data.include_stamp),
          security_pin: ''
        });
        loadLetters();
      }
    } catch (err) {
      console.error('Failed to update letter details:', err);
      toast.error(err.response?.data?.message || 'Failed to update letter details');
    } finally {
      setPreviewSaving(false);
    }
  };

  // Submit Form (Create / Update from full modal)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.candidate_name || !formData.position || !formData.joining_date) {
      toast.error('Please enter candidate name, position, and joining date');
      return;
    }

    const wantSignature = Boolean(formData.include_signature || formData.include_stamp);
    if (wantSignature) {
      if (!isPinConfigured) {
        toast.error('Security PIN has not been configured yet. Please configure the Security PIN first.');
        setShowPinModal(true);
        return;
      }
      
      const isNewlyEnabling = editingLetterId 
        ? (!letters.find(l => l.id === editingLetterId)?.include_signature && formData.include_signature)
        : true;

      if (isNewlyEnabling && !formData.security_pin) {
        toast.error('Please enter your Security PIN to authorize digital stamp and signature');
        return;
      }
    }

    try {
      setSubmitting(true);
      if (editingLetterId) {
        const res = await letterService.updateLetter(editingLetterId, formData);
        if (res.success) {
          toast.success('Letter updated successfully');
          setShowFormModal(false);
          loadLetters();
        }
      } else {
        const res = await letterService.createLetter(formData);
        if (res.success) {
          toast.success('Letter generated successfully');
          setShowFormModal(false);
          loadLetters();
          handleOpenPreview(res.data, 'split');
        }
      }
    } catch (err) {
      console.error('Failed to save letter:', err);
      toast.error(err.response?.data?.message || 'Failed to save letter');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Security PIN Configuration
  const handleConfigurePinSubmit = async (e) => {
    e.preventDefault();
    const newPinTrimmed = (pinForm.newPin || '').trim();
    if (newPinTrimmed.length < 4 || newPinTrimmed.length > 8) {
      toast.error('New PIN must be between 4 and 8 digits');
      return;
    }
    if (newPinTrimmed !== (pinForm.confirmPin || '').trim()) {
      toast.error('New PIN and Confirm PIN do not match');
      return;
    }
    if (isPinConfigured && !pinForm.currentPin) {
      toast.error('Please enter your Current Security PIN');
      return;
    }

    try {
      setPinLoading(true);
      const res = await letterService.configurePin({
        currentPin: pinForm.currentPin,
        newPin: newPinTrimmed
      });
      if (res.success) {
        toast.success(res.message || 'Security PIN configured successfully');
        setIsPinConfigured(true);
        setShowPinModal(false);
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      }
    } catch (err) {
      console.error('Failed to configure PIN:', err);
      toast.error(err.response?.data?.message || 'Failed to configure Security PIN');
    } finally {
      setPinLoading(false);
    }
  };

  // Open Quick Authorize Modal
  const handleOpenAuthModal = (letter) => {
    if (!isPinConfigured) {
      toast.info('Security PIN is not configured yet. Please configure it first.');
      setShowPinModal(true);
      return;
    }
    setAuthLetterTarget(letter);
    setAuthPin('');
    setShowAuthModal(true);
  };

  // Submit Quick Authorize
  const handleAuthorizeSubmit = async (e) => {
    e.preventDefault();
    if (!authPin) {
      toast.error('Please enter Security PIN');
      return;
    }
    if (!authLetterTarget) return;

    try {
      setAuthLoading(true);
      const res = await letterService.authorizeSignature(authLetterTarget.id, {
        security_pin: authPin,
        enable: true
      });
      if (res.success) {
        toast.success('Official stamp and signature authorized successfully!');
        setShowAuthModal(false);
        setAuthPin('');
        loadLetters();
        if (previewLetter && previewLetter.id === authLetterTarget.id) {
          setPreviewLetter(res.data);
          if (previewFormData) {
            setPreviewFormData(prev => ({
              ...prev,
              include_signature: true,
              include_stamp: true
            }));
          }
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authorization failed: Invalid Security PIN');
    } finally {
      setAuthLoading(false);
    }
  };

  // Revoke Authorization
  const handleRevokeAuth = async (letter) => {
    if (!window.confirm(`Revoke official stamp and signature from ${letter.reference_no}?`)) return;
    try {
      const res = await letterService.authorizeSignature(letter.id, {
        enable: false
      });
      if (res.success) {
        toast.success('Stamp and signature revoked from letter');
        loadLetters();
        if (previewLetter && previewLetter.id === letter.id) {
          setPreviewLetter(res.data);
          if (previewFormData) {
            setPreviewFormData(prev => ({
              ...prev,
              include_signature: false,
              include_stamp: false
            }));
          }
        }
      }
    } catch (err) {
      toast.error('Failed to revoke signature');
    }
  };

  // Delete Letter
  const handleDeleteLetter = async (id, refNo) => {
    if (!window.confirm(`Are you sure you want to delete letter ${refNo}?`)) return;
    try {
      const res = await letterService.deleteLetter(id);
      if (res.success) {
        toast.success('Letter deleted successfully');
        loadLetters();
        if (previewLetter && previewLetter.id === id) {
          setShowPreviewModal(false);
        }
      }
    } catch (err) {
      toast.error('Failed to delete letter');
    }
  };

  // Print Action - Isolated iframe print with full fidelity
  const handlePrintLetter = () => {
    const printArea = document.querySelector('.letter-preview-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const oldIframe = document.getElementById('letter-print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'letter-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    pri.document.open();
    pri.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${previewLetter?.reference_no || 'Document'} - ${previewLetter?.candidate_name || 'Letter'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-letter-container {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              display: flex !important;
              justify-content: center !important;
              width: 210mm !important;
              min-height: 297mm !important;
            }
            .printable-letter-container > div {
              box-shadow: none !important;
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
      </html>
    `);
    pri.document.close();

    const doPrint = () => {
      try {
        pri.focus();
        pri.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      }
      setTimeout(() => {
        const frame = document.getElementById('letter-print-iframe');
        if (frame) frame.remove();
      }, 2000);
    };

    const imgs = pri.document.images;
    if (!imgs || imgs.length === 0) {
      setTimeout(doPrint, 250);
    } else {
      let loaded = 0;
      let completed = false;
      const onImageLoaded = () => {
        loaded++;
        if (loaded >= imgs.length && !completed) {
          completed = true;
          setTimeout(doPrint, 250);
        }
      };
      for (let i = 0; i < imgs.length; i++) {
        if (imgs[i].complete) {
          loaded++;
        } else {
          imgs[i].onload = onImageLoaded;
          imgs[i].onerror = onImageLoaded;
        }
      }
      if (loaded >= imgs.length && !completed) {
        completed = true;
        setTimeout(doPrint, 250);
      } else {
        setTimeout(() => {
          if (!completed) {
            completed = true;
            doPrint();
          }
        }, 1200);
      }
    }
  };

  // Render Preview component based on letter_type
  const renderLetterTemplate = (letter) => {
    if (!letter) return null;
    switch (letter.letter_type) {
      case 'joining':
        return <JoiningLetter data={letter} />;
      case 'experience':
        return <ExperienceCertificate data={letter} />;
      case 'offer':
      default:
        return <OfferLetter data={letter} />;
    }
  };

  return (
    <div className="letter-management-container">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 no-print">
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2 text-dark">
            <FaFileAlt className="text-primary" />
            <span>Letters & Certificates</span>
          </h3>
          <p className="text-muted mb-0 small">
            Generate, customize, and issue official Offer Letters, Joining Letters, and Experience Certificates with live editable details & Security PIN authorization.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {/* Security PIN Settings Button */}
          <Button 
            variant={isPinConfigured ? "outline-primary" : "outline-warning"} 
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() => {
              setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
              setShowPinModal(true);
            }}
          >
            <FaKey size={13} />
            <span>{isPinConfigured ? 'Change Security PIN' : 'Configure Security PIN'}</span>
          </Button>

          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleOpenCreateModal('offer')}
          >
            <FaPlus size={13} />
            <span>Generate New Letter</span>
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <Row className="g-3 mb-4 no-print">
        <Col xs={12} sm={6} md={3}>
          <Card className="letters-stat-card bg-white p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block">Total Generated</span>
                <h4 className="fw-bold mb-0 text-dark">{stats.total}</h4>
              </div>
              <div className="p-3 bg-light rounded-circle text-primary">
                <FaFileAlt size={20} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <Card className="letters-stat-card bg-white p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block">Offer Letters</span>
                <h4 className="fw-bold mb-0 text-danger">{stats.offer}</h4>
              </div>
              <div className="p-3 bg-danger bg-opacity-10 rounded-circle text-danger">
                <FaAward size={20} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <Card className="letters-stat-card bg-white p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block">Joining Letters</span>
                <h4 className="fw-bold mb-0 text-primary">{stats.joining}</h4>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 rounded-circle text-primary">
                <FaBuilding size={20} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={3}>
          <Card className="letters-stat-card bg-white p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small d-block">Experience Letters</span>
                <h4 className="fw-bold mb-0 text-purple" style={{ color: '#6b21a8' }}>{stats.experience}</h4>
              </div>
              <div className="p-3 bg-opacity-10 rounded-circle" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
                <FaUserTie size={20} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm mb-4 no-print">
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex flex-wrap gap-2">
              <Button 
                variant={selectedTypeFilter === 'all' ? 'primary' : 'outline-secondary'} 
                size="sm"
                onClick={() => setSelectedTypeFilter('all')}
              >
                All Documents
              </Button>
              <Button 
                variant={selectedTypeFilter === 'offer' ? 'danger' : 'outline-secondary'} 
                size="sm"
                onClick={() => setSelectedTypeFilter('offer')}
              >
                Offer Letters
              </Button>
              <Button 
                variant={selectedTypeFilter === 'joining' ? 'primary' : 'outline-secondary'} 
                size="sm"
                onClick={() => setSelectedTypeFilter('joining')}
              >
                Joining Letters
              </Button>
              <Button 
                variant={selectedTypeFilter === 'experience' ? 'warning' : 'outline-secondary'} 
                size="sm"
                onClick={() => setSelectedTypeFilter('experience')}
              >
                Experience Certificates
              </Button>
            </div>

            <Form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <InputGroup size="sm" style={{ width: '280px' }}>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search candidate, role, ref no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button variant="outline-primary" type="submit">
                  Search
                </Button>
              </InputGroup>
            </Form>
          </div>
        </Card.Body>
      </Card>

      {/* Main Table View */}
      <Card className="letter-table-card no-print">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Loading letters...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">{error}</Alert>
          ) : letters.length === 0 ? (
            <div className="text-center py-5">
              <FaFileAlt size={36} className="text-secondary opacity-50 mb-2" />
              <h5>No Letters Found</h5>
              <p className="text-muted small">Generate your first official letter or adjust search filters.</p>
              <Button variant="primary" size="sm" onClick={() => handleOpenCreateModal('offer')}>
                Generate Offer Letter
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-uppercase text-secondary">
                    <th>Ref No</th>
                    <th>Candidate / Employee</th>
                    <th>Position / Dept</th>
                    <th>Letter Type</th>
                    <th>Stamp & Signature</th>
                    <th>Joining Date</th>
                    <th>Compensation (CTC)</th>
                    <th>Issued Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {letters.map((letter) => {
                    const isSigned = Boolean(letter.include_signature && letter.include_stamp);
                    return (
                      <tr key={letter.id}>
                        <td className="fw-semibold text-primary small">
                          {letter.reference_no}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{letter.candidate_name}</div>
                          {letter.candidate_email && (
                            <div className="text-muted small" style={{ fontSize: '11px' }}>{letter.candidate_email}</div>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold">{letter.position}</div>
                          <div className="text-muted small" style={{ fontSize: '11px' }}>{letter.department || 'Technology'}</div>
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 rounded-pill ${
                            letter.letter_type === 'joining' 
                              ? 'letter-type-badge-joining' 
                              : (letter.letter_type === 'experience' 
                                ? 'letter-type-badge-experience' 
                                : 'letter-type-badge-offer')
                          }`}>
                            {letter.letter_type === 'joining' ? 'Joining Letter' : (letter.letter_type === 'experience' ? 'Experience Certificate' : 'Offer Letter')}
                          </span>
                        </td>
                        <td>
                          {isSigned ? (
                            <Badge bg="success" className="d-inline-flex align-items-center gap-1 px-2 py-1">
                              <FaShieldAlt size={10} />
                              <span>Signed & Stamped</span>
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="d-inline-flex align-items-center gap-1 px-2 py-1">
                              <FaPen size={9} />
                              <span>Manual / Unsigned</span>
                            </Badge>
                          )}
                        </td>
                        <td className="small text-muted">
                          {letter.joining_date}
                        </td>
                        <td className="small fw-semibold text-dark">
                          {letter.annual_ctc || '—'}
                        </td>
                        <td className="small text-muted">
                          {letter.issue_date}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {/* Quick Authorize / Revoke Action */}
                            {isSigned ? (
                              <Button 
                                variant="outline-warning" 
                                size="sm" 
                                title="Revoke Stamp & Signature"
                                className="p-1 px-2"
                                onClick={() => handleRevokeAuth(letter)}
                              >
                                <FaLock size={12} className="text-warning" />
                              </Button>
                            ) : (
                              <Button 
                                variant="outline-success" 
                                size="sm" 
                                title="Authorize Stamp & Signature with PIN"
                                className="p-1 px-2"
                                onClick={() => handleOpenAuthModal(letter)}
                              >
                                <FaKey size={12} className="text-success" />
                              </Button>
                            )}

                            {/* View & Edit Details in Split Live Preview */}
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              title="View & Edit Letter Details"
                              className="p-1 px-2 d-flex align-items-center gap-1"
                              onClick={() => handleOpenPreview(letter, 'split')}
                            >
                              <FaEye size={12} />
                              <span>View &amp; Edit</span>
                            </Button>
                            
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              title="Full Edit Modal"
                              className="p-1 px-2"
                              onClick={() => handleOpenEditModal(letter)}
                            >
                              <FaEdit size={12} />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              title="Delete"
                              className="p-1 px-2"
                              onClick={() => handleDeleteLetter(letter.id, letter.reference_no)}
                            >
                              <FaTrash size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* CREATE / EDIT DYNAMIC MODAL WITH LIVE CONTENT SCREEN */}
      <Modal 
        show={showFormModal} 
        onHide={() => setShowFormModal(false)} 
        dialogClassName="letter-generate-modal"
        fullscreen="lg-down"
        backdrop="static"
      >
        <Form onSubmit={handleFormSubmit}>
          <Modal.Header closeButton onHide={() => setShowFormModal(false)} className="no-print">
            <div className="d-flex flex-wrap align-items-center justify-content-between w-100 me-3 gap-2">
              <div className="d-flex align-items-center gap-2">
                <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2 text-dark">
                  <FaFileAlt className="text-primary" />
                  <span>{editingLetterId ? 'Edit Letter' : 'Generate New Official Letter'}</span>
                </Modal.Title>
                <Badge bg="primary-subtle" className="text-primary border border-primary-subtle d-none d-sm-inline">
                  Editable Details Section
                </Badge>
              </div>

              {/* Layout Switcher (Split / Form / Preview) */}
              <div className="d-flex align-items-center gap-2">
                <ButtonGroup size="sm" className="d-none d-md-inline-flex">
                  <Button 
                    variant={generateViewMode === 'split' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('split')}
                    className="d-flex align-items-center gap-1"
                  >
                    <FaColumns size={12} />
                    <span>Split Screen</span>
                  </Button>
                  <Button 
                    variant={generateViewMode === 'form' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('form')}
                    className="d-flex align-items-center gap-1"
                  >
                    <FaEdit size={12} />
                    <span>Details Only</span>
                  </Button>
                  <Button 
                    variant={generateViewMode === 'preview' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('preview')}
                    className="d-flex align-items-center gap-1"
                  >
                    <FaDesktop size={12} />
                    <span>Live Preview</span>
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body className="p-0">
            <Row className="g-0">
              {/* LEFT COLUMN: EDITABLE LETTER DETAILS SECTION */}
              {(generateViewMode === 'split' || generateViewMode === 'form') && (
                <Col 
                  xs={12} 
                  lg={generateViewMode === 'split' ? 5 : 12}
                  className="letter-form-column"
                >
                  <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <FaEdit className="text-primary" />
                      <span>Editable Letter Details</span>
                    </h6>
                    <span className="text-muted small">Update any field to see live changes</span>
                  </div>

                  {/* Section 0: Document Type & Auto-fill */}
                  <div className="editable-section-card">
                    <div className="editable-section-header">
                      <FaFileAlt className="text-primary" size={13} />
                      <span>Document Type &amp; Employee Link</span>
                    </div>
                    <div className="editable-section-body">
                      <Form.Label className="small fw-bold text-muted mb-2 d-block">
                        Select Document Template:
                      </Form.Label>
                      <div className="d-flex flex-wrap gap-3 mb-3">
                        <Form.Check 
                          type="radio"
                          id="type-offer"
                          label="Offer Letter"
                          name="letter_type"
                          checked={formData.letter_type === 'offer'}
                          onChange={() => setFormData({ ...formData, letter_type: 'offer' })}
                        />
                        <Form.Check 
                          type="radio"
                          id="type-joining"
                          label="Joining Letter"
                          name="letter_type"
                          checked={formData.letter_type === 'joining'}
                          onChange={() => setFormData({ ...formData, letter_type: 'joining' })}
                        />
                        <Form.Check 
                          type="radio"
                          id="type-experience"
                          label="Experience Certificate"
                          name="letter_type"
                          checked={formData.letter_type === 'experience'}
                          onChange={() => setFormData({ ...formData, letter_type: 'experience' })}
                        />
                      </div>

                      <Form.Label className="small fw-semibold text-muted">
                        Auto-fill from Registered Employee (Optional):
                      </Form.Label>
                      <Form.Select 
                        size="sm"
                        value={formData.employee_id} 
                        onChange={(e) => handleSelectEmployee(e.target.value)}
                      >
                        <option value="">-- Or enter custom candidate details below --</option>
                        {employeeOptions.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.employee_id || emp.id}) - {emp.position || emp.department}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  </div>

                  {/* Section 1: Candidate & Contact Details */}
                  <div className="editable-section-card">
                    <div className="editable-section-header">
                      <FaUser className="text-primary" size={13} />
                      <span>1. Candidate &amp; Recipient Information</span>
                    </div>
                    <div className="editable-section-body">
                      <Row className="g-2">
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Candidate Full Name *</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="e.g. Mr. Alok Kumar"
                              value={formData.candidate_name}
                              onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Email Address</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="email" 
                              placeholder="candidate@example.com"
                              value={formData.candidate_email}
                              onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Contact Phone</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="+91 9876543210"
                              value={formData.candidate_phone}
                              onChange={(e) => setFormData({ ...formData, candidate_phone: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Residential Address</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="e.g. Pushtakalya Road, Buxar, Bihar, 802101"
                              value={formData.candidate_address}
                              onChange={(e) => setFormData({ ...formData, candidate_address: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* Section 2: Position, Department & Location */}
                  <div className="editable-section-card">
                    <div className="editable-section-header">
                      <FaBriefcase className="text-primary" size={13} />
                      <span>2. Position, Role &amp; Work Location</span>
                    </div>
                    <div className="editable-section-body">
                      <Row className="g-2">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Designation / Role *</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="e.g. UI Designer / Full Stack Developer"
                              value={formData.position}
                              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Department</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="e.g. Technology & Engineering"
                              value={formData.department}
                              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Work Location</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              placeholder="e.g. Buxar, Bihar (802101)"
                              value={formData.work_location}
                              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* Section 3: Timeline & Dates */}
                  <div className="editable-section-card">
                    <div className="editable-section-header">
                      <FaCalendarAlt className="text-primary" size={13} />
                      <span>3. Dates &amp; Timeline</span>
                    </div>
                    <div className="editable-section-body">
                      <Row className="g-2">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Joining / Commencement Date *</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="date" 
                              value={formData.joining_date}
                              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                        {formData.letter_type === 'experience' ? (
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Relieving / End Date *</Form.Label>
                              <Form.Control 
                                size="sm"
                                type="date" 
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                              />
                            </Form.Group>
                          </Col>
                        ) : (
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Annual Compensation (CTC)</Form.Label>
                              <Form.Control 
                                size="sm"
                                type="text" 
                                placeholder="e.g. ₹1.2 LPA / ₹3,50,000 PA"
                                value={formData.annual_ctc}
                                onChange={(e) => setFormData({ ...formData, annual_ctc: e.target.value })}
                              />
                            </Form.Group>
                          </Col>
                        )}
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Letter Issue Date</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="date" 
                              value={formData.issue_date}
                              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* Section 4: Signatory & Custom Terms */}
                  <div className="editable-section-card">
                    <div className="editable-section-header">
                      <FaFileSignature className="text-primary" size={13} />
                      <span>4. Signatory &amp; Custom Terms</span>
                    </div>
                    <div className="editable-section-body">
                      <Row className="g-2">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Authorized Signatory Name</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              value={formData.signatory_name}
                              onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Signatory Designation / Title</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              value={formData.signatory_title}
                              onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Custom Clauses / Remarks (Optional)</Form.Label>
                            <Form.Control 
                              size="sm"
                              as="textarea"
                              rows={2}
                              placeholder="Optional additional clauses, probation specifications, or custom remarks..."
                              value={formData.custom_terms}
                              onChange={(e) => setFormData({ ...formData, custom_terms: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* Section 5: Security & Digital Signature Authorization */}
                  <div className="editable-section-card">
                    <div className="editable-section-header justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <FaLock className="text-primary" size={13} />
                        <span>5. Official Seal &amp; Digital Signature Security</span>
                      </div>
                      {isPinConfigured ? (
                        <Badge bg="success" className="py-1 px-2 small">
                          <FaCheckCircle className="me-1" /> PIN Active
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline-danger" 
                          className="py-0 px-2 small"
                          onClick={() => setShowPinModal(true)}
                        >
                          Configure PIN
                        </Button>
                      )}
                    </div>
                    <div className="editable-section-body">
                      <Form.Check 
                        type="switch"
                        id="modal-include-signature-switch"
                        label={<span className="small fw-semibold text-secondary">Apply Official Stamp &amp; Digital Signature to this document</span>}
                        checked={Boolean(formData.include_signature && formData.include_stamp)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            include_signature: checked,
                            include_stamp: checked
                          }));
                        }}
                      />

                      {(formData.include_signature || formData.include_stamp) && (
                        <div className="mt-2 p-3 bg-light rounded border">
                          {!isPinConfigured ? (
                            <Alert variant="warning" className="py-2 px-2 mb-0 small">
                              <FaExclamationTriangle className="me-1" />
                              Security PIN is not configured yet.{' '}
                              <Button variant="link" className="p-0 small fw-bold" onClick={() => setShowPinModal(true)}>
                                Click here to set Security PIN
                              </Button>
                            </Alert>
                          ) : (
                            <Form.Group>
                              <Form.Label className="small fw-bold text-dark mb-1">
                                Enter Security PIN to Authorize Stamp &amp; Signature <span className="text-danger">*</span>
                              </Form.Label>
                              <InputGroup size="sm">
                                <InputGroup.Text><FaKey size={12} /></InputGroup.Text>
                                <Form.Control
                                  type={showFormPin ? 'text' : 'password'}
                                  maxLength={8}
                                  placeholder="4-8 digit Security PIN"
                                  value={formData.security_pin || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, security_pin: e.target.value }))}
                                />
                                <Button variant="outline-secondary" onClick={() => setShowFormPin(v => !v)}>
                                  {showFormPin ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                                </Button>
                              </InputGroup>
                              <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                                Your confidential PIN authorizes embedding the company seal and signature.
                              </Form.Text>
                            </Form.Group>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              )}

              {/* RIGHT COLUMN: LIVE CONTENT SCREEN */}
              {(generateViewMode === 'split' || generateViewMode === 'preview') && (
                <Col 
                  xs={12} 
                  lg={generateViewMode === 'split' ? 7 : 12}
                  className="letter-preview-column"
                >
                  <div className="letter-preview-toolbar">
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="success" className="d-flex align-items-center gap-1 py-1 px-2">
                        <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: '7px', height: '7px' }}></span>
                        <span>LIVE CONTENT SCREEN</span>
                      </Badge>
                      <span className="text-muted small d-none d-sm-inline">
                        Real-time A4 Letter Preview
                      </span>
                    </div>

                    {/* Zoom / Scaling Controls */}
                    <div className="d-flex align-items-center gap-1">
                      <span className="text-secondary small me-1">Scale:</span>
                      {[0.65, 0.78, 0.9, 1.0].map(z => (
                        <Button 
                          key={z}
                          variant={generateZoom === z ? 'dark' : 'outline-secondary'}
                          size="sm"
                          className="py-0 px-2"
                          style={{ fontSize: '11px', lineHeight: '18px' }}
                          onClick={() => setGenerateZoom(z)}
                        >
                          {Math.round(z * 100)}%
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="letter-preview-scroll-viewport">
                    <div 
                      className="letter-preview-scroll-wrapper"
                      style={{
                        transform: `scale(${generateZoom})`,
                        transformOrigin: 'top center',
                        marginBottom: generateZoom < 1 ? `-${Math.round((1 - generateZoom) * 1150)}px` : '0px'
                      }}
                    >
                      {renderLetterTemplate({
                        ...formData,
                        reference_no: editingLetterId 
                          ? (letters.find(l => l.id === editingLetterId)?.reference_no || 'PT/OL/2026/001')
                          : 'PT/DRAFT/2026/NEW',
                        include_stamp: Boolean(formData.include_stamp && (editingLetterId && !formData.security_pin ? formData.include_stamp : Boolean(formData.security_pin))),
                        include_signature: Boolean(formData.include_signature && (editingLetterId && !formData.security_pin ? formData.include_signature : Boolean(formData.security_pin)))
                      })}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Modal.Body>

          <Modal.Footer className="no-print bg-white border-top py-2 px-3">
            <div className="d-flex justify-content-between align-items-center w-100">
              <div className="text-muted small">
                {editingLetterId ? 'Modifying existing document' : 'Generating new official company letter'}
              </div>
              <div className="d-flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowFormModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Saving...
                    </>
                  ) : editingLetterId ? (
                    'Update Letter'
                  ) : (
                    'Generate & Finalize Letter'
                  )}
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* FULL PREVIEW & LIVE EDITABLE DETAILS MODAL */}
      <Modal 
        show={showPreviewModal} 
        onHide={() => setShowPreviewModal(false)} 
        dialogClassName={previewViewMode === 'split' ? "letter-preview-modal-split" : "letter-preview-modal"}
        fullscreen="lg-down"
        backdrop="static"
      >
        <Modal.Header closeButton onHide={() => setShowPreviewModal(false)} className="no-print bg-white border-bottom py-2 px-3">
          <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
            <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 mb-0">
              <span className="text-primary">{previewLetter?.reference_no}</span>
              <Badge 
                bg={
                  previewLetter?.letter_type === 'joining' ? 'primary' :
                  previewLetter?.letter_type === 'experience' ? 'warning' : 'danger'
                } 
                className="fw-semibold text-uppercase text-dark"
                style={{
                  backgroundColor: previewLetter?.letter_type === 'experience' ? '#f3e8ff' : undefined,
                  color: previewLetter?.letter_type === 'experience' ? '#6b21a8' : undefined,
                  border: previewLetter?.letter_type === 'experience' ? '1px solid #e9d5ff' : undefined
                }}
              >
                {previewLetter?.letter_type === 'experience' ? 'Experience Certificate' :
                 previewLetter?.letter_type === 'joining' ? 'Joining Letter' : 'Offer Letter'}
              </Badge>
            </Modal.Title>
            
            {previewLetter?.include_signature && previewLetter?.include_stamp ? (
              <Badge bg="success" className="d-flex align-items-center gap-1 py-1 px-2 small">
                <FaShieldAlt size={10} />
                <span>Signed &amp; Stamped</span>
              </Badge>
            ) : (
              <Badge bg="secondary" className="d-flex align-items-center gap-1 py-1 px-2 small">
                <FaPen size={9} />
                <span>Manual Ink Signature</span>
              </Badge>
            )}

            {/* View Mode Selector: Split Screen / Preview Only / Details Only */}
            <ButtonGroup size="sm" className="ms-2 d-none d-md-inline-flex">
              <Button 
                variant={previewViewMode === 'split' ? 'primary' : 'outline-secondary'}
                onClick={() => setPreviewViewMode('split')}
                className="d-flex align-items-center gap-1 py-1 px-2"
              >
                <FaColumns size={11} />
                <span>Split Screen</span>
              </Button>
              <Button 
                variant={previewViewMode === 'preview' ? 'primary' : 'outline-secondary'}
                onClick={() => setPreviewViewMode('preview')}
                className="d-flex align-items-center gap-1 py-1 px-2"
              >
                <FaDesktop size={11} />
                <span>Document View</span>
              </Button>
              <Button 
                variant={previewViewMode === 'details' ? 'primary' : 'outline-secondary'}
                onClick={() => setPreviewViewMode('details')}
                className="d-flex align-items-center gap-1 py-1 px-2"
              >
                <FaEdit size={11} />
                <span>Edit Details</span>
              </Button>
            </ButtonGroup>
          </div>

          <div className="d-flex align-items-center gap-2 me-2">
            {/* Quick Toggle in Preview Header */}
            {previewLetter?.include_signature && previewLetter?.include_stamp ? (
              <Button 
                variant="outline-warning" 
                size="sm" 
                onClick={() => handleRevokeAuth(previewLetter)}
                className="d-flex align-items-center gap-1 px-2"
                title="Revoke stamp and signature"
              >
                <FaLock size={11} />
                <span className="d-none d-sm-inline">Revoke Seal</span>
              </Button>
            ) : (
              <Button 
                variant="outline-success" 
                size="sm" 
                onClick={() => handleOpenAuthModal(previewLetter)}
                className="d-flex align-items-center gap-1 px-2"
                title="Authorize stamp and signature with PIN"
              >
                <FaKey size={11} />
                <span className="d-none d-sm-inline">Authorize Seal</span>
              </Button>
            )}

            {/* Save Changes button in header if in split or details mode */}
            {(previewViewMode === 'split' || previewViewMode === 'details') && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSavePreviewDetails}
                disabled={previewSaving}
                className="d-flex align-items-center gap-1 px-3 shadow-sm"
              >
                {previewSaving ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <FaSave size={12} />
                )}
                <span>Save Changes</span>
              </Button>
            )}

            {/* Zoom / Scaling Controls for Document */}
            {previewViewMode !== 'details' && (
              <div className="d-flex align-items-center gap-1 me-1 d-none d-lg-flex">
                <span className="text-secondary small me-1">Scale:</span>
                {[0.7, 0.85, 1.0].map(z => (
                  <Button 
                    key={z}
                    variant={previewModalZoom === z ? 'dark' : 'outline-secondary'}
                    size="sm"
                    className="py-0 px-2"
                    style={{ fontSize: '11px', lineHeight: '18px' }}
                    onClick={() => setPreviewModalZoom(z)}
                  >
                    {Math.round(z * 100)}%
                  </Button>
                ))}
              </div>
            )}

            <Button 
              variant="success" 
              size="sm" 
              onClick={handlePrintLetter} 
              className="d-flex align-items-center gap-1 shadow-sm px-3"
            >
              <FaPrint size={13} />
              <span>Print / Save PDF</span>
            </Button>

            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={() => setShowPreviewModal(false)}
              className="d-flex align-items-center gap-1 px-2"
              title="Close Popup"
            >
              <FaTimes size={13} />
              <span className="d-none d-sm-inline">Close</span>
            </Button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-0">
          <Row className="g-0">
            {/* EDITABLE LETTER DETAILS SECTION */}
            {(previewViewMode === 'split' || previewViewMode === 'details') && previewFormData && (
              <Col 
                xs={12} 
                lg={previewViewMode === 'split' ? 5 : 12}
                className="p-3"
                style={{ 
                  maxHeight: '84vh', 
                  overflowY: 'auto', 
                  background: '#f8fafc',
                  borderRight: previewViewMode === 'split' ? '1px solid #cbd5e1' : 'none' 
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <FaEdit className="text-primary" />
                      <span>Editable Letter Details Section</span>
                    </h6>
                    <span className="text-muted small">Edit any field below to update this document in real time</span>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSavePreviewDetails}
                    disabled={previewSaving}
                    className="d-flex align-items-center gap-1 shadow-sm"
                  >
                    {previewSaving ? <Spinner size="sm" animation="border" /> : <FaSave size={12} />}
                    <span>Save</span>
                  </Button>
                </div>

                {/* Candidate & Recipient Information */}
                <div className="editable-section-card">
                  <div className="editable-section-header">
                    <FaUser className="text-primary" size={13} />
                    <span>Candidate &amp; Recipient Information</span>
                  </div>
                  <div className="editable-section-body">
                    <Row className="g-2">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Candidate Full Name *</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.candidate_name}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, candidate_name: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Email Address</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="email" 
                            value={previewFormData.candidate_email}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, candidate_email: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Phone Number</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.candidate_phone}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, candidate_phone: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Residential Address</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.candidate_address}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, candidate_address: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* Position, Department & Location */}
                <div className="editable-section-card">
                  <div className="editable-section-header">
                    <FaBriefcase className="text-primary" size={13} />
                    <span>Position, Department &amp; Location</span>
                  </div>
                  <div className="editable-section-body">
                    <Row className="g-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Designation / Role *</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.position}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, position: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Department</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.department}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, department: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Work Location</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.work_location}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, work_location: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* Timeline & Compensation */}
                <div className="editable-section-card">
                  <div className="editable-section-header">
                    <FaCalendarAlt className="text-primary" size={13} />
                    <span>Timeline &amp; Compensation</span>
                  </div>
                  <div className="editable-section-body">
                    <Row className="g-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Joining / Commencement Date *</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="date" 
                            value={previewFormData.joining_date}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, joining_date: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      {previewLetter?.letter_type === 'experience' ? (
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Relieving / End Date</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="date" 
                              value={previewFormData.end_date}
                              onChange={(e) => setPreviewFormData({ ...previewFormData, end_date: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      ) : (
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Annual Compensation (CTC)</Form.Label>
                            <Form.Control 
                              size="sm"
                              type="text" 
                              value={previewFormData.annual_ctc}
                              onChange={(e) => setPreviewFormData({ ...previewFormData, annual_ctc: e.target.value })}
                            />
                          </Form.Group>
                        </Col>
                      )}
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Issue Date</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="date" 
                            value={previewFormData.issue_date}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, issue_date: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* Signatory & Special Terms */}
                <div className="editable-section-card">
                  <div className="editable-section-header">
                    <FaFileSignature className="text-primary" size={13} />
                    <span>Signatory &amp; Custom Terms</span>
                  </div>
                  <div className="editable-section-body">
                    <Row className="g-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Signatory Name</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.signatory_name}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, signatory_name: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Signatory Title</Form.Label>
                          <Form.Control 
                            size="sm"
                            type="text" 
                            value={previewFormData.signatory_title}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, signatory_title: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold">Custom Clauses or Remarks (Optional)</Form.Label>
                          <Form.Control 
                            size="sm"
                            as="textarea"
                            rows={2}
                            placeholder="Optional additional clauses, probation specifications, or custom remarks..."
                            value={previewFormData.custom_terms}
                            onChange={(e) => setPreviewFormData({ ...previewFormData, custom_terms: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                </div>

                {/* Digital Stamp & Signature Security */}
                <div className="editable-section-card">
                  <div className="editable-section-header justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <FaLock className="text-primary" size={13} />
                      <span>Seal &amp; Signature Authorization</span>
                    </div>
                    {isPinConfigured ? (
                      <Badge bg="success" className="py-1 px-2 small">PIN Configured</Badge>
                    ) : (
                      <Button size="sm" variant="outline-danger" className="py-0 px-2 small" onClick={() => setShowPinModal(true)}>
                        Set PIN
                      </Button>
                    )}
                  </div>
                  <div className="editable-section-body">
                    <Form.Check 
                      type="switch"
                      id="preview-include-signature-switch"
                      label={<span className="small fw-semibold text-secondary">Apply Official Stamp &amp; Digital Signature</span>}
                      checked={Boolean(previewFormData.include_signature && previewFormData.include_stamp)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPreviewFormData(prev => ({
                          ...prev,
                          include_signature: checked,
                          include_stamp: checked
                        }));
                      }}
                    />

                    {(previewFormData.include_signature || previewFormData.include_stamp) && !previewLetter?.include_signature && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark mb-1">
                            Enter Security PIN to Authorize Stamp &amp; Signature *
                          </Form.Label>
                          <InputGroup size="sm">
                            <InputGroup.Text><FaKey size={12} /></InputGroup.Text>
                            <Form.Control 
                              type={previewFormPin ? 'text' : 'password'}
                              maxLength={8}
                              placeholder="Enter Security PIN"
                              value={previewFormData.security_pin || ''}
                              onChange={(e) => setPreviewFormData(prev => ({ ...prev, security_pin: e.target.value }))}
                            />
                            <Button variant="outline-secondary" onClick={() => setPreviewFormPin(v => !v)}>
                              {previewFormPin ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                            </Button>
                          </InputGroup>
                        </Form.Group>
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-grid mt-3">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSavePreviewDetails}
                    disabled={previewSaving}
                    className="d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                  >
                    {previewSaving ? <Spinner size="sm" animation="border" /> : <FaSave size={13} />}
                    <span className="fw-semibold">Save Letter Details</span>
                  </Button>
                </div>
              </Col>
            )}

            {/* REAL-TIME PREVIEW DOCUMENT DISPLAY */}
            {previewViewMode !== 'details' && (
              <Col 
                xs={12} 
                lg={previewViewMode === 'split' ? 7 : 12}
                className="d-flex flex-column align-items-center"
                style={{ 
                  background: '#cbd5e1', 
                  maxHeight: '84vh', 
                  overflowY: 'auto',
                  overflowX: 'auto',
                  padding: '24px 10px 40px' 
                }}
              >
                <div 
                  className="letter-zoom-viewport"
                  style={{
                    transform: `scale(${previewModalZoom})`,
                    marginBottom: previewModalZoom < 1 ? `-${Math.round((1 - previewModalZoom) * 1150)}px` : '0px'
                  }}
                >
                  <div className="letter-preview-print-area">
                    {renderLetterTemplate(previewFormData || previewLetter)}
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer className="no-print bg-white border-top py-2 px-3 d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            <span className="fw-semibold text-dark">Document:</span> A4 Sheet (210mm × 297mm) • {previewFormData?.candidate_name || previewLetter?.candidate_name || 'Official Letter'}
          </div>
          <div className="d-flex align-items-center gap-2">
            {(previewViewMode === 'split' || previewViewMode === 'details') && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSavePreviewDetails}
                disabled={previewSaving}
                className="d-flex align-items-center gap-1 px-3 shadow-sm"
              >
                {previewSaving ? <Spinner size="sm" animation="border" /> : <FaSave size={12} />}
                <span>Save Details</span>
              </Button>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowPreviewModal(false)}
              className="d-flex align-items-center gap-1 px-3"
            >
              <FaTimes size={13} />
              <span>Close</span>
            </Button>
            <Button 
              variant="success" 
              size="sm" 
              onClick={handlePrintLetter} 
              className="d-flex align-items-center gap-1 shadow-sm px-3"
            >
              <FaPrint size={13} />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* SECURITY PIN CONFIGURATION MODAL */}
      <Modal 
        show={showPinModal} 
        onHide={() => setShowPinModal(false)}
        centered
        backdrop="static"
      >
        <Form onSubmit={handleConfigurePinSubmit}>
          <Modal.Header closeButton onHide={() => setShowPinModal(false)}>
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2 text-dark">
              <FaKey className="text-primary" />
              <span>{isPinConfigured ? 'Change Security PIN' : 'Configure Security PIN'}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p className="text-muted small mb-3">
              The Security PIN is confidential and protects the company's official digital stamp and authorized signature. It is required whenever creating or updating letters with embedded digital seals.
            </p>

            {isPinConfigured ? (
              <Alert variant="info" className="py-2 px-3 small d-flex align-items-center gap-2">
                <FaCheckCircle className="text-success" />
                <span>Security PIN is currently active. To change it, enter your current PIN followed by a new PIN.</span>
              </Alert>
            ) : (
              <Alert variant="warning" className="py-2 px-3 small d-flex align-items-center gap-2">
                <FaExclamationTriangle className="text-warning" />
                <span>No Security PIN configured. Set a 4-8 digit confidential PIN below.</span>
              </Alert>
            )}

            {isPinConfigured && (
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Current Security PIN *</Form.Label>
                <InputGroup size="sm">
                  <InputGroup.Text><FaLock size={12} /></InputGroup.Text>
                  <Form.Control 
                    type={showPinCurrent ? "text" : "password"}
                    maxLength={8}
                    placeholder="Enter current PIN"
                    value={pinForm.currentPin}
                    onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                    required
                  />
                  <Button variant="outline-secondary" onClick={() => setShowPinCurrent(v => !v)}>
                    {showPinCurrent ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                  </Button>
                </InputGroup>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">New Security PIN (4-8 digits) *</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaKey size={12} /></InputGroup.Text>
                <Form.Control 
                  type={showPinNew ? "text" : "password"}
                  maxLength={8}
                  placeholder="Enter 4-8 digit new PIN"
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                  required
                />
                <Button variant="outline-secondary" onClick={() => setShowPinNew(v => !v)}>
                  {showPinNew ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Confirm New Security PIN *</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaKey size={12} /></InputGroup.Text>
                <Form.Control 
                  type={showPinConfirm ? "text" : "password"}
                  maxLength={8}
                  placeholder="Re-enter new PIN"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                  required
                />
                <Button variant="outline-secondary" onClick={() => setShowPinConfirm(v => !v)}>
                  {showPinConfirm ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                </Button>
              </InputGroup>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={() => setShowPinModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={pinLoading}>
              {pinLoading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              {isPinConfigured ? 'Update PIN' : 'Save Security PIN'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* QUICK AUTHORIZE MODAL FOR EXISTING LETTERS */}
      <Modal 
        show={showAuthModal} 
        onHide={() => setShowAuthModal(false)}
        centered
        size="sm"
        backdrop="static"
      >
        <Form onSubmit={handleAuthorizeSubmit}>
          <Modal.Header closeButton onHide={() => setShowAuthModal(false)}>
            <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-dark">
              <FaShieldAlt className="text-success" />
              <span>Authorize Stamp &amp; Signature</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p className="text-muted small mb-2">
              Authorize digital seal and signature for:
            </p>
            <div className="p-2 bg-light rounded mb-3 small">
              <div className="fw-bold text-dark">{authLetterTarget?.reference_no}</div>
              <div className="text-secondary">{authLetterTarget?.candidate_name} ({authLetterTarget?.position})</div>
            </div>

            <Form.Group>
              <Form.Label className="small fw-semibold">Enter Security PIN *</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaKey size={12} /></InputGroup.Text>
                <Form.Control 
                  type={showAuthPin ? "text" : "password"}
                  maxLength={8}
                  placeholder="4-8 digit Security PIN"
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value)}
                  autoFocus
                  required
                />
                <Button variant="outline-secondary" onClick={() => setShowAuthPin(v => !v)}>
                  {showAuthPin ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                </Button>
              </InputGroup>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer className="py-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAuthModal(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit" disabled={authLoading}>
              {authLoading ? <Spinner size="sm" animation="border" className="me-1" /> : null}
              Authorize
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
}
