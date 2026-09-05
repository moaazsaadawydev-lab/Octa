import {
  RedisConnectionConfig,
  RedisScanResult,
  RedisKeyDetail,
} from '../types/redis';

export async function scanRedisKeys(
  config: RedisConnectionConfig,
  pattern: string = '*',
  cursor: number = 0,
  count: number = 500
): Promise<RedisScanResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.ScanRedisKeys === 'function'
    ) {
      return await w.go.main.App.ScanRedisKeys(config, pattern, cursor, count);
    }
  } catch (e) {
    console.warn('ScanRedisKeys binding error:', e);
  }
  return { keys: [], nextCursor: 0, totalKeys: 0 };
}

export async function getRedisKeyDetails(
  config: RedisConnectionConfig,
  key: string
): Promise<RedisKeyDetail | null> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.GetRedisKeyDetails === 'function'
    ) {
      return await w.go.main.App.GetRedisKeyDetails(config, key);
    }
  } catch (e) {
    console.warn('GetRedisKeyDetails binding error:', e);
  }
  return null;
}

export async function createRedisKey(
  config: RedisConnectionConfig,
  key: string,
  keyType: string,
  payload: any,
  ttlSeconds: number = -1
): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.CreateRedisKey === 'function'
    ) {
      return await w.go.main.App.CreateRedisKey(config, key, keyType, payload, ttlSeconds);
    }
  } catch (e) {
    console.warn('CreateRedisKey binding error:', e);
  }
  return false;
}

export async function updateRedisKey(
  config: RedisConnectionConfig,
  key: string,
  keyType: string,
  payload: any,
  ttlSeconds: number = -1
): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.UpdateRedisKey === 'function'
    ) {
      return await w.go.main.App.UpdateRedisKey(config, key, keyType, payload, ttlSeconds);
    }
  } catch (e) {
    console.warn('UpdateRedisKey binding error:', e);
  }
  return false;
}

export async function deleteRedisKey(
  config: RedisConnectionConfig,
  key: string
): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.DeleteRedisKey === 'function'
    ) {
      return await w.go.main.App.DeleteRedisKey(config, key);
    }
  } catch (e) {
    console.warn('DeleteRedisKey binding error:', e);
  }
  return false;
}

export async function deleteRedisKeysBatch(
  config: RedisConnectionConfig,
  keys: string[]
): Promise<number> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.DeleteRedisKeysBatch === 'function'
    ) {
      return await w.go.main.App.DeleteRedisKeysBatch(config, keys);
    }
  } catch (e) {
    console.warn('DeleteRedisKeysBatch binding error:', e);
  }
  return 0;
}

export async function setRedisTTL(
  config: RedisConnectionConfig,
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.SetRedisTTL === 'function'
    ) {
      return await w.go.main.App.SetRedisTTL(config, key, ttlSeconds);
    }
  } catch (e) {
    console.warn('SetRedisTTL binding error:', e);
  }
  return false;
}
