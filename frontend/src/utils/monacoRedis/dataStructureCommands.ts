import { RedisCommandDoc } from './types';

export const DATA_STRUCTURE_COMMANDS: RedisCommandDoc[] = [
  // Sets
  {
    name: 'SADD',
    syntax: 'SADD key member [member ...]',
    snippet: 'SADD ${1:key} "${2:member}"',
    doc: 'Add one or more members to a set.',
    group: 'Sets',
  },
  {
    name: 'SMEMBERS',
    syntax: 'SMEMBERS key',
    snippet: 'SMEMBERS ${1:key}',
    doc: 'Get all the members in a set.',
    group: 'Sets',
  },
  {
    name: 'SREM',
    syntax: 'SREM key member [member ...]',
    snippet: 'SREM ${1:key} "${2:member}"',
    doc: 'Remove one or more members from a set.',
    group: 'Sets',
  },
  {
    name: 'SISMEMBER',
    syntax: 'SISMEMBER key member',
    snippet: 'SISMEMBER ${1:key} "${2:member}"',
    doc: 'Determine if a given value is a member of a set (1=yes, 0=no).',
    group: 'Sets',
  },
  {
    name: 'SCARD',
    syntax: 'SCARD key',
    snippet: 'SCARD ${1:key}',
    doc: 'Get the number of members in a set.',
    group: 'Sets',
  },
  {
    name: 'SPOP',
    syntax: 'SPOP key [count]',
    snippet: 'SPOP ${1:key}',
    doc: 'Remove and return one or multiple random members from a set.',
    group: 'Sets',
  },
  {
    name: 'SUNION',
    syntax: 'SUNION key [key ...]',
    snippet: 'SUNION ${1:key1} ${2:key2}',
    doc: 'Add multiple sets and return the resulting set.',
    group: 'Sets',
  },
  {
    name: 'SINTER',
    syntax: 'SINTER key [key ...]',
    snippet: 'SINTER ${1:key1} ${2:key2}',
    doc: 'Intersect multiple sets and return the resulting set.',
    group: 'Sets',
  },
  {
    name: 'SDIFF',
    syntax: 'SDIFF key [key ...]',
    snippet: 'SDIFF ${1:key1} ${2:key2}',
    doc: 'Subtract multiple sets and return the difference.',
    group: 'Sets',
  },

  // Sorted Sets
  {
    name: 'ZADD',
    syntax: 'ZADD key [NX|XX] [GT|LT] [CH] [INCR] score member [score member ...]',
    snippet: 'ZADD ${1:key} ${2:1.0} "${3:member}"',
    doc: 'Add one or more members to a sorted set, or update its score if it already exists.',
    group: 'Sorted Sets',
  },
  {
    name: 'ZRANGE',
    syntax: 'ZRANGE key start stop [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]',
    snippet: 'ZRANGE ${1:key} ${2:0} ${3:-1} WITHSCORES',
    doc: 'Return a range of members in a sorted set by index or score.',
    group: 'Sorted Sets',
  },
  {
    name: 'ZREM',
    syntax: 'ZREM key member [member ...]',
    snippet: 'ZREM ${1:key} "${2:member}"',
    doc: 'Remove one or more members from a sorted set.',
    group: 'Sorted Sets',
  },
  {
    name: 'ZCARD',
    syntax: 'ZCARD key',
    snippet: 'ZCARD ${1:key}',
    doc: 'Get the number of members in a sorted set.',
    group: 'Sorted Sets',
  },
  {
    name: 'ZSCORE',
    syntax: 'ZSCORE key member',
    snippet: 'ZSCORE ${1:key} "${2:member}"',
    doc: 'Get the score associated with the given member in a sorted set.',
    group: 'Sorted Sets',
  },
  {
    name: 'ZRANK',
    syntax: 'ZRANK key member',
    snippet: 'ZRANK ${1:key} "${2:member}"',
    doc: 'Determine the index of a member in a sorted set (ordered lowest to highest score).',
    group: 'Sorted Sets',
  },
  {
    name: 'ZREVRANK',
    syntax: 'ZREVRANK key member',
    snippet: 'ZREVRANK ${1:key} "${2:member}"',
    doc: 'Determine the index of a member in a sorted set (ordered highest to lowest score).',
    group: 'Sorted Sets',
  },

  // JSON
  {
    name: 'JSON.SET',
    syntax: 'JSON.SET key path value [NX|XX]',
    snippet: 'JSON.SET ${1:key} ${2:$} \'${3:{"name": "Octa"}}\'',
    doc: 'Set the JSON value at path in key (requires RedisJSON module).',
    group: 'JSON',
  },
  {
    name: 'JSON.GET',
    syntax: 'JSON.GET key [INDENT indent] [NEWLINE newline] [SPACE space] [path ...]',
    snippet: 'JSON.GET ${1:key} ${2:$}',
    doc: 'Return the value at path in JSON format (requires RedisJSON module).',
    group: 'JSON',
  },
  {
    name: 'JSON.DEL',
    syntax: 'JSON.DEL key [path]',
    snippet: 'JSON.DEL ${1:key} ${2:$}',
    doc: 'Delete a JSON value at path (requires RedisJSON module).',
    group: 'JSON',
  },

  // Streams
  {
    name: 'XADD',
    syntax: 'XADD key [NOMKSTREAM] [MAXLEN|MINID [=|~] threshold [LIMIT count]] *|id field value [field value ...]',
    snippet: 'XADD ${1:stream_key} * ${2:sensor} "${3:temperature}" ${4:val} ${5:25.4}',
    doc: 'Appends the specified stream entry to the stream at key.',
    group: 'Streams',
  },
  {
    name: 'XREAD',
    syntax: 'XREAD [COUNT count] [BLOCK milliseconds] STREAMS key [key ...] id [id ...]',
    snippet: 'XREAD COUNT ${1:10} STREAMS ${2:stream_key} ${3:0-0}',
    doc: 'Read data from one or multiple streams, only returning entries with an ID greater than the specified ID.',
    group: 'Streams',
  },
  {
    name: 'XRANGE',
    syntax: 'XRANGE key start end [COUNT count]',
    snippet: 'XRANGE ${1:stream_key} ${2:-} ${3:+} COUNT ${4:50}',
    doc: 'Return a range of elements in a stream between start and end IDs.',
    group: 'Streams',
  },
  {
    name: 'XLEN',
    syntax: 'XLEN key',
    snippet: 'XLEN ${1:key}',
    doc: 'Return the number of entries in a stream.',
    group: 'Streams',
  },

  // PubSub & Transactions
  {
    name: 'PUBLISH',
    syntax: 'PUBLISH channel message',
    snippet: 'PUBLISH ${1:channel} "${2:message}"',
    doc: 'Post a message to a channel.',
    group: 'PubSub & Transactions',
  },
  {
    name: 'MULTI',
    syntax: 'MULTI',
    snippet: 'MULTI',
    doc: 'Mark the start of a transaction block.',
    group: 'PubSub & Transactions',
  },
  {
    name: 'EXEC',
    syntax: 'EXEC',
    snippet: 'EXEC',
    doc: 'Execute all commands issued after MULTI.',
    group: 'PubSub & Transactions',
  },
  {
    name: 'DISCARD',
    syntax: 'DISCARD',
    snippet: 'DISCARD',
    doc: 'Discard all commands issued after MULTI.',
    group: 'PubSub & Transactions',
  },
];
