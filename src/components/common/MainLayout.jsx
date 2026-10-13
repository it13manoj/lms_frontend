import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Container, Row, Col } from 'react-bootstrap';
import SystemOffTrackerWidget from '../attendance/SystemOffTrackerWidget';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="main-layout">
      {sidebarOpen && (
        <div 
          className="sidebar-mobile-backdrop d-md-none" 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 1040,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Container fluid className="content-wrapper">
          {children || <Outlet />}
        </Container>
      </div>
      <SystemOffTrackerWidget />
    </div>
  );
};

export default MainLayout;