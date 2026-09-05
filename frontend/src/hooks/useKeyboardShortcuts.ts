import { useEffect } from 'react';
import { ActiveModule } from '../components/layout/ActivityBar';

interface KeyboardShortcutsOptions {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  hasProject: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onCloseModals: () => void;
  onSaveProject: () => void;
}

export function isTypingInInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
    return true;
  }
  if (target.closest('.monaco-editor') || target.closest('.xterm')) {
    return true;
  }
  return false;
}

export function useKeyboardShortcuts({
  activeModule,
  setActiveModule,
  hasProject,
  onToggleSidebar,
  onOpenSettings,
  onCloseModals,
  onSaveProject,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key;

      // 1. ESCAPE: Close open modals, dialogs, or cancel active selection everywhere
      if (key === 'Escape') {
        onCloseModals();
        return;
      }

      // 2. Global Save: Ctrl + S / Cmd + S (Allowed everywhere)
      if (isCtrlOrCmd && !isShift && !isAlt && (key === 's' || key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        onSaveProject();
        return;
      }

      // 3. Open Preferences: Ctrl + , / Cmd + , (Allowed everywhere)
      if (isCtrlOrCmd && !isShift && !isAlt && key === ',') {
        e.preventDefault();
        e.stopPropagation();
        onOpenSettings();
        return;
      }

      // 4. Terminal Actions:
      // Ctrl + Shift + ` : Open / focus new terminal instance
      if (isCtrlOrCmd && isShift && (key === '`' || key === '~')) {
        e.preventDefault();
        e.stopPropagation();
        if (hasProject) {
          setActiveModule('terminal');
          window.dispatchEvent(new CustomEvent('octa:terminal:new-tab'));
        }
        return;
      }

      // Ctrl + Shift + K : Clear active terminal buffer
      if (isCtrlOrCmd && isShift && (key === 'k' || key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('octa:terminal:clear'));
        return;
      }

      // 5. Toggle Sidebar: Ctrl + B / Cmd + B
      if (isCtrlOrCmd && !isShift && !isAlt && (key === 'b' || key === 'B')) {
        e.preventDefault();
        e.stopPropagation();
        onToggleSidebar();
        return;
      }

      // 6. Navigation: Ctrl + 1..6
      if (isCtrlOrCmd && !isShift && !isAlt) {
        if (key === '1' && hasProject) {
          e.preventDefault();
          setActiveModule('databases');
          return;
        }
        if (key === '2' && hasProject) {
          e.preventDefault();
          setActiveModule('http');
          return;
        }
        if (key === '3' && hasProject) {
          e.preventDefault();
          setActiveModule('git');
          return;
        }
        if (key === '4' && hasProject) {
          e.preventDefault();
          setActiveModule('terminal');
          return;
        }
        if (key === '5' && hasProject) {
          e.preventDefault();
          setActiveModule('redis');
          return;
        }
        if (key === '6' && hasProject) {
          e.preventDefault();
          setActiveModule('docker');
          return;
        }
      }

      // 7. Request Sender / General: Ctrl + N
      if (isCtrlOrCmd && !isShift && !isAlt && (key === 'n' || key === 'N')) {
        if (!isTypingInInput(e.target)) {
          e.preventDefault();
          if (activeModule === 'http') {
            window.dispatchEvent(new CustomEvent('octa:http:new-request'));
          } else if (activeModule === 'databases') {
            window.dispatchEvent(new CustomEvent('octa:db:new-query'));
          }
          return;
        }
      }

      // 8. Execute active: Ctrl + Enter
      if (isCtrlOrCmd && key === 'Enter') {
        if (activeModule === 'http') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('octa:http:send-request'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeModule,
    setActiveModule,
    hasProject,
    onToggleSidebar,
    onOpenSettings,
    onCloseModals,
    onSaveProject,
  ]);
}
