import React from 'react';
import { FaBars, FaBell, FaUserCircle } from 'react-icons/fa';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <Navbar className="header" expand="lg">
      <Navbar.Brand className="header-brand">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
      </Navbar.Brand>

      <Navbar.Collapse className="justify-content-end">
        <Nav>
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
              <Dropdown.Item href="/logout">Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Header;