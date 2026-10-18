import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FilePlus,
  Save,
  FileCode,
  Settings,
  LogOut,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { ProjectWorkspace, RecentProject } from '../../types/project';

interface ProjectDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onSaveProjectAs?: () => void;
  onCloseProject?: () => void;
  onOpenSettings?: () => void;
  recentProjects?: RecentProject[];
  onSelectRecentProject?: (filePath: string) => void;
}

export const ProjectDropdownMenu: React.FC<ProjectDropdownMenuProps> = ({
  isOpen,
  onClose,
  activeProject,
  projectFilePath,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onCloseProject,
  onOpenSettings,
  recentProjects = [],
  onSelectRecentProject,
}) => {
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const topRecentProjects = recentProjects.slice(0, 5);

  const handleRecentMouseEnter = () => {
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    setIsRecentOpen(true);
  };

  const handleRecentMouseLeave = () => {
    recentTimerRef.current = setTimeout(() => setIsRecentOpen(false), 150);
  };

  const handleOtherItemHover = () => {
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    setIsRecentOpen(false);
  };

  return (
    <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
      {/* Active Project Header */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800 text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate">
        {projectFilePath || activeProject?.name || 'In-Memory Project'}
      </div>

      {/* 1. New Project */}
      {onNewProject && (
        <button
          type="button"
          onMouseEnter={handleOtherItemHover}
          onClick={() => {
            onClose();
            onNewProject();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FilePlus className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span>New Project</span>
          </div>
        </button>
      )}

      {/* 2. Open Project... */}
      {onOpenProject && (
        <button
          type="button"
          onMouseEnter={handleOtherItemHover}
          onClick={() => {
            onClose();
            onOpenProject();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Open Project...</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+O</span>
        </button>
      )}

      {/* 3. Recent Projects (Flyout Submenu on Hover) */}
      <div
        className="relative"
        onMouseEnter={handleRecentMouseEnter}
        onMouseLeave={handleRecentMouseLeave}
      >
        <button
          type="button"
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Recent Projects</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Submenu Flyout */}
        {isRecentOpen && (
          <div
            className="absolute left-[calc(100%-2px)] top-0 w-64 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 rounded-xl shadow-2xl py-1 z-50 text-xs text-slate-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
            onMouseEnter={handleRecentMouseEnter}
            onMouseLeave={handleRecentMouseLeave}
          >
            <div className="px-3 py-1 border-b border-slate-200/80 dark:border-zinc-800/80 text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
              Recent Projects ({topRecentProjects.length})
            </div>

            {topRecentProjects.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-400 dark:text-zinc-500 italic">
                No recent projects found
              </div>
            ) : (
              topRecentProjects.map((item) => (
                <button
                  key={item.id || item.filePath}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectRecentProject?.(item.filePath);
                  }}
                  className="w-full px-3 py-1.5 flex flex-col items-start hover:bg-slate-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <Folder className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 flex-shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-zinc-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 text-xs">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono truncate w-full pl-5">
                    {item.filePath}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

      {/* 4. Save Project */}
      {onSaveProject && (
        <button
          type="button"
          onMouseEnter={handleOtherItemHover}
          onClick={() => {
            onClose();
            onSaveProject();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Save className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span>Save Project</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+S</span>
        </button>
      )}

      {/* 5. Save Project As... */}
      {onSaveProjectAs && (
        <button
          type="button"
          onMouseEnter={handleOtherItemHover}
          onClick={() => {
            onClose();
            onSaveProjectAs();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          <span>Save Project As...</span>
        </button>
      )}

      <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />

      {/* 6. Preferences */}
      {onOpenSettings && (
        <button
          type="button"
          onMouseEnter={handleOtherItemHover}
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Preferences</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+,</span>
        </button>
      )}

      {/* 7. Close Project */}
      {onCloseProject && (
        <>
          <div className="h-px bg-slate-200 dark:bg-zinc-800 my-1" />
          <button
            type="button"
            onMouseEnter={handleOtherItemHover}
            onClick={() => {
              onClose();
              onCloseProject();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Close Project</span>
          </button>
        </>
      )}
    </div>
  );
};
