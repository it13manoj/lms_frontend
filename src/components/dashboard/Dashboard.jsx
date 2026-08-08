import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { 
  FaUsers, FaUserCheck, FaCalendarCheck, FaMoneyBillWave,
  FaClock, FaFileAlt, FaChartLine, FaGift, FaUserTie,
  FaBuilding, FaHandshake, FaClipboardList, FaArrowRight
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    monthlySalary: 0,
    teamSize: 0,
    teamPresent: 0,
    pendingApprovals: 0,
    avgPerformance: 0,
    daysPresent: 0,
    leaveBalance: 0,
    performance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      let dashboardData = {};
      
      try {
        const response = await api.get('/dashboard/stats');
        if (response.data?.data) {
          dashboardData = response.data.data;
        }
      } catch (apiError) {
        console.log('Using mock data for dashboard');
        dashboardData = {
          totalEmployees: 45,
          presentToday: 38,
          pendingLeaves: 7,
          monthlySalary: 87500,
          teamSize: 12,
          teamPresent: 10,
          pendingApprovals: 3,
          avgPerformance: 85,
          daysPresent: 18,
          leaveBalance: 12,
          performance: 78,
          recentActivities: [
            { id: 1, description: 'John Doe requested leave', time: '2 hours ago' },
            { id: 2, description: 'Jane Smith checked in', time: '3 hours ago' },
            { id: 3, description: 'New employee Bob Johnson added', time: '5 hours ago' },
            { id: 4, description: 'Salary processed for January', time: '1 day ago' },
            { id: 5, description: 'Holiday policy updated', time: '2 days ago' }
          ],
          upcomingEvents: [
            { id: 1, title: 'Team Meeting', day: '15', month: 'Jan', type: 'Meeting' },
            { id: 2, title: 'Public Holiday', day: '26', month: 'Jan', type: 'Holiday' },
            { id: 3, title: 'Performance Review', day: '5', month: 'Feb', type: 'Review' }
          ]
        };
      }

      setStats(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Showing demo data.');
      
      setStats({
        totalEmployees: 45,
        presentToday: 38,
        pendingLeaves: 7,
        monthlySalary: 87500,
        teamSize: 12,
        teamPresent: 10,
        pendingApprovals: 3,
        avgPerformance: 85,
        daysPresent: 18,
        leaveBalance: 12,
        performance: 78,
        recentActivities: [
          { id: 1, description: 'John Doe requested leave', time: '2 hours ago' },
          { id: 2, description: 'Jane Smith checked in', time: '3 hours ago' },
          { id: 3, description: 'New employee Bob Johnson added', time: '5 hours ago' }
        ],
        upcomingEvents: [
          { id: 1, title: 'Team Meeting', day: '15', month: 'Jan', type: 'Meeting' },
          { id: 2, title: 'Public Holiday', day: '26', month: 'Jan', type: 'Holiday' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner animation="border" variant="primary" size="lg" />
        <p className="mt-3 text-muted">Loading dashboard...</p>
      </div>
    );
  }

  const getWelcomeMessage = () => {
    const role = user?.role || 'employee';
    const messages = {
      admin: 'Welcome back, Administrator! You have full access to the system.',
      hr: 'Welcome back, HR! Manage employees, leaves, and policies.',
      manager: 'Welcome back, Manager! View and manage your team\'s performance.',
      employee: 'Welcome back! View your attendance, leaves, and salary.',
      sales: 'Welcome back! Track your attendance and leave requests.',
      team: 'Welcome back! View your attendance and leave management.'
    };
    return messages[role] || messages.employee;
  };

  const getQuickActions = () => {
    const role = user?.role || 'employee';
    const actions = {
      admin: [
        { label: 'Manage Employees', path: '/employees', icon: <FaUsers />, color: '#667eea' },
        { label: 'View Reports', path: '/reports', icon: <FaChartLine />, color: '#764ba2' },
        { label: 'Manage Policies', path: '/policies/manage', icon: <FaFileAlt />, color: '#f093fb' }
      ],
      hr: [
        { label: 'Manage Employees', path: '/employees', icon: <FaUsers />, color: '#667eea' },
        { label: 'Approve Leaves', path: '/leave/list', icon: <FaCalendarCheck />, color: '#f6d365' },
        { label: 'Manage Policies', path: '/policies/manage', icon: <FaFileAlt />, color: '#f093fb' }
      ],
      manager: [
        { label: 'Team Performance', path: '/performance', icon: <FaChartLine />, color: '#667eea' },
        { label: 'Team Attendance', path: '/attendance', icon: <FaClock />, color: '#84fab0' },
        { label: 'Approve Leaves', path: '/leave/list', icon: <FaCalendarCheck />, color: '#f6d365' }
      ],
      employee: [
        { label: 'Request Leave', path: '/leave', icon: <FaCalendarCheck />, color: '#f6d365' },
        { label: 'My Attendance', path: '/attendance', icon: <FaClock />, color: '#84fab0' },
        { label: 'View Salary', path: '/salary', icon: <FaMoneyBillWave />, color: '#a8edea' }
      ]
    };
    return actions[role] || actions.employee;
  };

  const getRoleStats = () => {
    const role = user?.role || 'employee';
    
    if (role === 'admin' || role === 'hr') {
      return [
        { title: 'Total Employees', value: stats.totalEmployees || 0, icon: <FaUsers />, color: 'primary', change: '+12%' },
        { title: 'Present Today', value: stats.presentToday || 0, icon: <FaUserCheck />, color: 'success', change: '+5%' },
        { title: 'Pending Leaves', value: stats.pendingLeaves || 0, icon: <FaCalendarCheck />, color: 'warning', change: '-3%' },
        { title: 'Monthly Salary', value: `$${(stats.monthlySalary || 0).toLocaleString()}`, icon: <FaMoneyBillWave />, color: 'info', change: '+8%' }
      ];
    } else if (role === 'manager') {
      return [
        { title: 'Team Size', value: stats.teamSize || 0, icon: <FaUserTie />, color: 'primary', change: '+2%' },
        { title: 'Team Present', value: stats.teamPresent || 0, icon: <FaUserCheck />, color: 'success', change: '+10%' },
        { title: 'Pending Approvals', value: stats.pendingApprovals || 0, icon: <FaClipboardList />, color: 'warning', change: '-2%' },
        { title: 'Team Performance', value: `${stats.avgPerformance || 0}%`, icon: <FaChartLine />, color: 'info', change: '+5%' }
      ];
    } else {
      return [
        { title: 'Days Present', value: stats.daysPresent || 0, icon: <FaUserCheck />, color: 'success', change: '+8%' },
        { title: 'Leave Balance', value: stats.leaveBalance || 0, icon: <FaCalendarCheck />, color: 'warning', change: '-2%' },
        { title: 'Monthly Salary', value: `$${(stats.monthlySalary || 0).toLocaleString()}`, icon: <FaMoneyBillWave />, color: 'info', change: '+5%' },
        { title: 'Performance', value: `${stats.performance || 0}%`, icon: <FaChartLine />, color: 'primary', change: '+3%' }
      ];
    }
  };

  return (
    <div className="dashboard container-fluid px-2 px-md-4 py-3">
      {error && (
        <Alert variant="info" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Header section responsive layout */}
      <div className="dashboard-header d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="dashboard-title fs-3 mb-1">Dashboard</h2>
          <p className="dashboard-subtitle text-muted mb-0">{getWelcomeMessage()}</p>
        </div>
        <div className="dashboard-date text-muted small fw-semibold">
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <Row className="stats-row g-3 mb-4">
        {getRoleStats().map((stat, index) => (
          <Col key={index} xl={3} lg={6} md={6} sm={6} xs={12}>
            <Card className={`stat-card stat-card-${stat.color} h-100 shadow-sm border-0`}>
              <Card.Body className="p-3">
                <div className="stat-card-content d-flex justify-content-between align-items-center">
                  <div className="stat-info">
                    <h6 className="stat-label text-muted small mb-1">{stat.title}</h6>
                    <h3 className="stat-value fs-4 fw-bold mb-1">{stat.value}</h3>
                    {stat.change && (
                      <span className={`stat-change small fw-semibold ${stat.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                        {stat.change}
                      </span>
                    )}
                  </div>
                  <div className={`stat-icon-wrapper bg-${stat.color} bg-opacity-15 p-3 rounded-circle text-${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Row className="quick-actions-row mb-4">
        <Col xs={12}>
          <Card className="quick-actions-card shadow-sm border-0">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fs-6 fs-md-5">
                <FaHandshake className="me-2" />
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="quick-actions-grid d-flex flex-wrap gap-3">
                {getQuickActions().map((action, index) => (
                  <Link to={action.path} key={index} className="quick-action-item text-decoration-none flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between p-3 rounded border bg-light h-100">
                      <div className="d-flex align-items-center gap-3">
                        <div className="quick-action-icon p-2 rounded text-white" style={{ background: action.color }}>
                          {action.icon}
                        </div>
                        <div className="quick-action-label text-dark fw-medium">{action.label}</div>
                      </div>
                      <FaArrowRight className="quick-action-arrow text-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity & Upcoming Events */}
      <Row className="activity-row g-3">
        <Col xs={12} lg={7}>
          <Card className="recent-activity-card shadow-sm border-0 h-100">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fs-6 fs-md-5">
                <FaClock className="me-2" />
                Recent Activities
              </h5>
            </Card.Header>
            <Card.Body className="p-3">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                <div className="activity-list">
                  {stats.recentActivities.map((activity) => (
                    <div key={activity.id} className="activity-item d-flex align-items-start gap-3 pb-3 mb-3 border-bottom last-border-0">
                      <div className="activity-dot mt-1 bg-primary rounded-circle" style={{ width: '8px', height: '8px', minWidth: '8px' }}></div>
                      <div className="activity-content flex-grow-1">
                        <p className="activity-description mb-1 small text-dark">{activity.description}</p>
                        <span className="activity-time text-muted x-small">{activity.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-4 mb-0">No recent activities</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="upcoming-events-card shadow-sm border-0 h-100">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fs-6 fs-md-5">
                <FaGift className="me-2" />
                Upcoming Events
              </h5>
            </Card.Header>
            <Card.Body className="p-3">
              {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
                <div className="event-list">
                  {stats.upcomingEvents.map((event) => (
                    <div key={event.id} className="event-item d-flex align-items-center gap-3 pb-3 mb-3 border-bottom last-border-0">
                      <div className="event-date text-center bg-light p-2 rounded border" style={{ minWidth: '50px' }}>
                        <span className="event-day d-block fw-bold fs-6 text-primary">{event.day}</span>
                        <span className="event-month d-block text-uppercase x-small text-muted">{event.month}</span>
                      </div>
                      <div className="event-info flex-grow-1">
                        <h6 className="event-title mb-1 fs-6 fw-semibold">{event.title}</h6>
                        <span className="event-type badge bg-secondary bg-opacity-10 text-secondary">{event.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted py-4 mb-0">No upcoming events</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;