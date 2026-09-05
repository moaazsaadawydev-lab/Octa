import React, { useState, useCallback, useRef } from 'react';
import { ProjectWorkspace, ProjectGitConfig } from '../../types/project';
import { GitSidebar } from './GitSidebar';
import { GitDiffViewer } from './GitDiffViewer';
import { GitZeroState } from './GitZeroState';
import { useGitOperations } from './useGitOperations';

interface GitWorkspaceProps {
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  activeProjectPath?: string | null;
  onUpdateGitConfig?: (config: ProjectGitConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GitWorkspace: React.FC<GitWorkspaceProps> = ({
  activeProject,
  activeProjectPath,
  onUpdateGitConfig,
  showToast,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const git = useGitOperations({
    activeProject,
    activeProjectPath,
    onUpdateGitConfig,
    showToast,
  });

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

  if (!git.repoPath || (git.status && !git.status.isRepo)) {
    return (
      <GitZeroState
        onOpenRepo={git.handleOpenRepo}
        onInitRepo={git.handleInitRepo}
        isInitModalOpen={git.isInitModalOpen}
        onCloseInitModal={() => git.setIsInitModalOpen(false)}
        pendingInitPath={git.pendingInitPath}
        onConfirmInit={git.handleConfirmInit}
        isInitializing={git.isInitializing}
      />
    );
  }

  return (
    <div
      ref={workspaceRef}
      className="flex-1 flex w-full h-full min-h-0 min-w-0 bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans select-none transition-colors relative"
    >
      {/* 1. Left Changes & Commit Sidebar */}
      <GitSidebar
        status={git.status}
        selectedFile={git.selectedFile}
        onSelectFile={git.handleSelectFile}
        onStageFile={git.handleStageFile}
        onUnstageFile={git.handleUnstageFile}
        onStageAll={git.handleStageAll}
        onUnstageAll={git.handleUnstageAll}
        onCommit={git.handleCommit}
        onPush={git.handlePush}
        onPull={git.handlePull}
        onFetch={git.handleFetch}
        onRefresh={() => git.fetchStatus()}
        onSwitchRepo={git.handleOpenRepo}
        isActionLoading={git.actionLoading}
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
        filePath={git.selectedFile?.path || null}
        fileChange={git.selectedFile}
        diffContent={git.diffContent}
        isLoading={git.isDiffLoading}
      />
    </div>
  );
};
