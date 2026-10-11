import { useMemo } from 'react';
import {
  Database,
  Layers,
  Globe,
  Terminal,
  GitBranch,
  Boxes,
  Settings,
  SunMoon,
  Save,
  FolderOpen,
  Plus,
  Code,
  Table,
  LayoutGrid,
  FolderPlus,
  PanelLeft,
} from 'lucide-react';
import { PaletteAction } from './types';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import { useTheme } from '../../context/ThemeContext';

interface UsePaletteActionsProps {
  state: ReturnType<typeof useWorkspaceState>;
  onClose: () => void;
}

export function usePaletteActions({ state, onClose }: UsePaletteActionsProps): PaletteAction[] {
  const { toggleTheme } = useTheme();

  return useMemo(() => {
    const act = (
      id: string,
      title: string,
      subtitle: string,
      category: PaletteAction['category'],
      icon: PaletteAction['icon'],
      shortcut: string | undefined,
      keywords: string[],
      run: () => void
    ): PaletteAction => ({
      id,
      title,
      subtitle,
      category,
      icon,
      shortcut,
      keywords,
      run: () => {
        run();
        onClose();
      },
    });

    const actions: PaletteAction[] = [
      act('ws-db', 'Switch to Databases', 'Tables, SQL Playground, ERD', 'Workspaces', Database, 'Ctrl+1', ['db', 'sql'], () => state.setActiveModule('databases')),
      act('ws-redis', 'Switch to Redis Explorer', 'Key-value explorer, TTL, Workbench', 'Workspaces', Layers, 'Ctrl+2', ['cache', 'keys'], () => state.setActiveModule('redis')),
      act('ws-http', 'Switch to HTTP Client', 'Postman-like request builder', 'Workspaces', Globe, 'Ctrl+3', ['api', 'curl', 'rest'], () => state.setActiveModule('http')),
      act('ws-git', 'Switch to Git Workspace', 'Branches, commits, diffs', 'Workspaces', GitBranch, 'Ctrl+4', ['vcs', 'commit'], () => state.setActiveModule('git')),
      act('ws-docker', 'Switch to Docker', 'Containers, logs, stats', 'Workspaces', Boxes, 'Ctrl+5', ['container', 'image'], () => state.setActiveModule('docker')),
      act('ws-term', 'Switch to Terminal', 'Multi-shell (PowerShell, WSL)', 'Workspaces', Terminal, 'Ctrl+6', ['shell', 'cmd'], () => state.setActiveModule('terminal')),

      act('db-new', 'New Database Connection', 'Add PostgreSQL, MySQL, SQLite', 'Databases', Plus, undefined, ['connect', 'add'], () => {
        state.setActiveModule('databases');
        state.setIsModalOpen(true);
      }),
      act('db-play', 'Open SQL Playground', 'Monaco SQL Editor & Explain', 'Databases', Code, undefined, ['editor', 'query'], () => {
        state.setActiveModule('databases');
        state.setDbSubView('playground');
      }),
      act('db-erd', 'Open ERD Visualizer', 'Entity relationship diagram', 'Databases', LayoutGrid, undefined, ['schema', 'graph'], () => {
        state.setActiveModule('databases');
        state.setDbSubView('erd');
      }),
      act('db-tbl', 'Open Tables & DataGrid', 'Browse & edit table rows', 'Databases', Table, undefined, ['datagrid', 'rows'], () => {
        state.setActiveModule('databases');
        state.setDbSubView('tables');
      }),

      act('redis-new', 'New Redis Connection', 'Connect to Redis instance', 'Redis', Plus, undefined, ['cache', 'add'], () => state.setActiveModule('redis')),

      act('ui-side', 'Toggle Left Sidebar', 'Show or hide secondary tree', 'General', PanelLeft, 'Ctrl+B', ['hide', 'collapse'], () => state.setIsSidebarVisible((p) => !p)),
      act('ui-theme', 'Toggle Dark / Light Theme', 'Switch visual appearance', 'General', SunMoon, undefined, ['mode', 'color'], () => toggleTheme()),
      act('ui-settings', 'Preferences / Settings', 'Configure AI, paths, editor', 'General', Settings, 'Ctrl+,', ['config', 'options'], () => state.setIsSettingsModalOpen(true)),
      act('proj-save', 'Save Current Project', 'Persist workspaces to disk', 'General', Save, 'Ctrl+S', ['save', 'export'], () => state.handleSaveProject?.()),
      act('proj-open', 'Open Existing Project', 'Load a saved .octa project', 'General', FolderOpen, undefined, ['load', 'workspace'], () => state.handleOpenProject?.()),
      act('proj-new', 'New Project Workspace', 'Create a clean new project', 'General', FolderPlus, undefined, ['create', 'blank'], () => state.handleCreateProject?.()),
    ];

    state.connections.forEach((conn) => {
      actions.push(
        act(
          `conn-${conn.id}`,
          `Connect to ${conn.name || conn.host}`,
          `${conn.type.toUpperCase()} @ ${conn.host}:${conn.port}`,
          'Databases',
          Database,
          undefined,
          ['connect', conn.name, conn.host, conn.type],
          () => {
            state.setActiveModule('databases');
            state.handleConnectDirect(conn);
          }
        )
      );
    });

    return actions;
  }, [state, onClose, toggleTheme]);
}
