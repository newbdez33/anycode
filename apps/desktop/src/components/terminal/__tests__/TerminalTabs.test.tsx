/**
 * TerminalTabs Component Tests - Phase 2
 *
 * Tests for the terminal tab management component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalTabs } from '../TerminalTabs';

describe('TerminalTabs', () => {
  const mockOnNewTab = vi.fn();
  const mockOnCloseTab = vi.fn();
  const mockOnSelectTab = vi.fn();

  const defaultProps = {
    tabs: [
      { id: 'tab-1', title: 'Terminal 1', sessionId: 'session-1' },
      { id: 'tab-2', title: 'Terminal 2', sessionId: 'session-2' },
    ],
    activeTabId: 'tab-1',
    onNewTab: mockOnNewTab,
    onCloseTab: mockOnCloseTab,
    onSelectTab: mockOnSelectTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all tabs', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      expect(screen.getByText('Terminal 1')).toBeInTheDocument();
      expect(screen.getByText('Terminal 2')).toBeInTheDocument();
    });

    it('should render new tab button', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      const activeTab = screen.getByText('Terminal 1').closest('[role="tab"]');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should not highlight inactive tabs', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      const inactiveTab = screen.getByText('Terminal 2').closest('[role="tab"]');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should render close button on each tab', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      expect(closeButtons).toHaveLength(2);
    });
  });

  describe('tab selection', () => {
    it('should call onSelectTab when clicking a tab', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TerminalTabs {...defaultProps} />);

      // Act
      await user.click(screen.getByText('Terminal 2'));

      // Assert
      expect(mockOnSelectTab).toHaveBeenCalledWith('tab-2');
    });

    it('should not call onSelectTab when clicking active tab', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TerminalTabs {...defaultProps} />);

      // Act
      await user.click(screen.getByText('Terminal 1'));

      // Assert
      expect(mockOnSelectTab).not.toHaveBeenCalled();
    });
  });

  describe('new tab', () => {
    it('should call onNewTab when clicking new tab button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TerminalTabs {...defaultProps} />);

      // Act
      await user.click(screen.getByRole('button', { name: /new terminal/i }));

      // Assert
      expect(mockOnNewTab).toHaveBeenCalled();
    });
  });

  describe('close tab', () => {
    it('should call onCloseTab when clicking close button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TerminalTabs {...defaultProps} />);

      // Act
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[0]);

      // Assert
      expect(mockOnCloseTab).toHaveBeenCalledWith('tab-1');
    });

    it('should stop event propagation when clicking close button', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TerminalTabs {...defaultProps} />);

      // Act
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[1]); // Click close on inactive tab

      // Assert - onSelectTab should not be called
      expect(mockOnSelectTab).not.toHaveBeenCalled();
      expect(mockOnCloseTab).toHaveBeenCalledWith('tab-2');
    });
  });

  describe('keyboard shortcuts', () => {
    // Test that keyboard event handlers are registered
    it('should register keyboard event listener on mount', () => {
      // Arrange
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should remove keyboard event listener on unmount', () => {
      // Arrange
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Act
      const { unmount } = render(<TerminalTabs {...defaultProps} />);
      unmount();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should call onNewTab when Cmd+T is pressed', () => {
      // Arrange
      render(<TerminalTabs {...defaultProps} />);

      // Act - Dispatch keyboard event directly to window
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 't',
        metaKey: true,
        bubbles: true,
      }));

      // Assert
      expect(mockOnNewTab).toHaveBeenCalled();
    });

    it('should call onCloseTab when Cmd+W is pressed', () => {
      // Arrange
      render(<TerminalTabs {...defaultProps} />);

      // Act
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'w',
        metaKey: true,
        bubbles: true,
      }));

      // Assert
      expect(mockOnCloseTab).toHaveBeenCalledWith('tab-1');
    });

    it('should navigate to previous tab on Cmd+Shift+[', () => {
      // Arrange
      render(<TerminalTabs {...defaultProps} activeTabId="tab-2" />);

      // Act
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: '[',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      // Assert
      expect(mockOnSelectTab).toHaveBeenCalledWith('tab-1');
    });

    it('should navigate to next tab on Cmd+Shift+]', () => {
      // Arrange
      render(<TerminalTabs {...defaultProps} activeTabId="tab-1" />);

      // Act
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: ']',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      }));

      // Assert
      expect(mockOnSelectTab).toHaveBeenCalledWith('tab-2');
    });
  });

  describe('empty state', () => {
    it('should show message when no tabs', () => {
      // Act
      render(<TerminalTabs {...defaultProps} tabs={[]} activeTabId="" />);

      // Assert
      expect(screen.getByText(/no terminals/i)).toBeInTheDocument();
    });

    it('should still show new tab button when no tabs', () => {
      // Act
      render(<TerminalTabs {...defaultProps} tabs={[]} activeTabId="" />);

      // Assert
      expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA roles', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    it('should have proper tab panel reference', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      const tab = screen.getByText('Terminal 1').closest('[role="tab"]');
      expect(tab).toHaveAttribute('aria-controls');
    });
  });

  describe('drag and drop', () => {
    it('should have draggable attribute on tabs', () => {
      // Act
      render(<TerminalTabs {...defaultProps} />);

      // Assert
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('draggable', 'true');
      });
    });
  });
});
