import React from 'react';
import appIcon from '../assets/appicon.png';
import {
  Plus,
  FolderOpen,
  Database,
  Layers,
  Globe,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  FileCode,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { RecentProject } from '../types/project';

interface WelcomeScreenProps {
  onCreateProject: () => void;
  onOpenProject: () => void;
  onSelectRecent: (filePath: string) => void;
  onRemoveRecent: (filePath: string) => void;
  onClearRecents: () => void;
  recentProjects: RecentProject[];
  isOpening?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateProject,
  onOpenProject,
  onSelectRecent,
  onRemoveRecent,
  onClearRecents,
  recentProjects,
  isOpening = false,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0c0e] text-zinc-100 font-sans overflow-y-auto select-none">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full px-8 py-12 flex-1 flex flex-col justify-between">
        {/* Header Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shadow-xl shadow-brand-500/10 p-2">
              <img src={appIcon} alt="Octa" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Octa</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  v2.0 Project-First
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                File-Centric Developer Hub for Databases, Redis Caches, and HTTP APIs
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Actions & Recents (2 Columns) */}
        <div className="grid grid-cols-12 gap-8 my-8">
          {/* Left Column: Primary Actions */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Get Started
            </div>

            <div className="space-y-3">
              {/* Create Project Card */}
              <button
                type="button"
                onClick={onCreateProject}
                disabled={isOpening}
                className="w-full p-4 rounded-2xl bg-[#141417] hover:bg-[#1a1a1f] border border-zinc-800 hover:border-brand-500/40 text-left transition-all group flex items-start gap-4 cursor-pointer shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30 group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 group-hover:text-brand-300 transition-colors flex items-center justify-between">
                    <span>Create New Project</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Choose a disk location for your new <code className="text-brand-400 font-mono">.octa</code> project workspace.
                  </p>
                </div>
              </button>

              {/* Open Project Card */}
              <button
                type="button"
                onClick={onOpenProject}
                disabled={isOpening}
                className="w-full p-4 rounded-2xl bg-[#141417] hover:bg-[#1a1a1f] border border-zinc-800 hover:border-cyan-500/40 text-left transition-all group flex items-start gap-4 cursor-pointer shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                    <span>Open Project File...</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Open an existing <code className="text-cyan-400 font-mono">.octa</code> workspace file from your local disk.
                  </p>
                </div>
              </button>
            </div>

            {/* Portable Workspace Notice */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Lock-in:</strong> Everything is stored inside your <code className="text-zinc-300 font-mono">.octa</code> file. Version it with Git or share it with your team.
              </span>
            </div>
          </div>

          {/* Right Column: Recent Projects */}
          <div className="col-span-12 lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Projects</span>
                {recentProjects.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400">
                    {recentProjects.length}
                  </span>
                )}
              </div>

              {recentProjects.length > 0 && (
                <button
                  type="button"
                  onClick={onClearRecents}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="flex-1 bg-[#141417] border border-zinc-800 rounded-2xl p-2 overflow-y-auto max-h-80 space-y-1">
              {recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-zinc-500">
                  <FileCode className="w-8 h-8 text-zinc-600 mb-2" />
                  <span className="text-xs font-semibold text-zinc-400">No Recent Projects</span>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Create or open a project to see it listed here for 1-click access.
                  </p>
                </div>
              ) : (
                recentProjects.map((rec) => (
                  <div
                    key={rec.filePath}
                    onClick={() => onSelectRecent(rec.filePath)}
                    className="w-full p-2.5 rounded-xl hover:bg-[#1c1c22] transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="p-2 rounded-lg bg-[#1a1a20] text-brand-400 group-hover:bg-brand-600/20 transition-colors flex-shrink-0">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-brand-300 transition-colors truncate">
                          {rec.name}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate" title={rec.filePath}>
                          {rec.filePath}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(rec.lastOpenedAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveRecent(rec.filePath);
                        }}
                        title="Remove from recents"
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Feature Overview Footer Cards */}
        <div className="pt-6 border-t border-zinc-800/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
            All-In-One Workspace Modules
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Card */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-brand-600/20 text-brand-400 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Databases & ERD</div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  PostgreSQL management, visual query playground, and schema ERD diagrams.
                </p>
              </div>
            </div>

            {/* Redis Card */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400 flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">Redis Cache Explorer</div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Namespace trees, TTL editor, and multi-type viewers (String, Hash, List, Set, ZSet).
                </p>
              </div>
            </div>

            {/* HTTP Card */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 flex-shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">HTTP / API Client</div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Postman-style environments, URL syntax highlighter, and binary file streaming.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
