import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginStatus } from '../LoginStatus';
import { api } from '../../lib/api';

// Mock the API module
vi.mock('../../lib/api', () => ({
  api: {
    getCredentialStatus: vi.fn(),
  },
}));

describe('LoginStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading state initially', () => {
      // Arrange - API call never resolves
      vi.mocked(api.getCredentialStatus).mockImplementation(
        () => new Promise(() => {})
      );

      // Act
      render(<LoginStatus />);

      // Assert
      expect(screen.getByText(/Checking login status/i)).toBeInTheDocument();
    });
  });

  describe('logged in state', () => {
    it('should show logged in state when credentials exist and not expired', async () => {
      // Arrange
      vi.mocked(api.getCredentialStatus).mockResolvedValue({
        loggedIn: true,
        expired: false,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      // Act
      render(<LoginStatus />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Logged in to Claude Code/i)).toBeInTheDocument();
      });
      // Should not show expired warning
      expect(screen.queryByText(/credentials expired/i)).not.toBeInTheDocument();
    });

    it('should display expiration time when logged in', async () => {
      // Arrange
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(api.getCredentialStatus).mockResolvedValue({
        loggedIn: true,
        expired: false,
        expiresAt,
      });

      // Act
      render(<LoginStatus />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Valid until/i)).toBeInTheDocument();
      });
    });
  });

  describe('logged out state', () => {
    it('should show not logged in state when no credentials', async () => {
      // Arrange
      vi.mocked(api.getCredentialStatus).mockResolvedValue({
        loggedIn: false,
        expired: false,
        expiresAt: null,
      });

      // Act
      render(<LoginStatus />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Not logged in/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/claude login/i)).toBeInTheDocument();
    });
  });

  describe('expired state', () => {
    it('should show expired state when credentials are expired', async () => {
      // Arrange
      vi.mocked(api.getCredentialStatus).mockResolvedValue({
        loggedIn: true,
        expired: true,
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      });

      // Act
      render(<LoginStatus />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/credentials expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('should show error state when API call fails', async () => {
      // Arrange
      vi.mocked(api.getCredentialStatus).mockRejectedValue(
        new Error('Network error')
      );

      // Act
      render(<LoginStatus />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Cannot connect to Sidecar/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    it('should retry when clicking retry button', async () => {
      // Arrange
      const user = userEvent.setup();
      vi.mocked(api.getCredentialStatus)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          loggedIn: true,
          expired: false,
          expiresAt: null,
        });

      // Act
      render(<LoginStatus />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Cannot connect to Sidecar/i)).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByRole('button', { name: /Retry/i }));

      // Assert - Should now show logged in
      await waitFor(() => {
        expect(screen.getByText(/Logged in to Claude Code/i)).toBeInTheDocument();
      });
      expect(api.getCredentialStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('callbacks', () => {
    it('should call onStatusChange when status changes', async () => {
      // Arrange
      const onStatusChange = vi.fn();
      vi.mocked(api.getCredentialStatus).mockResolvedValue({
        loggedIn: true,
        expired: false,
        expiresAt: null,
      });

      // Act
      render(<LoginStatus onStatusChange={onStatusChange} />);

      // Assert
      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('logged_in');
      });
    });

    it('should notify with loading status first', async () => {
      // Arrange
      const onStatusChange = vi.fn();
      vi.mocked(api.getCredentialStatus).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          loggedIn: true,
          expired: false,
          expiresAt: null,
        }), 100))
      );

      // Act
      render(<LoginStatus onStatusChange={onStatusChange} />);

      // Assert - Should be called with loading first
      expect(onStatusChange).toHaveBeenCalledWith('loading');
    });
  });
});
