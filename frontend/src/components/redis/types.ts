import {
  RedisConnectionConfig,
  RedisServerInfo,
  RedisKeyInfo,
  RedisKeyDetail,
  RedisKeyType,
  ZSetMember,
} from '../../types/redis';

export interface KeyTreeNode {
  name: string;
  fullPath: string;
  isLeaf: boolean;
  keyInfo?: RedisKeyInfo;
  children: Record<string, KeyTreeNode>;
  isOpen?: boolean;
}

export interface RedisTab {
  id: string;
  key: string;
  type: RedisKeyType;
  detail: RedisKeyDetail | null;
  isLoading: boolean;
  isDirty: boolean;
  draftString: string;
  draftHash: Array<{ field: string; value: string }>;
  draftList: string[];
  draftSet: string[];
  draftZSet: ZSetMember[];
}

export const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const getAllKeysInNode = (node: KeyTreeNode): string[] => {
  if (node.isLeaf && node.keyInfo) {
    return [node.keyInfo.key];
  }
  let result: string[] = [];
  for (const child of Object.values(node.children)) {
    result = result.concat(getAllKeysInNode(child));
  }
  return result;
};

export type {
  RedisConnectionConfig,
  RedisServerInfo,
  RedisKeyInfo,
  RedisKeyDetail,
  RedisKeyType,
  ZSetMember,
};
