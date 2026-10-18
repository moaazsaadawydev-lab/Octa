import { useState, useCallback, useEffect, useRef } from 'react';
import { EditorTab, FileNode } from '../../../types/editor';
import { detectLanguage } from '../utils/languageMap';
import { readEditorFile, saveEditorFile, getGitOriginalFile } from '../services/editorApi';

export interface UseEditorTabsOptions {
  rootPath: string | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useEditorTabs({ rootPath, showToast }: UseEditorTabsOptions) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const openFile = useCallback(async (node: FileNode) => {
    if (node.isDir) return;

    // Check if already open
    const existing = tabsRef.current.find((t) => t.id === node.fullPath);
    if (existing) {
      setActiveTabId(node.fullPath);
      return;
    }

    try {
      const [content, originalContent] = await Promise.all([
        readEditorFile(node.fullPath),
        rootPath ? getGitOriginalFile(rootPath, node.path) : Promise.resolve(''),
      ]);

      const newTab: EditorTab = {
        id: node.fullPath,
        title: node.name,
        fullPath: node.fullPath,
        relPath: node.path,
        content,
        originalContent: originalContent || undefined,
        isDirty: false,
        language: detectLanguage(node.name),
        isDiffMode: false,
        isPreview: true,
      };

      setTabs((prev) => {
        // If there is an existing unedited preview tab, replace it
        const previewIdx = prev.findIndex((t) => t.isPreview && !t.isDirty);
        if (previewIdx !== -1) {
          const next = [...prev];
          next[previewIdx] = newTab;
          return next;
        }
        return [...prev, newTab];
      });
      setActiveTabId(newTab.id);
    } catch (err: any) {
      showToast?.('Failed to open file: ' + (err?.message || err), 'error');
    }
  }, [rootPath, showToast]);

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabIdRef.current === tabId) {
        const closedIdx = prev.findIndex((t) => t.id === tabId);
        const nextActive = next[closedIdx] || next[closedIdx - 1] || null;
        setActiveTabId(nextActive ? nextActive.id : null);
      }
      return next;
    });
  }, []);

  const updateContent = useCallback((newContent: string) => {
    if (!activeTabIdRef.current) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabIdRef.current
          ? { ...t, content: newContent, isDirty: true, isPreview: false }
          : t
      )
    );
  }, []);

  const pinTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isPreview: false } : t))
    );
  }, []);

  const saveActiveTab = useCallback(async () => {
    const curr = tabsRef.current.find((t) => t.id === activeTabIdRef.current);
    if (!curr) return;

    try {
      await saveEditorFile(curr.fullPath, curr.content);
      setTabs((prev) =>
        prev.map((t) => (t.id === curr.id ? { ...t, isDirty: false } : t))
      );
      showToast?.(`Saved ${curr.title}`, 'success');
    } catch (err: any) {
      showToast?.('Failed to save file: ' + (err?.message || err), 'error');
    }
  }, [showToast]);

  const toggleDiffMode = useCallback(() => {
    if (!activeTabIdRef.current) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabIdRef.current ? { ...t, isDiffMode: !t.isDiffMode } : t
      )
    );
  }, []);

  // Listen for Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveTab]);

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openFile,
    closeTab,
    updateContent,
    saveActiveTab,
    toggleDiffMode,
    pinTab,
  };
}
