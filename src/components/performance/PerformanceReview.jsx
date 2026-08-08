import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card, Row, Col, Badge, Button, Spinner,
  Alert, ProgressBar, ListGroup, Form
} from 'react-bootstrap';
import {
  FaArrowLeft, FaUser, FaCalendar, FaStar,
  FaChartLine, FaCheck, FaTimes, FaEdit
} from 'react-icons/fa';
import api from '../../services/api';
import './PerformanceReview.css';

const PerformanceReview = () => {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReview();
    }
  }, [id]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/performance/${id}`);
      setReview(response.data.data);
    } catch (error) {
      setError('Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!review) {
    return <Alert variant="danger">Review not found</Alert>;
  }

  return (
    <div className="performance-review">
      <Link to="/performance" className="btn btn-outline-secondary mb-4">
        <FaArrowLeft className="me-2" />
        Back to Performance
      </Link>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaChartLine className="me-2" />
            Performance Review
          </h5>
          <Badge bg={review.status === 'reviewed' ? 'success' : 'warning'}>
            {review.status}
          </Badge>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={6}>
              <div className="review-meta">
                <FaUser className="text-primary me-2" />
                <strong>Employee:</strong> {review.employee_name}
              </div>
            </Col>
            <Col md={6}>
              <div className="review-meta">
                <FaCalendar className="text-primary me-2" />
                <strong>Review Date:</strong> {new Date(review.review_date).toLocaleDateString()}
              </div>
            </Col>
          </Row>

          <div className="rating-section mb-4">
            <h6>Overall Rating</h6>
            <div className="rating-display">
              {[1, 2, 3, 4, 5].map(star => (
                <FaStar 
                  key={star} 
                  className={star <= review.rating ? 'text-warning' : 'text-muted'}
                  size={32}
                />
              ))}
              <span className="rating-value ms-3">{review.rating}/5</span>
            </div>
          </div>

          <div className="review-section mb-4">
            <h6>Comments</h6>
            <p className="review-comment">{review.comments || 'No comments provided'}</p>
          </div>

          <Row>
            <Col md={6}>
              <div className="review-section mb-3">
                <h6>Goals</h6>
                <div className="goal-list">
                  {review.goals ? (
                    review.goals.split('\n').map((goal, i) => (
                      <div key={i} className="goal-item">
                        <FaCheck className="text-success me-2" />
                        {goal}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No goals set</p>
                  )}
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="review-section mb-3">
                <h6>Achievements</h6>
                <div className="achievement-list">
                  {review.achievements ? (
                    review.achievements.split('\n').map((achievement, i) => (
                      <div key={i} className="achievement-item">
                        <FaStar className="text-warning me-2" />
                        {achievement}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No achievements listed</p>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PerformanceReview;