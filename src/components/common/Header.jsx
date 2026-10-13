import React from 'react';
import { FaBars, FaBell, FaUserCircle } from 'react-icons/fa';
import { Navbar, Nav, Dropdown, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSystemOffTracker } from '../../services/systemOffTracker';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isCheckedIn, idleSeconds, isIdleOver30Min, systemOffMinutes, activityStatus } = useSystemOffTracker();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Navbar className="header" expand="lg">
      <Navbar.Brand className="header-brand">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
      </Navbar.Brand>

      <Navbar.Collapse className="justify-content-end">
        <Nav className="align-items-center">
          {isCheckedIn && (
            <div className="me-2 me-md-3">
              {activityStatus === 'active' ? (
                <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-1 px-2" style={{ fontSize: '11px' }}>
                  <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '6px', height: '6px' }} />
                  <span>Working</span>
                </span>
              ) : activityStatus === 'grace' ? (
                <span className="badge bg-warning bg-opacity-25 text-dark border border-warning d-inline-flex align-items-center gap-1 py-1 px-2" style={{ fontSize: '11px' }}>
                  <span>🟡 Idle: {Math.floor(idleSeconds / 60)}m</span>
                </span>
              ) : (
                <span className="badge bg-danger text-white d-inline-flex align-items-center gap-1 py-1 px-2 shadow-sm" style={{ fontSize: '11px' }}>
                  <span>🔴 System Off: {systemOffMinutes}m</span>
                </span>
              )}
            </div>
          )}

          <Nav.Link className="notification-icon">
            <FaBell />
            <span className="notification-badge">3</span>
          </Nav.Link>

          <Dropdown>
            <Dropdown.Toggle variant="link" className="user-dropdown">
              <FaUserCircle size={24} />
              <span className="user-name">
                {user?.employee?.first_name || user?.email}
              </span>
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item href="/profile">Profile</Dropdown.Item>
              <Dropdown.Item href="/settings">Settings</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Header;