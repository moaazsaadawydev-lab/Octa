import { useState, useCallback, useRef } from 'react';
import { GitStatusResult, GitFileChange, InitRepoOptions } from '../../types/git';
import { ProjectWorkspace, ProjectGitConfig } from '../../types/project';
import {
  openGitRepositoryDialog,
  isGitRepository,
  initializeRepositoryWithOptions,
  getGitRepoStatus,
  getGitFileDiff,
} from '../../services/api';
import { useGitRepoDetection } from './useGitRepoDetection';
import { useGitFileActions } from './useGitFileActions';

interface UseGitOperationsOptions {
  activeProject?: ProjectWorkspace | null;
  activeProjectPath?: string | null;
  onUpdateGitConfig?: (config: ProjectGitConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useGitOperations({
  activeProject,
  activeProjectPath,
  onUpdateGitConfig,
  showToast,
}: UseGitOperationsOptions) {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitFileChange | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [isDiffLoading, setIsDiffLoading] = useState(false);

  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [pendingInitPath, setPendingInitPath] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);

  const selectedFileRef = useRef<GitFileChange | null>(null);
  const currentDiffKeyRef = useRef<string | null>(null);
  const diffContentRef = useRef<string>('');

  const loadDiff = useCallback(async (targetRepo: string, file: GitFileChange, force = false) => {
    const diffKey = `${targetRepo}:${file.path}:${file.staged}`;
    if (!force && currentDiffKeyRef.current === diffKey && diffContentRef.current) {
      return;
    }

    currentDiffKeyRef.current = diffKey;
    setIsDiffLoading(true);
    try {
      const diff = await getGitFileDiff(targetRepo, file.path, file.staged);
      setDiffContent(diff);
      diffContentRef.current = diff;
    } catch (err: any) {
      const errMsg = `Error loading diff: ${err?.message || err}`;
      setDiffContent(errMsg);
      diffContentRef.current = errMsg;
    } finally {
      setIsDiffLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(
    async (targetPath?: string, forceDiff = false) => {
      const p = targetPath || repoDetection.repoPath;
      if (!p) {
        setStatus(null);
        setSelectedFile(null);
        selectedFileRef.current = null;
        setDiffContent('');
        diffContentRef.current = '';
        currentDiffKeyRef.current = null;
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

        if (all.length === 0) {
          setSelectedFile(null);
          selectedFileRef.current = null;
          setDiffContent('');
          diffContentRef.current = '';
          currentDiffKeyRef.current = null;
        } else {
          const current = selectedFileRef.current;
          let targetFile: GitFileChange = all[0];
          if (current) {
            const matching = all.find((f) => f.path === current.path && f.staged === current.staged);
            if (matching) {
              targetFile = matching;
            }
          }
          setSelectedFile(targetFile);
          selectedFileRef.current = targetFile;
          loadDiff(p, targetFile, forceDiff);
        }
      } catch (err: any) {
        console.error('[Git FetchStatus Error]:', err);
      }
    },
    [loadDiff]
  );

  const repoDetection = useGitRepoDetection({
    activeProject,
    activeProjectPath,
    onUpdateGitConfig,
    onRepoChanged: (newRepo) => {
      if (newRepo) fetchStatus(newRepo);
      else {
        setStatus(null);
        setSelectedFile(null);
        setDiffContent('');
      }
    },
    onStatusRefreshNeeded: (repo) => fetchStatus(repo, true),
  });

  const fileActions = useGitFileActions({
    repoPath: repoDetection.repoPath,
    status,
    fetchStatus: async () => {
      await fetchStatus();
    },
    showToast,
  });

  const handleSelectFile = (file: GitFileChange) => {
    setSelectedFile(file);
    selectedFileRef.current = file;
    if (repoDetection.repoPath) {
      loadDiff(repoDetection.repoPath, file);
    }
  };

  const handleOpenRepo = async () => {
    try {
      const selected = await openGitRepositoryDialog();
      if (selected) {
        const isRepo = await isGitRepository(selected);
        if (!isRepo) {
          setPendingInitPath(selected);
          setIsInitModalOpen(true);
        } else {
          repoDetection.handleSetRepo(selected);
          fetchStatus(selected);
        }
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to open repository', 'error');
    }
  };

  const handleInitRepo = async () => {
    try {
      const selected = await openGitRepositoryDialog();
      if (selected) {
        const isRepo = await isGitRepository(selected);
        if (!isRepo) {
          setPendingInitPath(selected);
          setIsInitModalOpen(true);
        } else {
          repoDetection.handleSetRepo(selected);
          fetchStatus(selected);
        }
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to init repository', 'error');
    }
  };

  const handleConfirmInit = async (opts: InitRepoOptions) => {
    setIsInitializing(true);
    try {
      await initializeRepositoryWithOptions(opts);
      if (showToast) showToast(`Initialized Git repository "${opts.repoName}"`, 'success');
      setIsInitModalOpen(false);
      repoDetection.handleSetRepo(opts.path);
      fetchStatus(opts.path);
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to initialize repository', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  return {
    repoPath: repoDetection.repoPath,
    status,
    selectedFile,
    diffContent,
    isDiffLoading,
    actionLoading: fileActions.actionLoading,
    isInitModalOpen,
    setIsInitModalOpen,
    pendingInitPath,
    isInitializing,
    fetchStatus,
    handleSelectFile,
    handleOpenRepo,
    handleInitRepo,
    handleConfirmInit,
    handleStageFile: fileActions.handleStageFile,
    handleUnstageFile: fileActions.handleUnstageFile,
    handleStageAll: fileActions.handleStageAll,
    handleUnstageAll: fileActions.handleUnstageAll,
    handleCommit: fileActions.handleCommit,
    handlePush: fileActions.handlePush,
    handlePull: fileActions.handlePull,
    handleFetch: fileActions.handleFetch,
  };
}
