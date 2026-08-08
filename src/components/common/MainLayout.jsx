import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Container, Row, Col } from 'react-bootstrap';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="main-layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Container fluid className="content-wrapper">
          <Outlet />
        </Container>
      </div>
    </div>
  );
};

export default MainLayout;