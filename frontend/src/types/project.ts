import { ConnectionConfig, SqlQueryFolder, SqlQueryItem } from './connection';
import { RedisConnectionConfig } from './redis';
import { Environment, EnvironmentVariable } from './environments';

export interface ProjectHttpClient {
  collections: any[];
  environments: Environment[];
  globalVariables: EnvironmentVariable[];
  activeEnvironmentId: string | null;
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
