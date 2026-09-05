import { RedisConnectionConfig, RedisCommandResult } from '../../../types/redis';

export interface RedisWorkbenchProps {
  activeConn: RedisConnectionConfig | null;
  activeDb: number;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export interface CommandHistoryItem {
  id: string;
  command: string;
  result: RedisCommandResult;
  timestamp: string;
}

export const DEFAULT_WORKBENCH_SCRIPT = `# Redis Workbench / Playground
# Press Ctrl+Enter or Cmd+Enter to run selection or active script

# 1. Server check
PING

# 2. Key-Value String Operations
SET test:user "Octa Admin" EX 120
GET test:user

# 3. Hashes
HSET user:profile name "Moaz Saadawy" role "Architect" city "Cairo"
HGETALL user:profile

# 4. Lists & Sets
LPUSH queue:tasks "task-1" "task-2" "task-3"
LRANGE queue:tasks 0 -1
`;
