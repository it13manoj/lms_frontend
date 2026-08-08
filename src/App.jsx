import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

// Components
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeProfile from './components/employee/EmployeeProfile';
import LeaveRequest from './components/leave/LeaveRequest';
import LeaveList from './components/leave/LeaveList';
import LeaveCancel from './components/leave/LeaveCancel';
import LeaveCalendar from './components/leave/LeaveCalendar';
import AttendanceTracker from './components/attendance/AttendanceTracker';
import SalarySlip from './components/salary/SalarySlip';
import SalaryHistory from './components/salary/SalaryHistory';
import PolicyHandbook from './components/policies/PolicyHandbook';
import PolicyManagement from './components/policies/PolicyManagement';
import HolidayCalendar from './components/holidays/HolidayCalendar';
import PaymentHistory from './components/payments/PaymentHistory';
import ProtectedRoute from './components/common/ProtectedRoute';
import ChangePassword from './components/auth/ChangePassword'; // Add this

// Layout
import MainLayout from './components/common/MainLayout';
import { AuthProvider } from './context/AuthContext';

// New Components
import Profile from './components/profile/Profile';
import Performance from './components/performance/Performance';
import PerformanceReview from './components/performance/PerformanceReview';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<EmployeeList />} />
              <Route path="employees/:id" element={<EmployeeProfile />} />
              
              {/* Profile Routes */}
              <Route path="profile" element={<Profile />} />
              <Route path="profile/change-password" element={<ChangePassword />} />
              
              {/* Leave Routes */}
              <Route path="leave" element={<LeaveRequest />} />
              <Route path="leave/list" element={<LeaveList />} />
              <Route path="leave/cancel" element={<LeaveCancel />} />
              <Route path="leave/calendar" element={<LeaveCalendar />} />
              
              {/* Attendance Routes */}
              <Route path="attendance" element={<AttendanceTracker />} />
              
              {/* Salary Routes */}
              <Route path="salary" element={<SalarySlip />} />
              <Route path="salary/history" element={<SalaryHistory />} />
              
              {/* Policy Routes */}
              <Route path="policies" element={<PolicyHandbook />} />
              <Route path="policies/manage" element={<PolicyManagement />} />
              
              {/* Performance Routes */}
              <Route path="performance" element={<Performance />} />
              <Route path="performance/review/:id?" element={<PerformanceReview />} />
              
              {/* Other Routes */}
              <Route path="holidays" element={<HolidayCalendar />} />
              <Route path="payments" element={<PaymentHistory />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;