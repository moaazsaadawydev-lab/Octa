import React, { useState, useRef, useEffect } from 'react';
import appIcon from '../assets/appicon.png';
import {
  Database,
  Layers,
  Globe,
  Settings,
  Folder,
  Save,
  FileCode,
  X,
  ChevronDown,
  LogOut,
  FolderOpen,
  CheckCircle2,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import { ActiveSession } from '../types/connection';
import { ActiveModule } from './ActivityBar';
import { ProjectWorkspace } from '../types/project';

interface TitleBarProps {
  activeModule: ActiveModule;
  activeSession: ActiveSession | null;
  activeProject?: ProjectWorkspace | null;
  projectFilePath?: string | null;
  isSavingProject?: boolean;
  onSaveProject?: () => void;
  onSaveProjectAs?: () => void;
  onCloseProject?: () => void;
  onOpenProject?: () => void;
  onOpenSettings?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeModule,
  activeSession,
  activeProject,
  projectFilePath,
  isSavingProject = false,
  onSaveProject,
  onSaveProjectAs,
  onCloseProject,
  onOpenProject,
  onOpenSettings,
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
      className="h-8 bg-[#0c0c0c] border-b border-[#222222] flex items-center justify-between px-3 select-none flex-shrink-0 z-50 text-xs font-sans"
    >
      {/* Left: Brand Identity & Active Project */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <img src={appIcon} alt="Octa" className="w-3.5 h-3.5 object-contain drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]" />
          <span className="font-semibold text-zinc-200 text-xs tracking-tight">Octa</span>
        </div>

        <span className="text-zinc-600">/</span>

        {activeProject ? (
          /* Active Project Indicator & Menu Trigger */
          <div className="relative" ref={menuRef} style={{ '--wails-draggable': 'no-drag' } as any}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title={projectFilePath || 'Active Project'}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-zinc-800/80 text-zinc-200 hover:text-white transition-all cursor-pointer font-medium text-xs group"
            >
              <Folder className="w-3.5 h-3.5 text-brand-400" />
              <span className="truncate max-w-[180px]">{activeProject.name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
            </button>

            {/* Project Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1 z-50 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-500 font-mono truncate">
                  {projectFilePath || 'In-Memory Project'}
                </div>

                {onSaveProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSaveProject();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Save className="w-3.5 h-3.5 text-brand-400" />
                      <span>Save Project</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl+S</span>
                  </button>
                )}

                {onSaveProjectAs && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSaveProjectAs();
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Save Project As...</span>
                  </button>
                )}

                {onOpenProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenProject();
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Open Another Project...</span>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Preferences</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl+,</span>
                  </button>
                )}

                <div className="h-px bg-zinc-800 my-1" />

                {onCloseProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onCloseProject();
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Close Project</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-zinc-400 font-medium">Welcome</span>
        )}

        {/* Active Module Name */}
        {activeProject && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              {activeModule === 'databases' && (
                <>
                  <Database className="w-3 h-3 text-zinc-500" />
                  <span>Databases</span>
                </>
              )}
              {activeModule === 'redis' && (
                <>
                  <Layers className="w-3 h-3 text-zinc-500" />
                  <span>Redis Cache Explorer</span>
                </>
              )}
              {activeModule === 'http' && (
                <>
                  <Globe className="w-3 h-3 text-zinc-500" />
                  <span>HTTP / API Client</span>
                </>
              )}
              {activeModule === 'settings' && (
                <>
                  <Settings className="w-3 h-3 text-zinc-500" />
                  <span>Settings</span>
                </>
              )}
            </span>
          </>
        )}
      </div>

      {/* Center Context / Active Database Breadcrumb */}
      {activeSession && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="text-zinc-500 font-mono text-[10px]">
            {activeSession.connection.host}:{activeSession.connection.port}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-emerald-400 font-medium">{activeSession.activeDatabase}</span>
        </div>
      )}

      {/* Right Auto-save Status & Project Actions */}
      <div className="flex items-center gap-2" style={{ '--wails-draggable': 'no-drag' } as any}>
        {activeProject && (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
            {isSavingProject ? (
              <>
                <Loader2 className="w-3 h-3 text-brand-400 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Auto-saved</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Octa v2.0</span>
        </div>
      </div>
    </div>
  );
};
