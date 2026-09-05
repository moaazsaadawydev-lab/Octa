export interface RedisCommandDoc {
  name: string;
  syntax: string;
  snippet: string;
  doc: string;
  group:
    | 'Strings'
    | 'Hashes'
    | 'Lists'
    | 'Sets'
    | 'Sorted Sets'
    | 'Keys & Server'
    | 'JSON'
    | 'Streams'
    | 'PubSub & Transactions';
}

export const REDIS_OPTIONS_KEYWORDS = [
  'EX',
  'PX',
  'EXAT',
  'PXAT',
  'NX',
  'XX',
  'KEEPTTL',
  'GET',
  'WITHSCORES',
  'LIMIT',
  'MATCH',
  'COUNT',
  'TYPE',
  'ASC',
  'DESC',
  'BYSCORE',
  'BYLEX',
  'REV',
  'SYNC',
  'ASYNC',
  'STREAMS',
  'BLOCK',
];
