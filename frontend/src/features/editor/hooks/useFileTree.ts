import { useState, useEffect, useCallback, useRef } from 'react';
import * as runtime from '../../../../wailsjs/runtime/runtime';
import { FileNode, GitStatusMap, GitStatusType } from '../../../types/editor';
import {
  fetchFileTree,
  fetchGitStatus,
  createEditorFile,
  createEditorFolder,
  deleteEditorEntry,
  renameEditorEntry,
} from '../services/editorApi';

export function useFileTree(rootPath: string | null) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [gitStatusMap, setGitStatusMap] = useState<GitStatusMap>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;

  const loadGitStatus = useCallback(async (path: string) => {
    const status = await fetchGitStatus(path);
    if (!status) return;

    const map: GitStatusMap = {};
    const registerChange = (p: string, type: GitStatusType) => {
      const normalized = p.replace(/\\/g, '/');
      map[normalized] = type;
      // Mark parent directories as having changes
      const parts = normalized.split('/');
      let curr = '';
      for (let i = 0; i < parts.length - 1; i++) {
        curr = curr ? `${curr}/${parts[i]}` : parts[i];
        if (!map[curr]) map[curr] = 'modified';
      }
    };

    status.stagedFiles?.forEach((f: any) => registerChange(f.path, 'added'));
    status.unstagedFiles?.forEach((f: any) => registerChange(f.path, 'modified'));
    status.untrackedFiles?.forEach((f: any) => registerChange(f.path, 'untracked'));
    setGitStatusMap(map);
  }, []);

  const refreshTree = useCallback(async (isSilent = false) => {
    const curr = rootPathRef.current;
    if (!curr) {
      setFileTree([]);
      setGitStatusMap({});
      return;
    }
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const [tree] = await Promise.all([
        fetchFileTree(curr, 6),
        loadGitStatus(curr),
      ]);
      setFileTree(tree);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [loadGitStatus]);

  useEffect(() => {
    refreshTree();
  }, [rootPath, refreshTree]);

  // Real-time synchronization on git:status:changed or window focus
  useEffect(() => {
    let cancelEvent: (() => void) | undefined;
    try {
      if (runtime && typeof (runtime as any).EventsOn === 'function') {
        cancelEvent = (runtime as any).EventsOn('git:status:changed', () => {
          refreshTree(true);
        });
      }
    } catch (e) {
      console.warn('EventsOn not available:', e);
    }

    const onFocus = () => refreshTree(true);
    window.addEventListener('focus', onFocus);

    // Periodic silent live watcher (does not trigger UI spinner)
    const timer = setInterval(() => {
      if (!document.hidden && rootPathRef.current) {
        refreshTree(true);
      }
    }, 4000);

    return () => {
      if (cancelEvent) cancelEvent();
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [refreshTree]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const collapseAllFolders = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const handleCreateFile = useCallback(async (fullPath: string) => {
    await createEditorFile(fullPath);
    await refreshTree();
  }, [refreshTree]);

  const handleCreateFolder = useCallback(async (fullPath: string) => {
    await createEditorFolder(fullPath);
    await refreshTree();
  }, [refreshTree]);

  const handleDeleteEntry = useCallback(async (fullPath: string) => {
    await deleteEditorEntry(fullPath);
    await refreshTree();
  }, [refreshTree]);

  const handleRenameEntry = useCallback(async (oldPath: string, newPath: string) => {
    await renameEditorEntry(oldPath, newPath);
    await refreshTree();
  }, [refreshTree]);

  return {
    fileTree,
    gitStatusMap,
    expandedPaths,
    searchQuery,
    setSearchQuery,
    loading,
    refreshTree,
    toggleFolder,
    collapseAllFolders,
    setExpandedPaths,
    handleCreateFile,
    handleCreateFolder,
    handleDeleteEntry,
    handleRenameEntry,
  };
}
