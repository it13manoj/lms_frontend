import axios from 'axios';
import { isMobileDevice } from '../utils/deviceDetector';

// Use environment variable or fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'https://lms.parakshtech.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add token and device header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['x-device-type'] = isMobileDevice() ? 'mobile' : 'desktop';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        // Only redirect to login if not already on login or guest/meeting pages
        const currentPath = window.location.pathname;
        const isMeetingOrGuest = currentPath.includes('/login') || 
                                 currentPath.includes('/guest') || 
                                 currentPath.startsWith('/meeting') || 
                                 currentPath.startsWith('/meet');
        if (!isMeetingOrGuest) {
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // Request was made but no response
      console.error('No response from server:', error.request);
    } else {
      // Something else happened
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;