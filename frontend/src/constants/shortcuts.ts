export interface ShortcutItem {
  id: string;
  label: string;
  description: string;
  keys: string[];
  category: ShortcutCategory;
  targetTab?: string;
}

export type ShortcutCategory =
  | 'Workspace Navigation'
  | 'General & Window'
  | 'HTTP / API Client'
  | 'Database & SQL'
  | 'Terminal'
  | 'Source Control (Git)'
  | 'Redis Cache';

export const ALL_SHORTCUTS: ShortcutItem[] = [
  // 1. Workspace Navigation
  {
    id: 'nav-db',
    label: 'Database Workspace',
    description: 'Switch to Databases, Tables, SQL Playground, and ERD',
    keys: ['Ctrl', '1'],
    category: 'Workspace Navigation',
    targetTab: 'databases',
  },
  {
    id: 'nav-cache',
    label: 'Redis / Cache Explorer',
    description: 'Switch to Redis key-value cache explorer and workbench',
    keys: ['Ctrl', '2'],
    category: 'Workspace Navigation',
    targetTab: 'redis',
  },
  {
    id: 'nav-api',
    label: 'HTTP / Request Sender',
    description: 'Switch to HTTP and REST API request composer',
    keys: ['Ctrl', '3'],
    category: 'Workspace Navigation',
    targetTab: 'http',
  },
  {
    id: 'nav-git',
    label: 'Source Control (Git)',
    description: 'Switch to Git diffing, branch manager, commit, and push',
    keys: ['Ctrl', '4'],
    category: 'Workspace Navigation',
    targetTab: 'git',
  },
  {
    id: 'nav-docker',
    label: 'Docker Containers',
    description: 'Switch to Docker container manager, logs, and terminal',
    keys: ['Ctrl', '5'],
    category: 'Workspace Navigation',
    targetTab: 'docker',
  },
  {
    id: 'nav-terminal',
    label: 'Terminal',
    description: 'Switch to integrated multi-shell ConPTY terminal',
    keys: ['Ctrl', '6'],
    category: 'Workspace Navigation',
    targetTab: 'terminal',
  },

  // 2. General & Window
  {
    id: 'gen-save',
    label: 'Save Project',
    description: 'Save current active project workspace file (.json)',
    keys: ['Ctrl', 'S'],
    category: 'General & Window',
  },
  {
    id: 'gen-settings',
    label: 'Preferences / Settings',
    description: 'Open application preferences and configuration dialog',
    keys: ['Ctrl', ','],
    category: 'General & Window',
  },
  {
    id: 'gen-sidebar',
    label: 'Toggle Primary Sidebar',
    description: 'Collapse or expand the left explorer sidebar',
    keys: ['Ctrl', 'B'],
    category: 'General & Window',
  },
  {
    id: 'gen-escape',
    label: 'Close Modals & Dialogs',
    description: 'Dismiss open modals, popovers, or floating settings',
    keys: ['Esc'],
    category: 'General & Window',
  },

  // 3. HTTP / Request Sender
  {
    id: 'http-send',
    label: 'Send Request',
    description: 'Execute the active HTTP request immediately',
    keys: ['Ctrl', 'Enter'],
    category: 'HTTP / API Client',
  },
  {
    id: 'http-new-tab',
    label: 'New Request Tab',
    description: 'Open a new blank request tab in HTTP client',
    keys: ['Ctrl', 'T'],
    category: 'HTTP / API Client',
  },
  {
    id: 'http-close-tab',
    label: 'Close Active Tab',
    description: 'Close the currently selected request tab',
    keys: ['Ctrl', 'W'],
    category: 'HTTP / API Client',
  },

  // 4. Database & SQL Editor
  {
    id: 'db-execute',
    label: 'Execute SQL Query',
    description: 'Run the current query or highlighted SQL block in playground',
    keys: ['Ctrl', 'Enter'],
    category: 'Database & SQL',
  },
  {
    id: 'db-save-query',
    label: 'Save SQL Query',
    description: 'Save the current query to the SQL queries tree',
    keys: ['Ctrl', 'S'],
    category: 'Database & SQL',
  },
  {
    id: 'db-format',
    label: 'Format SQL Document',
    description: 'Automatically format and beautify SQL query script',
    keys: ['Ctrl', 'Shift', 'F'],
    category: 'Database & SQL',
  },

  // 5. Interactive Terminal
  {
    id: 'term-new-tab',
    label: 'New Terminal Tab',
    description: 'Spawn a new shell tab with your default shell',
    keys: ['Ctrl', 'Shift', 'T'],
    category: 'Terminal',
  },
  {
    id: 'term-close-tab',
    label: 'Close Terminal Tab',
    description: 'Terminate and close the active terminal session',
    keys: ['Ctrl', 'Shift', 'W'],
    category: 'Terminal',
  },

  // 6. Source Control (Git)
  {
    id: 'git-commit',
    label: 'Commit Changes',
    description: 'Submit commit message from the message input',
    keys: ['Ctrl', 'Enter'],
    category: 'Source Control (Git)',
  },

  // 7. Redis Cache
  {
    id: 'redis-execute',
    label: 'Execute Command',
    description: 'Run Redis CLI command from the command console',
    keys: ['Ctrl', 'Enter'],
    category: 'Redis Cache',
  },
];

export const NAVIGATION_SHORTCUTS = ALL_SHORTCUTS.filter(
  (s) => s.category === 'Workspace Navigation'
);

export interface ShortcutGroup {
  category: ShortcutCategory;
  items: ShortcutItem[];
}

export const ALL_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Workspace Navigation',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'Workspace Navigation'),
  },
  {
    category: 'General & Window',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'General & Window'),
  },
  {
    category: 'HTTP / API Client',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'HTTP / API Client'),
  },
  {
    category: 'Database & SQL',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'Database & SQL'),
  },
  {
    category: 'Terminal',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'Terminal'),
  },
  {
    category: 'Source Control (Git)',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'Source Control (Git)'),
  },
  {
    category: 'Redis Cache',
    items: ALL_SHORTCUTS.filter((s) => s.category === 'Redis Cache'),
  },
];
