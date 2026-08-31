export type EnvironmentVariableType = 'default' | 'secret';

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type?: EnvironmentVariableType;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface ResolvedVariableInfo {
  key: string;
  value: string;
  source: 'environment' | 'global' | 'macro';
  isSecret?: boolean;
}
