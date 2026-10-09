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
  }
};

export default letterService;

