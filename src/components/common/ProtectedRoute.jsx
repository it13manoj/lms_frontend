import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Define role-based route access
const ROLE_ROUTES = {
  admin: ['/dashboard', '/employees', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies', '/holidays', '/payments', '/performance', '/reports', '/settings'],
  hr: ['/dashboard', '/employees', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies', '/holidays', '/payments', '/performance'],
  manager: ['/dashboard', '/employees', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies', '/holidays', '/performance'],
  sales: ['/dashboard', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies'],
  team: ['/dashboard', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies'],
  employee: ['/dashboard', '/profile', '/leave', '/leave/*', '/attendance', '/salary', '/policies']
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed for this route
  const userRole = user.role || 'employee';
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user has access to this route based on their role
  const userRoutes = ROLE_ROUTES[userRole] || ROLE_ROUTES.employee;
  const currentPath = window.location.pathname;
  
  // Check if current path is accessible for this role
  const hasAccess = userRoutes.some(route => {
    if (route.includes('*')) {
      const baseRoute = route.replace('/*', '');
      return currentPath.startsWith(baseRoute);
    }
    return currentPath === route || currentPath.startsWith(route + '/');
  });

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;