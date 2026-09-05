import { ConnectionConfig, SqlQueryFolder, SqlQueryItem } from './connection';
import { RedisConnectionConfig } from './redis';
import { Environment, EnvironmentVariable } from './environments';

export interface ProjectHttpClient {
  collections: any[];
  environments: Environment[];
  globalVariables: EnvironmentVariable[];
  activeEnvironmentId: string | null;
}

export interface ProjectGitConfig {
  repoPath: string;
  autoWatch: boolean;
  defaultBranch?: string;
}

export interface ProjectWorkspace {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  databases: ConnectionConfig[];
  sqlQueries: (SqlQueryFolder | SqlQueryItem)[];
  redis: RedisConnectionConfig[];
  httpClient: ProjectHttpClient;
  git?: ProjectGitConfig;
}


export interface ProjectFileResult {
  filePath: string;
  project?: ProjectWorkspace | null;
  error?: string;
  cancelled?: boolean;
}

export interface RecentProject {
  id: string;
  name: string;
  filePath: string;
  lastOpenedAt: string;
}

export function getProjectRootDir(projectFilePath: string | null | undefined): string {
  if (!projectFilePath) return '';
  const normalized = projectFilePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  let dir = normalized.substring(0, lastSlash);
  if (dir.endsWith('/.octa')) {
    dir = dir.substring(0, dir.length - 6);
  }
  return dir;
}

