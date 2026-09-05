export interface ShortcutItem {
  id: string;
  label: string;
  keys: string[];
  targetTab?: string;
}

export const NAVIGATION_SHORTCUTS: ShortcutItem[] = [
  { id: 'nav-db', label: 'Database Workspace', keys: ['Ctrl', '1'], targetTab: 'databases' },
  { id: 'nav-cache', label: 'Redis / Cache Explorer', keys: ['Ctrl', '2'], targetTab: 'redis' },
  { id: 'nav-api', label: 'API / Request Sender', keys: ['Ctrl', '3'], targetTab: 'requests' },
  { id: 'nav-git', label: 'Source Control (Git)', keys: ['Ctrl', '4'], targetTab: 'git' },
  { id: 'nav-services', label: 'Services / Extensions', keys: ['Ctrl', '5'], targetTab: 'services' },
  { id: 'nav-terminal', label: 'Terminal', keys: ['Ctrl', '6'], targetTab: 'terminal' },
];

export const ALL_SHORTCUT_GROUPS = [
  { category: 'Workspace Navigation', items: NAVIGATION_SHORTCUTS },
];
