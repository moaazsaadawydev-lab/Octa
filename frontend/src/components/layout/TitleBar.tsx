import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Layers,
  Globe,
  Settings,
  Folder,
  Save,
  FileCode,
  ChevronDown,
  LogOut,
  FolderOpen,
  Search,
  Compass,
} from 'lucide-react';
import { ActiveSession } from '../../types/connection';
import { ActiveModule } from './ActivityBar';
import { ProjectWorkspace, RecentProject } from '../../types/project';
import { ProjectDropdownMenu } from './ProjectDropdownMenu';

interface TitleBarProps {
  activeModule: ActiveModule;
  activeSession: ActiveSession | null;
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  isSavingProject?: boolean;
  onNewProject?: () => void;
  onSaveProject?: () => void;
  onSaveProjectAs?: () => void;
  onCloseProject?: () => void;
  onOpenProject?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  recentProjects?: RecentProject[];
  onSelectRecentProject?: (filePath: string) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeModule,
  activeSession,
  activeProject,
  projectFilePath,
  onNewProject,
  onSaveProject,
  onSaveProjectAs,
  onCloseProject,
  onOpenProject,
  onOpenSettings,
  onOpenCommandPalette,
  recentProjects = [],
  onSelectRecentProject,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <div
      style={{ '--wails-draggable': 'drag' } as any}
      className="title-bar-root h-8 bg-slate-100 dark:bg-[#0c0c0c] border-b border-slate-200 dark:border-[#222222] text-slate-800 dark:text-zinc-200 flex items-center justify-between px-3 select-none flex-shrink-0 z-50 text-xs font-sans transition-all"
    >
      {/* Left: Brand Identity & Active Project */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative" ref={menuRef} style={{ '--wails-draggable': 'no-drag' } as any}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title={projectFilePath || activeProject?.name || 'Octa Projects'}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-medium text-xs group"
          >
            <Folder className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span className="truncate max-w-[150px]">{activeProject ? activeProject.name : 'Octa'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
          </button>

          <ProjectDropdownMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            activeProject={activeProject}
            projectFilePath={projectFilePath}
            onNewProject={onNewProject}
            onOpenProject={onOpenProject}
            onSaveProject={onSaveProject}
            onSaveProjectAs={onSaveProjectAs}
            onCloseProject={onCloseProject}
            onOpenSettings={onOpenSettings}
            recentProjects={recentProjects}
            onSelectRecentProject={onSelectRecentProject}
          />
        </div>

        {activeProject && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              {activeModule === 'editor' && <><FileCode className="w-3 h-3 text-zinc-500" /><span>Code Editor</span></>}
              {activeModule === 'databases' && <><Database className="w-3 h-3 text-zinc-500" /><span>Databases</span></>}
              {activeModule === 'redis' && <><Layers className="w-3 h-3 text-zinc-500" /><span>Redis</span></>}
              {activeModule === 'http' && <><Globe className="w-3 h-3 text-zinc-500" /><span>HTTP Client</span></>}
              {activeModule === 'browser' && <><Compass className="w-3 h-3 text-zinc-500" /><span>Localhost Browser</span></>}
              {activeModule === 'settings' && <><Settings className="w-3 h-3 text-zinc-500" /><span>Settings</span></>}
            </span>
          </>
        )}
      </div>

      {/* Center: Top Command Palette Search Bar Trigger */}
      <div
        className="flex-1 max-w-sm mx-4 flex items-center justify-center"
        style={{ '--wails-draggable': 'no-drag' } as any}
      >
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full h-6 px-2.5 rounded-md bg-slate-200/50 dark:bg-zinc-800/60 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300/40 dark:border-zinc-700/50 hover:border-slate-400 dark:hover:border-zinc-600 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-all cursor-pointer group shadow-2xs"
          title="Open Command Palette (Ctrl+K)"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:text-brand-500" />
            <span className="truncate">Search commands, workspaces...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Active Session Context Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 flex-shrink-0">
        {activeSession && (
          <>
            <span className="text-zinc-500 font-mono text-[10px]">
              {activeSession.connection.host}:{activeSession.connection.port}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-emerald-400 font-medium">{activeSession.activeDatabase}</span>
          </>
        )}
      </div>
    </div>
  );
};
