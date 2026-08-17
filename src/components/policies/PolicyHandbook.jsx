import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaFilePdf, FaFileWord, FaFileAlt, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './PolicyHandbook.css';

const PolicyHandbook = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/policies', {
        params: { role: user?.role }
      });
      setPolicies(response.data.data || []);
    } catch (error) {
      setError('Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const getPolicyTypeIcon = (type) => {
    const icons = {
      'hr': <FaFileWord />,
      'company': <FaFilePdf />,
      'employee': <FaFileAlt />,
      'manager': <FaFileAlt />,
      'sales': <FaFileAlt />,
      'team': <FaFileAlt />
    };
    return icons[type] || <FaFileAlt />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'hr': 'primary',
      'company': 'danger',
      'employee': 'success',
      'manager': 'warning',
      'sales': 'info',
      'team': 'secondary'
    };
    return colors[category] || 'secondary';
  };

  const filteredPolicies = selectedCategory === 'all' 
    ? policies 
    : policies.filter(p => p.policy_type === selectedCategory);

  const handleAddNewPolicy = () => {
    navigate('/policies/manage');
  };

  const categories = [
    { value: 'all', label: 'All Policies' },
    { value: 'hr', label: 'HR Policies' },
    { value: 'company', label: 'Company Policies' },
    { value: 'employee', label: 'Employee Policies' },
    { value: 'manager', label: 'Manager Policies' },
    { value: 'sales', label: 'Sales Policies' },
    { value: 'team', label: 'Team Policies' }
  ];

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="policy-handbook">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Policy Handbook</h2>
        {(user?.role === 'admin' || user?.role === 'hr') && (
          <Button variant="primary" onClick={handleAddNewPolicy}>
            Add New Policy
          </Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="category-filters mb-4">
        <div className="d-flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <Row>
        {filteredPolicies.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FaFileAlt size={64} className="text-muted mb-3" />
                <h5>No policies available</h5>
                <p className="text-muted">
                  No policies found for your role or the selected category.
                </p>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          filteredPolicies.map((policy) => (
            <Col key={policy.id} md={6} lg={4} className="mb-4">
              <Card className="policy-card h-100">
                <Card.Body>
                  <div className="policy-header">
                    <div className="policy-icon">
                      {getPolicyTypeIcon(policy.policy_type)}
                    </div>
                    <Badge bg={getCategoryColor(policy.policy_type)}>
                      {policy.policy_type.toUpperCase()}
                    </Badge>
                  </div>
                  <h5 className="mt-3">{policy.title}</h5>
                  <p className="text-muted small">{policy.description}</p>
                  <div className="policy-meta">
                    <small className="text-muted">
                      Version: {policy.version || '1.0'}
                    </small>
                    <small className="text-muted ms-3">
                      Effective: {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : 'N/A'}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-transparent">
                  <Button variant="outline-primary" size="sm" className="w-100">
                    {policy.file_url ? 'Download Policy' : 'View Details'}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </div>
  );
};

export default PolicyHandbook;