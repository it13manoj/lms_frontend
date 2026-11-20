import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { flushAndStopOnLogout } from '../services/systemOffTracker';
import { startDesktopAgent, stopDesktopAgent } from '../services/desktopAgent';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    flushAndStopOnLogout();
    stopDesktopAgent().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.status && response.data.status !== 'active') {
        logout();
        window.location.href = '/login?revoked=true';
        return;
      }
      setUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();

      // Periodic security pulse (every 15s) to guarantee immediate session termination
      // when an admin deactivates or terminates an employee.
      const timer = setInterval(async () => {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.status && res.data.status !== 'active') {
            logout();
            window.location.href = '/login?revoked=true';
          }
        } catch (err) {
          if (err.response?.status === 401) {
            logout();
            window.location.href = '/login?revoked=true';
          }
        }
      }, 15000);

      return () => clearInterval(timer);
    } else {
      setLoading(false);
    }
  }, [token, loadUser, logout]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setToken(token);
        setUser(user);
        startDesktopAgent({ token, email: user?.email || email }).catch(() => {});
        return { success: true, user };
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
