export interface FileNode {
  name: string;
  path: string;
  fullPath: string;
  isDir: boolean;
  extension: string;
  size?: number;
  children?: FileNode[];
}

export type GitStatusType = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | null;

export interface EditorTab {
  id: string;
  title: string;
  fullPath: string;
  relPath: string;
  content: string;
  originalContent?: string;
  isDirty: boolean;
  language: string;
  isDiffMode?: boolean;
  isPreview?: boolean;
}

export interface GitStatusMap {
  [relPath: string]: GitStatusType;
}
