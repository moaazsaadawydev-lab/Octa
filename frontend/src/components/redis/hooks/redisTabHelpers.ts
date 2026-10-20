import { RedisKeyDetail, RedisTab } from '../types';

export const mapDetailToTabUpdates = (detail: RedisKeyDetail) => ({
  type: detail.type,
  detail,
  isLoading: false,
  isDirty: false,
  draftString: detail.stringValue || '',
  draftHash: detail.hashValue
    ? Object.entries(detail.hashValue).map(([field, value]) => ({ field, value }))
    : [],
  draftList: detail.listValue || [],
  draftSet: detail.setValue || [],
  draftZSet: detail.zsetValue || [],
});

export function extractTabPayload(tab: RedisTab): any {
  if (tab.type === 'hash') {
    const hashObj: Record<string, string> = {};
    tab.draftHash.forEach((item) => {
      if (item.field.trim()) hashObj[item.field] = item.value;
    });
    return hashObj;
  }
  if (tab.type === 'list') return tab.draftList;
  if (tab.type === 'set') return tab.draftSet;
  if (tab.type === 'zset') return tab.draftZSet;
  return tab.draftString;
}
