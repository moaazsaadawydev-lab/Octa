import React, { useState, useEffect } from 'react';
import {
  Table,
  Terminal,
  Layers,
  ChevronRight,
  Database,
  Folder,
  FolderTree,
} from 'lucide-react';
import { ActiveSession, DbSubView, ConnectionConfig } from '../types';
import { ProjectWorkspace } from '../../../types/project';
import {
  DatabaseBreadcrumbDropdown,
  DropdownItem,
} from './DatabaseBreadcrumbDropdown';

export interface DatabaseHeaderProps {
  activeSession: ActiveSession | null;
  activeProject?: ProjectWorkspace | null;
  dbSubView: DbSubView;
  setDbSubView: (view: DbSubView) => void;
  connections?: ConnectionConfig[];
  onSelectConnection?: (conn: ConnectionConfig) => void;
  databases?: string[];
  onSelectDatabase?: (dbName: string) => void;
  onNavigateHome?: () => void;
  activeQueryTitle?: string;
  isConsoleExpanded?: boolean;
  onToggleConsole?: () => void;
}

export const DatabaseHeader: React.FC<DatabaseHeaderProps> = ({
  activeSession,
  activeProject,
  dbSubView,
  setDbSubView,
  connections = [],
  onSelectConnection,
  databases = [],
  onSelectDatabase,
  onNavigateHome,
  activeQueryTitle,
}) => {
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'server' | 'database' | 'view' | null>(null);

  useEffect(() => {
    const handleActiveTableChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setActiveTable(customEvent.detail || null);
    };
    window.addEventListener('octa:db:active-table', handleActiveTableChange);
    return () => window.removeEventListener('octa:db:active-table', handleActiveTableChange);
  }, []);

  useEffect(() => {
    setActiveTable(null);
  }, [activeSession?.connection?.id, activeSession?.activeDatabase]);

  if (!activeSession) return null;

  const conn = activeSession.connection;
  const connDisplayName = conn.name || `${conn.type?.toUpperCase() || 'DB'} (${conn.host})`;

  const serverItems: DropdownItem[] = connections.map((c) => ({
    id: c.id || `${c.host}:${c.port}`,
    label: c.name || `${c.type?.toUpperCase()} (${c.host})`,
    icon: <Database className="w-3.5 h-3.5 text-brand-500" />,
    isActive: c.id === conn.id,
    onClick: () => onSelectConnection?.(c),
  }));

  const databaseItems: DropdownItem[] = databases.map((db) => ({
    id: db,
    label: db,
    icon: <FolderTree className="w-3.5 h-3.5 text-emerald-500" />,
    isActive: db === activeSession.activeDatabase,
    onClick: () => onSelectDatabase?.(db),
  }));

  const viewItems: DropdownItem[] = [
    {
      id: 'tables',
      label: 'Tables & DataGrid',
      icon: <Table className="w-3.5 h-3.5 text-brand-500" />,
      isActive: dbSubView === 'tables',
      onClick: () => setDbSubView('tables'),
    },
    {
      id: 'playground',
      label: 'SQL Playground',
      icon: <Terminal className="w-3.5 h-3.5 text-amber-500" />,
      isActive: dbSubView === 'playground',
      onClick: () => setDbSubView('playground'),
    },
    {
      id: 'erd',
      label: 'Schema ERD Visualizer',
      icon: <Layers className="w-3.5 h-3.5 text-cyan-500" />,
      isActive: dbSubView === 'erd',
      onClick: () => setDbSubView('erd'),
    },
  ];

  return (
    <div className="h-10 px-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d12] flex items-center justify-between gap-3 text-xs select-none flex-shrink-0 z-20 font-sans relative overflow-visible">
      {/* 1. Left: Interactive Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-visible py-1">
        {/* Octa Root */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="font-bold text-slate-800 dark:text-zinc-200 hover:text-brand-500 dark:hover:text-brand-400 transition-colors cursor-pointer px-1 py-0.5 rounded text-xs flex-shrink-0"
        >
          Octa
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 flex-shrink-0" />

        {/* Project Name */}
        <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 px-1 py-0.5 rounded font-medium truncate flex-shrink-0">
          <Folder className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{activeProject?.name || 'Workspace'}</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 flex-shrink-0" />

        {/* Server Connection Dropdown */}
        <DatabaseBreadcrumbDropdown
          label={connDisplayName}
          icon={<Database className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />}
          isOpen={openDropdown === 'server'}
          onToggle={() => setOpenDropdown((prev) => (prev === 'server' ? null : 'server'))}
          onClose={() => setOpenDropdown(null)}
          items={serverItems}
          title={`Switch Connection (${conn.host}:${conn.port})`}
        />

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 flex-shrink-0" />

        {/* Database Dropdown */}
        <DatabaseBreadcrumbDropdown
          label={
            <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-zinc-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              {activeSession.activeDatabase}
            </span>
          }
          isOpen={openDropdown === 'database'}
          onToggle={() => setOpenDropdown((prev) => (prev === 'database' ? null : 'database'))}
          onClose={() => setOpenDropdown(null)}
          items={databaseItems}
          title="Switch Active Database"
        />

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-600 flex-shrink-0" />

        {/* SubView Resource (Table / Query / ERD) */}
        <DatabaseBreadcrumbDropdown
          label={
            dbSubView === 'tables'
              ? activeTable || 'All Tables'
              : dbSubView === 'playground'
              ? activeQueryTitle || 'SQL Playground'
              : 'ERD Schema'
          }
          icon={
            dbSubView === 'tables' ? (
              <Table className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
            ) : dbSubView === 'playground' ? (
              <Terminal className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
            )
          }
          isOpen={openDropdown === 'view'}
          onToggle={() => setOpenDropdown((prev) => (prev === 'view' ? null : 'view'))}
          onClose={() => setOpenDropdown(null)}
          items={viewItems}
          title="Switch Database View"
        />
      </div>

      {/* 2. Right: View Mode Switcher Control */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center bg-slate-100 dark:bg-[#141416] border border-slate-300 dark:border-zinc-800 p-0.5 rounded-lg shadow-2xs">
          <button
            type="button"
            onClick={() => setDbSubView('tables')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              dbSubView === 'tables'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-brand-500" />
            <span>Tables</span>
          </button>
          <button
            type="button"
            onClick={() => setDbSubView('playground')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              dbSubView === 'playground'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>SQL</span>
          </button>
          <button
            type="button"
            onClick={() => setDbSubView('erd')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              dbSubView === 'erd'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            <span>ERD</span>
          </button>
        </div>

        {conn.type && (
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-400 font-mono">
            {conn.type}
          </span>
        )}
      </div>
    </div>
  );
};
