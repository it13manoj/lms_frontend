import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PolicyHandbook from './PolicyHandbook';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const mockNavigate = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PolicyHandbook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: 'admin' } });
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            title: 'Remote Work Policy',
            policy_type: 'company',
            category: 'Workplace',
            description: 'Remote work policy description',
            version: '1.0',
            effective_date: '2025-01-01',
            file_url: 'https://example.com/policy.pdf',
          },
        ],
      },
    });
  });

  test('admin can open the full policy management page', async () => {
    render(
      <BrowserRouter>
        <PolicyHandbook />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Remote Work Policy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add new policy/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/policies/manage');
  });
});
