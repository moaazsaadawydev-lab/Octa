import { useState } from 'react';
import { GitStatusResult } from '../../types/git';
import {
  stageGitFile,
  unstageGitFile,
  stageAllGitFiles,
  unstageAllGitFiles,
  commitGitChanges,
  pushGitChanges,
  pullGitChanges,
  fetchGitChanges,
} from '../../services/api';

interface UseGitFileActionsOptions {
  repoPath: string | null;
  status: GitStatusResult | null;
  fetchStatus: () => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useGitFileActions({
  repoPath,
  status,
  fetchStatus,
  showToast,
}: UseGitFileActionsOptions) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleStageFile = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await stageGitFile(repoPath, filePath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to stage file', 'error');
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!repoPath) return;
    try {
      await unstageGitFile(repoPath, filePath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to unstage file', 'error');
    }
  };

  const handleStageAll = async () => {
    if (!repoPath) return;
    try {
      await stageAllGitFiles(repoPath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to stage all', 'error');
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath) return;
    try {
      await unstageAllGitFiles(repoPath);
      await fetchStatus();
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Failed to unstage all', 'error');
    }
  };

  const handleCommit = async (message: string) => {
    if (!repoPath) return;
    setActionLoading('commit');
    try {
      const stagedCount = status?.stagedFiles?.length || 0;
      const unstagedCount = (status?.unstagedFiles?.length || 0) + (status?.untrackedFiles?.length || 0);

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

  return {
    actionLoading,
    handleStageFile,
    handleUnstageFile,
    handleStageAll,
    handleUnstageAll,
    handleCommit,
    handlePush,
    handlePull,
    handleFetch,
  };
}
