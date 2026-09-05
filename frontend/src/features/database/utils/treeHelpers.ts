import { SqlTreeItem, SqlQueryFolder, SqlQueryItem } from '../types';

export const DEFAULT_INITIAL_QUERIES: (SqlQueryFolder | SqlQueryItem)[] = [
  {
    id: 'folder-general',
    type: 'folder',
    name: 'General Queries',
    isOpen: true,
    items: [
      {
        id: 'q-table-info',
        type: 'query',
        name: 'Get Table Info.sql',
        content: `-- Check all tables and row counts in public schema
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`,
      },
      {
        id: 'q-activity',
        type: 'query',
        name: 'Active Connections.sql',
        content: `-- List current running queries and connections
SELECT 
  pid,
  usename,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;`,
      },
    ],
  },
];

export const createDefaultQuery = (name: string = 'Untitled.sql'): SqlQueryItem => ({
  id: 'query-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'query',
  name: name.endsWith('.sql') ? name : name + '.sql',
  content: `-- New SQL Query\nSELECT NOW();`,
  createdAt: Date.now(),
});

export const createDefaultFolder = (name: string = 'New Folder'): SqlQueryFolder => ({
  id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
  type: 'folder',
  name,
  isOpen: true,
  items: [],
});

export function countQueriesInTree(item: SqlTreeItem): number {
  if (item.type === 'query') return 1;
  return item.items.reduce((sum, child) => sum + countQueriesInTree(child), 0);
}

export function findQueryById(tree: SqlTreeItem[], id: string): SqlTreeItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.type === 'folder') {
      const found = findQueryById(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

export function isDescendantQuery(tree: SqlTreeItem[], parentId: string, targetId: string): boolean {
  for (const item of tree) {
    if (item.id === parentId) {
      if (item.type === 'query') return false;
      const search = (children: SqlTreeItem[]): boolean => {
        for (const child of children) {
          if (child.id === targetId) return true;
          if (child.type === 'folder' && search(child.items)) return true;
        }
        return false;
      };
      return search(item.items);
    }
    if (item.type === 'folder') {
      if (isDescendantQuery(item.items, parentId, targetId)) return true;
    }
  }
  return false;
}

export function extractFolders(items: SqlTreeItem[], prefix: string = ''): { id: string; name: string }[] {
  let list: { id: string; name: string }[] = [];
  for (const item of items) {
    if (item.type === 'folder') {
      const label = prefix ? prefix + ' / ' + item.name : item.name;
      list.push({ id: item.id, name: label });
      if (item.items && item.items.length > 0) {
        list = list.concat(extractFolders(item.items, label));
      }
    }
  }
  return list;
}
