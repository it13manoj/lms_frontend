import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Table, Button, Badge, Modal, Form, 
  Spinner, Alert, InputGroup, ButtonGroup 
} from 'react-bootstrap';
import { 
  FaFileAlt, FaPlus, FaPrint, FaSearch, FaFilter, 
  FaTrash, FaEdit, FaEye, FaUserTie, FaCheckCircle, 
  FaBuilding, FaAward, FaCalendarAlt, FaMoneyBillWave,
  FaColumns, FaDesktop 
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
  status: 'issued'
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

  // Create / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [generateViewMode, setGenerateViewMode] = useState('split'); // 'split' | 'form' | 'preview'
  const [generateZoom, setGenerateZoom] = useState(0.78);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [previewModalZoom, setPreviewModalZoom] = useState(1.0);

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
      letter_type: type
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
      status: letter.status || 'issued'
    });
    setShowFormModal(true);
  };

  // Submit Form (Create / Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.candidate_name || !formData.position || !formData.joining_date) {
      toast.error('Please enter candidate name, position, and joining date');
      return;
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
          // Directly open preview for the newly generated letter
          setPreviewLetter(res.data);
          setShowPreviewModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to save letter:', err);
      toast.error(err.response?.data?.message || 'Failed to save letter');
    } finally {
      setSubmitting(false);
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
      }
    } catch (err) {
      toast.error('Failed to delete letter');
    }
  };

  // Print Action
  const handlePrintLetter = () => {
    window.print();
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
            Generate, customize, and issue official Offer Letters, Joining Letters, and Experience Certificates.
          </p>
        </div>

        <div className="d-flex gap-2">
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

      {/* Filter Tabs and Search Toolbar */}
      <Card className="letter-table-card mb-4 no-print">
        <Card.Body className="p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            {/* Filter Tabs */}
            <div className="btn-group btn-group-sm">
              <Button 
                variant={selectedTypeFilter === 'all' ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedTypeFilter('all')}
              >
                All Letters
              </Button>
              <Button 
                variant={selectedTypeFilter === 'offer' ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedTypeFilter('offer')}
              >
                Offer Letters
              </Button>
              <Button 
                variant={selectedTypeFilter === 'joining' ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedTypeFilter('joining')}
              >
                Joining Letters
              </Button>
              <Button 
                variant={selectedTypeFilter === 'experience' ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedTypeFilter('experience')}
              >
                Experience Certificates
              </Button>
            </div>

            {/* Search Input */}
            <Form onSubmit={handleSearchSubmit} className="d-flex gap-2" style={{ maxWidth: '350px' }}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
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
                    <th>Joining Date</th>
                    <th>Compensation (CTC)</th>
                    <th>Issued Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {letters.map((letter) => (
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
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            title="Preview and Print Letter"
                            className="p-1 px-2"
                            onClick={() => {
                              setPreviewLetter(letter);
                              setShowPreviewModal(true);
                            }}
                          >
                            <FaEye size={12} className="me-1" />
                            <span>View</span>
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            title="Edit Letter Data"
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
                  ))}
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
        backdrop="static"
      >
        <Form onSubmit={handleFormSubmit} className="d-flex flex-column h-100">
          <Modal.Header closeButton className="py-2 px-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between w-100 gap-2 me-3">
              <div>
                <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2 mb-0">
                  <FaFileAlt className="text-primary" />
                  <span>{editingLetterId ? 'Edit Letter Details' : 'Generate Official Dynamic Letter'}</span>
                </Modal.Title>
                <div className="text-muted small" style={{ fontSize: '12px' }}>
                  Real-time live content screen displays your letter dynamically as you fill out the details.
                </div>
              </div>

              {/* View Switcher: Split vs Form vs Full Content Screen */}
              <div className="d-flex align-items-center gap-2">
                <span className="small fw-semibold text-secondary d-none d-md-inline">Screen View:</span>
                <ButtonGroup size="sm">
                  <Button 
                    variant={generateViewMode === 'split' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('split')}
                    title="Form and Live Letter Content side by side"
                    className="d-flex align-items-center gap-1"
                  >
                    <FaColumns size={12} />
                    <span>Split Screen</span>
                  </Button>
                  <Button 
                    variant={generateViewMode === 'form' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('form')}
                    title="Form Only"
                    className="d-flex align-items-center gap-1"
                  >
                    <FaEdit size={12} />
                    <span>Form Only</span>
                  </Button>
                  <Button 
                    variant={generateViewMode === 'preview' ? 'primary' : 'outline-secondary'}
                    onClick={() => setGenerateViewMode('preview')}
                    title="Content Screen Only"
                    className="d-flex align-items-center gap-1"
                  >
                    <FaDesktop size={12} />
                    <span>Content Screen</span>
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="p-0">
            <Row className="g-0 m-0">
              {(generateViewMode === 'split' || generateViewMode === 'form') && (
                <Col 
                  xs={12} 
                  lg={generateViewMode === 'split' ? 5 : 12}
                  className="letter-form-column"
                >
            {/* Letter Type Selection */}
            <div className="mb-3 p-3 bg-light rounded border">
              <Form.Label className="fw-semibold small text-uppercase text-secondary mb-2">
                Step 1: Choose Letter Type
              </Form.Label>
              <div className="d-flex gap-3">
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
                  label="Joining & Appointment Letter"
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
            </div>

            {/* Quick Auto-fill from Existing Employee */}
            <div className="mb-3">
              <Form.Label className="small fw-semibold text-muted">
                Quick Select Registered Employee (Auto-Fills Details):
              </Form.Label>
              <Form.Select 
                value={formData.employee_id} 
                onChange={(e) => handleSelectEmployee(e.target.value)}
              >
                <option value="">-- Or enter external candidate below --</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id || emp.id}) - {emp.position || emp.department}
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* Candidate & Position Fields */}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Candidate / Employee Name *</Form.Label>
                  <Form.Control 
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
                  <Form.Label className="small fw-semibold">Designation / Position *</Form.Label>
                  <Form.Control 
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
                    type="text" 
                    placeholder="e.g. Technology & Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Candidate Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="candidate@example.com"
                    value={formData.candidate_email}
                    onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Candidate Phone</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="+91 9876543210"
                    value={formData.candidate_phone}
                    onChange={(e) => setFormData({ ...formData, candidate_phone: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Joining Date *</Form.Label>
                  <Form.Control 
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
                      type="date" 
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              ) : (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Annual Compensation (CTC)</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="e.g. ₹1.2 LPA or ₹3,60,000"
                      value={formData.annual_ctc}
                      onChange={(e) => setFormData({ ...formData, annual_ctc: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              )}

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Work / Office Location</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. Buxar, Bihar (802101)"
                    value={formData.work_location}
                    onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Letter Issue Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Candidate Residential Address</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g. Pushtakalya Road, Buxar, Bihar, 802101"
                    value={formData.candidate_address}
                    onChange={(e) => setFormData({ ...formData, candidate_address: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Signatory Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.signatory_name}
                    onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Signatory Title</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.signatory_title}
                    onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Special Terms or Custom Note (Optional)</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={2}
                    placeholder="Optional additional clauses, probation specifications, or custom remarks..."
                    value={formData.custom_terms}
                    onChange={(e) => setFormData({ ...formData, custom_terms: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
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

                  <div className="letter-preview-scroll-area">
                    <div 
                      className="letter-zoom-viewport"
                      style={{ 
                        transform: `scale(${generateZoom})`,
                        marginBottom: generateZoom < 1 ? `-${Math.round((1 - generateZoom) * 1150)}px` : '0px'
                      }}
                    >
                      {renderLetterTemplate({
                        ...formData,
                        reference_no: formData.reference_no || (
                          formData.letter_type === 'joining' 
                            ? `PT/JL/${new Date().getFullYear()}/DRAFT` 
                            : formData.letter_type === 'experience'
                            ? `PT/EXP/${new Date().getFullYear()}/DRAFT`
                            : `PT/OL/${new Date().getFullYear()}/DRAFT`
                        )
                      })}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Modal.Body>

          <Modal.Footer className="bg-white border-top py-2 px-4">
            <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
              <div className="text-muted small">
                {formData.letter_type === 'offer' && 'Standard ParakshTech Offer Letter'}
                {formData.letter_type === 'joining' && 'Official Appointment & Joining Letter'}
                {formData.letter_type === 'experience' && 'Work Experience & Relieving Certificate'}
              </div>
              <div className="d-flex gap-2">
                <Button variant="secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    editingLetterId ? 'Save Changes' : 'Generate & Issue Letter'
                  )}
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* FULL PREVIEW & PRINT MODAL */}
      <Modal 
        show={showPreviewModal} 
        onHide={() => setShowPreviewModal(false)} 
        dialogClassName="letter-preview-modal"
        fullscreen="lg-down"
        backdrop="static"
      >
        <Modal.Header closeButton className="no-print bg-white border-bottom py-2 px-3">
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 mb-0">
            <span>{previewLetter?.reference_no}</span>
            <Badge bg="secondary" className="fw-normal">
              {previewLetter?.letter_type?.toUpperCase()}
            </Badge>
          </Modal.Title>
          <div className="ms-auto me-3 d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-1 me-2">
              <span className="text-secondary small me-1">Scale:</span>
              {[0.75, 0.85, 1.0, 1.1].map(z => (
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
            <Button variant="success" size="sm" onClick={handlePrintLetter} className="d-flex align-items-center gap-1 shadow-sm">
              <FaPrint size={13} />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body className="p-0 bg-secondary bg-opacity-10 d-flex flex-column align-items-center">
          <div 
            className="letter-zoom-viewport py-3"
            style={{
              transform: `scale(${previewModalZoom})`,
              marginBottom: previewModalZoom < 1 ? `-${Math.round((1 - previewModalZoom) * 1150)}px` : '0px'
            }}
          >
            <div className="letter-preview-print-area">
              {renderLetterTemplate(previewLetter)}
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

