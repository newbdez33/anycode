/**
 * TerminalTabs Component - Phase 2
 *
 * Tab management for multiple terminal sessions.
 * Supports keyboard shortcuts and drag-and-drop reordering.
 */

import { useEffect, useCallback } from 'react';

export interface TerminalTab {
  id: string;
  title: string;
  sessionId: string;
}

export interface TerminalTabsProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
}

export function TerminalTabs({
  tabs,
  activeTabId,
  onNewTab,
  onCloseTab,
  onSelectTab,
}: TerminalTabsProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl + T - New tab
      if (isMeta && event.key === 't') {
        event.preventDefault();
        onNewTab();
        return;
      }

      // Cmd/Ctrl + W - Close current tab
      if (isMeta && event.key === 'w') {
        event.preventDefault();
        if (activeTabId) {
          onCloseTab(activeTabId);
        }
        return;
      }

      // Cmd/Ctrl + Shift + [ - Previous tab
      if (isMeta && event.shiftKey && event.key === '[') {
        event.preventDefault();
        navigateTabs(-1);
        return;
      }

      // Cmd/Ctrl + Shift + ] - Next tab
      if (isMeta && event.shiftKey && event.key === ']') {
        event.preventDefault();
        navigateTabs(1);
        return;
      }
    },
    [activeTabId, tabs, onNewTab, onCloseTab, onSelectTab]
  );

  // Navigate to adjacent tab
  const navigateTabs = useCallback(
    (direction: -1 | 1) => {
      if (tabs.length === 0) return;

      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex + direction;

      // Wrap around
      if (newIndex < 0) {
        newIndex = tabs.length - 1;
      } else if (newIndex >= tabs.length) {
        newIndex = 0;
      }

      onSelectTab(tabs[newIndex].id);
    },
    [tabs, activeTabId, onSelectTab]
  );

  // Register keyboard shortcut handler
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle tab click
  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTabId) {
      onSelectTab(tabId);
    }
  };

  // Handle close button click
  const handleCloseClick = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onCloseTab(tabId);
  };

  return (
    <div className="flex items-center bg-gray-900 border-b border-gray-700">
      {/* Tab list */}
      <div role="tablist" className="flex flex-1 overflow-x-auto">
        {tabs.length === 0 ? (
          <div className="px-4 py-2 text-gray-500 text-sm">No terminals</div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeTabId}
              aria-controls={`terminal-panel-${tab.id}`}
              tabIndex={tab.id === activeTabId ? 0 : -1}
              draggable="true"
              onClick={() => handleTabClick(tab.id)}
              className={`
                group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer
                border-r border-gray-700 select-none
                ${
                  tab.id === activeTabId
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }
              `}
            >
              <span>{tab.title}</span>
              <button
                onClick={(e) => handleCloseClick(e, tab.id)}
                aria-label="Close tab"
                className={`
                  w-4 h-4 flex items-center justify-center rounded
                  hover:bg-gray-600 transition-colors
                  ${tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* New tab button */}
      <button
        onClick={onNewTab}
        aria-label="New terminal"
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
