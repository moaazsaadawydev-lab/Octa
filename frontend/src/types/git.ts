export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';

export interface GitFileChange {
  path: string;
  oldPath?: string;
  status: GitFileStatus;
  staged: boolean;
}

export interface GitStatusResult {
  isRepo: boolean;
  repoPath: string;
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  stagedFiles: GitFileChange[];
  unstagedFiles: GitFileChange[];
  untrackedFiles: GitFileChange[];
}
