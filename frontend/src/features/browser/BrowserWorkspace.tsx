import React, { useEffect, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useBrowserTabs } from './hooks/useBrowserTabs';
import { useBrowserHistory } from './hooks/useBrowserHistory';
import { BrowserTabBar } from './components/BrowserTabBar';
import { BrowserNavigationBar } from './components/BrowserNavigationBar';
import { BrowserFrame } from './components/BrowserFrame';
import { BrowserContextMenu } from './components/BrowserContextMenu';
import { formatLocalhostUrl } from './types';
import { openExternalUrl } from '../../utils/urlUtils';

interface BrowserWorkspaceProps {
  isVisible: boolean;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BrowserWorkspace: React.FC<BrowserWorkspaceProps> = ({ isVisible, showToast }) => {
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    addTab,
    closeTab,
    updateActiveUrl,
    setViewportMode,
    reloadActiveTab,
    updateTabMeta,
  } = useBrowserTabs();

  const {
    recentPorts,
    recordVisit,
    updateHistoryTitle,
    removeHistoryItem,
    getSuggestions,
  } = useBrowserHistory();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    selectedText?: string;
  } | null>(null);

  // Keyboard navigation when browser workspace is active
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      // Ctrl + R: Reload active tab
      if (e.key === 'r' || e.key === 'R') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          reloadActiveTab();
          showToast?.('Reloaded localhost preview', 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, reloadActiveTab, showToast]);

  // Record visit when active tab url changes
  useEffect(() => {
    if (activeTab?.url) {
      recordVisit(activeTab.url, activeTab.title);
    }
  }, [activeTab?.url, recordVisit]);

  const handleNavigate = useCallback(
    (newUrl: string) => {
      const formatted = formatLocalhostUrl(newUrl);
      updateActiveUrl(formatted);
      recordVisit(formatted, activeTab?.title);
    },
    [updateActiveUrl, recordVisit, activeTab?.title]
  );

  const handleSelectPort = (port: string) => {
    const formatted = formatLocalhostUrl(port);
    handleNavigate(formatted);
    showToast?.(`Navigated to ${formatted}`, 'info');
  };

  const handleUpdateTabMeta = useCallback(
    (tabId: string, meta: { title?: string; faviconUrl?: string }) => {
      updateTabMeta(tabId, meta);
      if (meta.title) {
        const t = tabs.find((item) => item.id === tabId);
        if (t) {
          updateHistoryTitle(t.url, meta.title);
        }
      }
    },
    [updateTabMeta, updateHistoryTitle, tabs]
  );

  const handleOpenContextMenu = useCallback((x: number, y: number, selectedText?: string) => {
    setContextMenu({ isOpen: true, x, y, selectedText });
  }, []);
  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  const handleNavBack = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'OCTA_NAV_ACTION', action: 'back' }, '*');
  }, []);

  const handleNavForward = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'OCTA_NAV_ACTION', action: 'forward' }, '*');
  }, []);

  const handleNavReload = useCallback(() => {
    reloadActiveTab();
    showToast?.('Reloaded', 'info');
  }, [reloadActiveTab, showToast]);

  const handleCopy = useCallback(() => {
    if (contextMenu?.selectedText) {
      navigator.clipboard.writeText(contextMenu.selectedText);
      showToast?.('Copied selection to clipboard', 'info');
    } else if (activeTab) {
      navigator.clipboard.writeText(activeTab.url);
      showToast?.('URL copied to clipboard', 'info');
    }
  }, [contextMenu?.selectedText, activeTab, showToast]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'OCTA_NAV_ACTION', action: 'paste', text }, '*');
      }
    } catch {
      showToast?.('Could not paste clipboard content', 'error');
    }
  }, [showToast]);

  const handleCopyUrl = useCallback(() => {
    if (activeTab) {
      navigator.clipboard.writeText(activeTab.url);
      showToast?.('URL copied to clipboard', 'info');
    }
  }, [activeTab, showToast]);

  const handleOpenExternal = useCallback(() => {
    if (activeTab) openExternalUrl(activeTab.url);
  }, [activeTab]);

  return (
    <div
      className={clsx(
        'flex-1 flex flex-col h-full w-full overflow-hidden bg-white dark:bg-[#0c0d11] text-slate-900 dark:text-zinc-100 font-sans relative',
        !isVisible && 'hidden'
      )}
    >
      {/* 1. Top Tab Bar with Dynamic Ports */}
      <BrowserTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        onAddTab={addTab}
        onSelectPort={handleSelectPort}
        recentPorts={recentPorts}
        onContextMenu={(e) => {
          e.preventDefault();
          handleOpenContextMenu(e.clientX, e.clientY);
        }}
      />

      {/* 2. Navigation Omnibox with Autocomplete Search History */}
      {activeTab && (
        <BrowserNavigationBar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onReload={reloadActiveTab}
          onSetViewportMode={setViewportMode}
          getSuggestions={getSuggestions}
          onRemoveHistoryItem={removeHistoryItem}
        />
      )}

      {/* 3. Responsive Web Preview Frames (Preserved in DOM to prevent reloads) */}
      <div className="flex-1 relative w-full h-full min-h-0 min-w-0 overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={clsx(
              'w-full h-full min-h-0 min-w-0',
              tab.id === activeTabId ? 'flex flex-col' : 'hidden'
            )}
          >
            <BrowserFrame
              tab={tab}
              iframeRef={tab.id === activeTabId ? iframeRef : undefined}
              onUpdateTabMeta={handleUpdateTabMeta}
              onOpenContextMenu={handleOpenContextMenu}
              onCloseContextMenu={handleCloseContextMenu}
            />
          </div>
        ))}
        {tabs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500 font-mono">
            No active tabs. Click + to open a preview tab.
          </div>
        )}
      </div>

      {/* 4. Context Menu */}
      {contextMenu && (
        <BrowserContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onClose={handleCloseContextMenu}
          onBack={handleNavBack}
          onForward={handleNavForward}
          onReload={handleNavReload}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onCopyUrl={handleCopyUrl}
          onOpenExternal={handleOpenExternal}
        />
      )}
    </div>
  );
};
