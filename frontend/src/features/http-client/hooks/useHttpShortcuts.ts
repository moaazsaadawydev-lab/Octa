import { useEffect } from 'react';

export interface UseHttpShortcutsOptions {
  activeTabId: string;
  onSendRequest: () => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
}

export function useHttpShortcuts({
  activeTabId,
  onSendRequest,
  onNewTab,
  onCloseTab,
}: UseHttpShortcutsOptions) {
  useEffect(() => {
    const handleGlobalSend = () => onSendRequest();
    const handleGlobalNew = () => onNewTab();
    window.addEventListener('octa:http:send-request', handleGlobalSend);
    window.addEventListener('octa:http:new-request', handleGlobalNew);
    return () => {
      window.removeEventListener('octa:http:send-request', handleGlobalSend);
      window.removeEventListener('octa:http:new-request', handleGlobalNew);
    };
  }, [onSendRequest, onNewTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          if (activeTabId) onCloseTab(activeTabId);
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          onNewTab();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          onSendRequest();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, onCloseTab, onNewTab, onSendRequest]);
}
