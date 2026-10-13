import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../common/MainLayout';
import MeetingPanel from './MeetingPanel';
import GuestMeetingJoin from './GuestMeetingJoin';

/**
 * Smart Meeting Dispatcher
 * Seamlessly routes participants based on authentication:
 * - If user is logged in (Employee / Admin / HR), loads full LMS Meeting Room inside MainLayout.
 * - If user is not logged in (Guest / External Client), loads Guest Meeting Lobby (no login required).
 */
const MeetingDispatcher = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { meetingId } = useParams();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted small">Joining meeting room...</div>
        </div>
      </div>
    );
  }

  // Authenticated Employees: Open inside LMS portal
  if (isAuthenticated && user) {
    return (
      <MainLayout>
        <MeetingPanel />
      </MainLayout>
    );
  }

  // External Guests / Clients: Open Guest Lobby without requiring login
  return <GuestMeetingJoin />;
};

export default MeetingDispatcher;

