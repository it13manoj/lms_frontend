import api from './api';

const letterService = {
  // Get all letters with optional filters (letter_type, search, status, page, limit)
  getLetters: async (params = {}) => {
    const response = await api.get('/letters', { params });
    return response.data;
  },

  // Get single letter by ID
  getLetterById: async (id) => {
    const response = await api.get(`/letters/${id}`);
    return response.data;
  },

  // Create new dynamic letter (Offer, Joining, or Experience)
  createLetter: async (letterData) => {
    const response = await api.post('/letters', letterData);
    return response.data;
  },

  // Update existing letter
  updateLetter: async (id, letterData) => {
    const response = await api.put(`/letters/${id}`, letterData);
    return response.data;
  },

  // Delete letter
  deleteLetter: async (id) => {
    const response = await api.delete(`/letters/${id}`);
    return response.data;
  },

  // Get status of Security PIN configuration
  getPinStatus: async () => {
    const response = await api.get('/letters/settings/pin-status');
    return response.data;
  },

  // Configure or change Security PIN
  configurePin: async (pinData) => {
    const response = await api.post('/letters/settings/configure-pin', pinData);
    return response.data;
  },

  // Verify Security PIN
  verifyPin: async (pin) => {
    const response = await api.post('/letters/settings/verify-pin', { pin });
    return response.data;
  },

  // Authorize or revoke digital stamp & signature on an existing letter
  authorizeSignature: async (id, data) => {
    const response = await api.post(`/letters/${id}/authorize-signature`, data);
    return response.data;
  }
};

export default letterService;
