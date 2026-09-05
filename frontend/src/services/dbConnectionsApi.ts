import {
  TestConnection,
  SaveConnection,
  GetSavedConnections,
  GetDatabases,
  DeleteConnection,
} from '../../wailsjs/go/main/App';
import { main } from '../../wailsjs/go/models';
import { ConnectionConfig } from '../types/connection';

export function toModelConfig(config: ConnectionConfig): main.ConnectionConfig {
  return main.ConnectionConfig.createFrom({
    id: config.id || '',
    name: config.name,
    type: config.type || 'postgres',
    host: config.host,
    port: Number(config.port) || 5432,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: Boolean(config.ssl),
  });
}

export function parseResult(res: any): { success: boolean; message: string } {
  if (Array.isArray(res)) {
    return {
      success: Boolean(res[0]),
      message: String(res[1] || (res[0] ? 'Success' : 'Failed')),
    };
  }
  if (typeof res === 'object' && res !== null) {
    if ('r0' in res && 'r1' in res) {
      return {
        success: Boolean(res.r0),
        message: String(res.r1),
      };
    }
    if ('success' in res) {
      return {
        success: Boolean(res.success),
        message: String(res.message || ''),
      };
    }
  }
  if (typeof res === 'boolean') {
    return {
      success: res,
      message: res ? 'Success' : 'Failed',
    };
  }
  if (typeof res === 'string') {
    return {
      success: true,
      message: res,
    };
  }
  return {
    success: false,
    message: 'Unknown response format',
  };
}

export async function testConnection(
  config: ConnectionConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const model = toModelConfig(config);
    const res = await TestConnection(model);
    return parseResult(res);
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || String(err) || 'Connection failed',
    };
  }
}

export async function saveConnection(
  config: ConnectionConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const model = toModelConfig(config);
    const res = await SaveConnection(model);
    return parseResult(res);
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || String(err) || 'Failed to save connection',
    };
  }
}

export async function getSavedConnections(): Promise<ConnectionConfig[]> {
  try {
    const res = await GetSavedConnections();
    if (!res || !Array.isArray(res)) return [];
    return res.map((item) => ({
      id: item.id,
      name: item.name,
      type: (item.type as 'postgres' | 'mysql' | 'mongodb') || 'postgres',
      host: item.host,
      port: item.port,
      database: item.database,
      username: item.username,
      password: item.password,
      ssl: item.ssl,
    }));
  } catch (err) {
    console.error('Failed to load saved connections:', err);
    return [];
  }
}

export async function getDatabases(config: ConnectionConfig): Promise<string[]> {
  try {
    const model = toModelConfig(config);
    const dbs = await GetDatabases(model);
    return dbs || [];
  } catch (err: any) {
    console.error('Failed to get databases:', err);
    throw err;
  }
}

export async function deleteConnection(id: string): Promise<boolean> {
  try {
    return await DeleteConnection(id);
  } catch (err) {
    console.error('Failed to delete connection:', err);
    return false;
  }
}

export async function clearAppCache(): Promise<boolean> {
  try {
    if (typeof (window as any)?.go?.main?.App?.ClearAppCache === 'function') {
      return await (window as any).go.main.App.ClearAppCache();
    }
    return true;
  } catch (err) {
    console.warn('[CachePurge] Backend clearAppCache error:', err);
    return false;
  }
}
