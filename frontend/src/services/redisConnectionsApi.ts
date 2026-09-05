import {
  RedisConnectionConfig,
  RedisConnectResult,
  RedisCommandResult,
} from '../types/redis';

export async function saveRedisConnections(jsonData: string): Promise<void> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.SaveRedisConnections === 'function'
    ) {
      await w.go.main.App.SaveRedisConnections(jsonData);
      return;
    }
  } catch (e) {
    console.warn('SaveRedisConnections binding error:', e);
  }
}

export async function loadRedisConnections(): Promise<string> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.LoadRedisConnections === 'function'
    ) {
      const res = await w.go.main.App.LoadRedisConnections();
      return res || '[]';
    }
  } catch (e) {
    console.warn('LoadRedisConnections binding error:', e);
  }
  return '[]';
}

export async function connectRedis(config: RedisConnectionConfig): Promise<RedisConnectResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.ConnectRedis === 'function'
    ) {
      return await w.go.main.App.ConnectRedis(config);
    }
  } catch (e: any) {
    console.warn('ConnectRedis binding error:', e);
    return {
      success: false,
      serverInfo: {
        redisVersion: '',
        connectedClients: '0',
        usedMemoryHuman: '0B',
        totalKeys: 0,
        uptimeInDays: '0',
        rawInfo: {},
      },
      error: e?.message || String(e),
    };
  }
  return {
    success: false,
    serverInfo: {
      redisVersion: '',
      connectedClients: '0',
      usedMemoryHuman: '0B',
      totalKeys: 0,
      uptimeInDays: '0',
      rawInfo: {},
    },
    error: 'Wails bridge not available',
  };
}

export async function flushRedisDB(config: RedisConnectionConfig): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.FlushRedisDB === 'function'
    ) {
      return await w.go.main.App.FlushRedisDB(config);
    }
  } catch (e) {
    console.warn('FlushRedisDB binding error:', e);
  }
  return false;
}

export async function executeRedisCommand(
  config: RedisConnectionConfig,
  commandLine: string
): Promise<RedisCommandResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.ExecuteRedisCommand === 'function'
    ) {
      return await w.go.main.App.ExecuteRedisCommand(config, commandLine);
    }
  } catch (e: any) {
    console.warn('ExecuteRedisCommand binding error:', e);
    return {
      rawOutput: null,
      formatted: `(error) ${e?.message || String(e)}`,
      resultType: 'error',
      durationMs: 0,
      command: commandLine,
      error: e?.message || String(e),
    };
  }
  return {
    rawOutput: null,
    formatted: '(error) Wails bridge not available',
    resultType: 'error',
    durationMs: 0,
    command: commandLine,
    error: 'Wails bridge not available',
  };
}
