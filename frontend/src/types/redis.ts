export type RedisKeyType = 'string' | 'hash' | 'list' | 'set' | 'zset';

export interface RedisConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  ssl?: boolean;
}

export interface RedisServerInfo {
  redisVersion: string;
  connectedClients: string;
  usedMemoryHuman: string;
  totalKeys: number;
  uptimeInDays: string;
  rawInfo: Record<string, string>;
}

export interface RedisConnectResult {
  success: boolean;
  serverInfo: RedisServerInfo;
  error?: string;
}

export interface RedisKeyInfo {
  key: string;
  type: RedisKeyType;
  ttl: number; // seconds: -1 = persistent, -2 = expired/not found
  memoryUsage: number; // bytes
}

export interface RedisScanResult {
  keys: RedisKeyInfo[];
  nextCursor: number;
  totalKeys: number;
}

export interface ZSetMember {
  member: string;
  score: number;
}

export interface RedisKeyDetail {
  key: string;
  type: RedisKeyType;
  ttl: number;
  memoryUsage: number;
  stringValue?: string;
  hashValue?: Record<string, string>;
  listValue?: string[];
  setValue?: string[];
  zsetValue?: ZSetMember[];
}

export interface RedisCommandResult {
  rawOutput: any;
  formatted: string;
  resultType: 'string' | 'integer' | 'slice' | 'map' | 'status' | 'error' | 'nil' | 'float' | 'null';
  durationMs: number;
  command: string;
  error?: string;
}
