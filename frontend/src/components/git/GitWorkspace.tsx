import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GitBranch, FolderOpen, PlusSquare, RefreshCw, AlertTriangle, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { GitStatusResult, GitFileChange, InitRepoOptions } from '../../types/git';
import {
  openGitRepositoryDialog,
  isGitRepository,
  initializeRepositoryWithOptions,
  initGitRepository,
  getGitRepoStatus,
  getGitFileDiff,
  stageGitFile,
  unstageGitFile,
  stageAllGitFiles,
  unstageAllGitFiles,
  commitGitChanges,
  pushGitChanges,
  pullGitChanges,
  fetchGitChanges,
  startGitAutoWatch,
  stopGitAutoWatch,
} from '../../services/api';
import { GitSidebar } from './GitSidebar';
import { GitDiffViewer } from './GitDiffViewer';
import { InitRepoModal } from './InitRepoModal';

interface GitWorkspaceProps {
  activeProjectPath?: string | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GitWorkspace: React.FC<GitWorkspaceProps> = ({
  activeProjectPath,
  showToast,
}) => {
  const [repoPath, setRepoPath] = useState<string | null>(activeProjectPath || null);
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitFileChange | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [pendingInitPath, setPendingInitPath] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);

  const isResizing = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Sync with active project path if changed
  useEffect(() => {
    if (activeProjectPath && !repoPath) {
      setRepoPath(activeProjectPath);
    }
  }, [activeProjectPath]);

  // Resizing logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const newWidth = Math.min(Math.max(moveEvent.clientX - rect.left, 240), 600);
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Fetch Repo Status
  const fetchStatus = useCallback(async (targetPath?: string) => {
    const p = targetPath || repoPath;
    if (!p) {
      setStatus(null);
      return;
    }

    try {
      const res = await getGitRepoStatus(p);
      setStatus(res);

      const all = [
        ...(res.stagedFiles || []),
        ...(res.unstagedFiles || []),
        ...(res.untrackedFiles || []),
      ];

      // If repository is completely clean or changes were reverted, clear selection and diff
      if (all.length === 0) {
        setSelectedFile(null);
        setDiffContent('');
      } else if (selectedFile) {
        const matching = all.find((f) => f.path === selectedFile.path && f.staged === selectedFile.staged);
        if (matching) {
          loadDiff(p, matching);
        } else {
          setSelectedFile(all[0]);
          loadDiff(p, all[0]);
        }
      } else {
        setSelectedFile(all[0]);
        loadDiff(p, all[0]);
      }
    } catch (err: any) {
      console.error('[Git FetchStatus Error]:', err);
    }
  }, [repoPath, selectedFile]);

  // Load File Diff
  const loadDiff = async (targetRepo: string, file: GitFileChange) => {
    setIsDiffLoading(true);
    try {
      const diff = await getGitFileDiff(targetRepo, file.path, file.staged);
      setDiffContent(diff);
    } catch (err: any) {
      setDiffContent(`Error loading diff: ${err?.message || err}`);
    } finally {
      setIsDiffLoading(false);
    }
  };

  useEffect(() => {
    if (!repoPath) return;

    fetchStatus(repoPath);

    // Start background file system auto-watch
    startGitAutoWatch(repoPath).catch((err) => {
      console.warn('[GitWorkspace] Failed to start auto-watch:', err);
    });

    // Listen for real-time repository file changes emitted by backend
    const w = window as any;
    let cancelEvent: (() => void) | null = null;
    if (w?.runtime?.EventsOn) {
      cancelEvent = w.runtime.EventsOn('git:status:changed', (changedRepo: string) => {
        if (!changedRepo || changedRepo === repoPath) {
          console.log('[GitWorkspace] Real-time file system change detected, refreshing status...');
          fetchStatus(repoPath);
        }
      });
    }

    return () => {
      if (cancelEvent) {
        cancelEvent();
      } else if (w?.runtime?.EventsOff) {
        w.runtime.EventsOff('git:status:changed');
      }
      stopGitAutoWatch().catch(() => {});
    };
  }, [repoPath]);

  // Select File handler
  const handleSelectFile = (file: GitFileChange) => {
    setSelectedFile(file);
    if (repoPath) {
      loadDiff(repoPath, file);
    }
  };

  // Open Repo Dialog with non-git folder detection
  const handleOpenRepo = async () => {
    try {
      const selected = await openGitRepositoryDialog();
      if (selected) {
        const isRepo = await isGitRepository(selected);
        if (!isRepo) {
          setPendingInitPath(selected);
          setIsInitModalOpen(true);
        } else {
          setRepoPath(selected);
          fetchStatus(selected);
        }
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to open repository', 'error');
    }
  };

  // Init New Repo Dialog
  const handleInitRepo = async () => {
    try {
      const selected = await openGitRepositoryDialog();
      if (selected) {
        const isRepo = await isGitRepository(selected);
        if (!isRepo) {
          setPendingInitPath(selected);
          setIsInitModalOpen(true);
        } else {
          setRepoPath(selected);
          fetchStatus(selected);
        }
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to init repository', 'error');
    }
  };

  // Confirm Init Modal
  const handleConfirmInit = async (opts: InitRepoOptions) => {
    setIsInitializing(true);
    try {
      await initializeRepositoryWithOptions(opts);
      if (showToast) showToast(`Initialized Git repository "${opts.repoName}"`, 'success');
      setIsInitModalOpen(false);
      setRepoPath(opts.path);
      fetchStatus(opts.path);
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to initialize repository', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // Stage single file
  const handleStageFile = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await stageGitFile(repoPath, filePath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to stage file', 'error');
    }
  };

  // Unstage single file
  const handleUnstageFile = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await unstageGitFile(repoPath, filePath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to unstage file', 'error');
    }
  };

  // Stage All
  const handleStageAll = async () => {
    if (!repoPath) return;
    try {
      await stageAllGitFiles(repoPath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to stage all', 'error');
    }
  };

  // Unstage All
  const handleUnstageAll = async () => {
    if (!repoPath) return;
    try {
      await unstageAllGitFiles(repoPath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to unstage all', 'error');
    }
  };

  // Commit (with automatic staging if no files are explicitly staged)
  const handleCommit = async (message: string) => {
    if (!repoPath) return;
    setActionLoading('commit');
    try {
      const stagedCount = status?.stagedFiles?.length || 0;
      const unstagedCount = (status?.unstagedFiles?.length || 0) + (status?.untrackedFiles?.length || 0);

      // If no files are explicitly staged, automatically stage all modified and untracked files
      if (stagedCount === 0 && unstagedCount > 0) {
        await stageAllGitFiles(repoPath);
      }

      await commitGitChanges(repoPath, message);
      if (showToast) showToast('Committed changes successfully', 'success');
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to commit', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Push
  const handlePush = async () => {
    if (!repoPath) return;
    setActionLoading('push');
    try {
      await pushGitChanges(repoPath);
      if (showToast) showToast('Pushed commits to remote', 'success');
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to push commits', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Pull
  const handlePull = async () => {
    if (!repoPath) return;
    setActionLoading('pull');
    try {
      await pullGitChanges(repoPath);
      if (showToast) showToast('Pulled latest changes', 'success');
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to pull changes', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch
  const handleFetch = async () => {
    if (!repoPath) return;
    setActionLoading('fetch');
    try {
      await fetchGitChanges(repoPath);
      if (showToast) showToast('Fetched remote updates', 'info');
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to fetch', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Zero-State: If no repo is opened or selected directory is not a git repository
  if (!repoPath || (status && !status.isRepo)) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-[#090a0f] transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400 shadow-sm">
          <GitBranch className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
          Source Control & Git
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm leading-relaxed">
          Open a local Git repository to inspect diffs, stage files, commit changes, and push directly to remote.
        </p>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleOpenRepo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open Repository</span>
          </button>

          <button
            type="button"
            onClick={handleInitRepo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer"
          >
            <PlusSquare className="w-4 h-4 text-emerald-500" />
            <span>Initialize Repository</span>
          </button>
        </div>

        <InitRepoModal
          isOpen={isInitModalOpen}
          onClose={() => setIsInitModalOpen(false)}
          path={pendingInitPath}
          onConfirm={handleConfirmInit}
          isInitializing={isInitializing}
        />
      </div>
    );
  }

  return (
    <div
      ref={workspaceRef}
      className="flex-1 flex w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none transition-colors relative"
    >
      {/* 1. Left Changes & Commit Sidebar */}
      <GitSidebar
        status={status}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        onStageFile={handleStageFile}
        onUnstageFile={handleUnstageFile}
        onStageAll={handleStageAll}
        onUnstageAll={handleUnstageAll}
        onCommit={handleCommit}
        onPush={handlePush}
        onPull={handlePull}
        onFetch={handleFetch}
        onRefresh={() => fetchStatus()}
        onSwitchRepo={handleOpenRepo}
        isActionLoading={actionLoading}
        width={sidebarWidth}
        showToast={showToast}
      />

      {/* Draggable Vertical Resize Divider */}
      <div
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize hover:bg-brand-500/50 active:bg-brand-500 transition-colors select-none z-10 flex-shrink-0 -ml-0.5 bg-transparent"
        title="Drag to resize sidebar"
      />

      {/* 2. Right Diff Viewer Main Canvas */}
      <GitDiffViewer
        filePath={selectedFile?.path || null}
        fileChange={selectedFile}
        diffContent={diffContent}
        isLoading={isDiffLoading}
      />

      <InitRepoModal
        isOpen={isInitModalOpen}
        onClose={() => setIsInitModalOpen(false)}
        path={pendingInitPath}
        onConfirm={handleConfirmInit}
        isInitializing={isInitializing}
      />
    </div>
  );
};
