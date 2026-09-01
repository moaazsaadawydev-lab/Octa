/**
 * Monaco Editor Redis Language Definition & Autocomplete Provider
 * Provides syntax highlighting, keywords tokenization, and rich IntelliSense
 * for Redis CLI commands, data types, and options.
 */

interface RedisCommandDoc {
  name: string;
  syntax: string;
  snippet: string;
  doc: string;
  group: 'Strings' | 'Hashes' | 'Lists' | 'Sets' | 'Sorted Sets' | 'Keys & Server' | 'JSON' | 'Streams' | 'PubSub & Transactions';
}

export const REDIS_COMMAND_DOCS: RedisCommandDoc[] = [
  // Strings
  {
    name: 'SET',
    syntax: 'SET key value [EX seconds|PX milliseconds|EXAT timestamp|PXAT milliseconds-timestamp|KEEPTTL] [NX|XX] [GET]',
    snippet: 'SET ${1:key} "${2:value}"',
    doc: 'Set the string value of a key with optional expiration TTL and condition (NX=if not exists, XX=if exists).',
    group: 'Strings',
  },
  {
    name: 'GET',
    syntax: 'GET key',
    snippet: 'GET ${1:key}',
    doc: 'Get the string value of a key. Returns `(nil)` if the key does not exist.',
    group: 'Strings',
  },
  {
    name: 'MGET',
    syntax: 'MGET key [key ...]',
    snippet: 'MGET ${1:key1} ${2:key2}',
    doc: 'Get the values of all specified keys.',
    group: 'Strings',
  },
  {
    name: 'MSET',
    syntax: 'MSET key value [key value ...]',
    snippet: 'MSET ${1:key1} "${2:val1}" ${3:key2} "${4:val2}"',
    doc: 'Set multiple keys to multiple values atomically.',
    group: 'Strings',
  },
  {
    name: 'INCR',
    syntax: 'INCR key',
    snippet: 'INCR ${1:key}',
    doc: 'Increments the number stored at key by one. Returns the value after increment.',
    group: 'Strings',
  },
  {
    name: 'INCRBY',
    syntax: 'INCRBY key increment',
    snippet: 'INCRBY ${1:key} ${2:10}',
    doc: 'Increments the number stored at key by the specified integer increment.',
    group: 'Strings',
  },
  {
    name: 'DECR',
    syntax: 'DECR key',
    snippet: 'DECR ${1:key}',
    doc: 'Decrements the number stored at key by one.',
    group: 'Strings',
  },
  {
    name: 'DECRBY',
    syntax: 'DECRBY key decrement',
    snippet: 'DECRBY ${1:key} ${2:10}',
    doc: 'Decrements the number stored at key by the specified integer decrement.',
    group: 'Strings',
  },
  {
    name: 'APPEND',
    syntax: 'APPEND key value',
    snippet: 'APPEND ${1:key} "${2:value}"',
    doc: 'Appends a string value to a key. Returns the length of the string after append.',
    group: 'Strings',
  },
  {
    name: 'STRLEN',
    syntax: 'STRLEN key',
    snippet: 'STRLEN ${1:key}',
    doc: 'Get the length of the value stored in a key.',
    group: 'Strings',
  },

  // Hashes
  {
    name: 'HSET',
    syntax: 'HSET key field value [field value ...]',
    snippet: 'HSET ${1:key} ${2:field} "${3:value}"',
    doc: 'Sets field in the hash stored at key to value.',
    group: 'Hashes',
  },
  {
    name: 'HGET',
    syntax: 'HGET key field',
    snippet: 'HGET ${1:key} ${2:field}',
    doc: 'Get the value of a hash field.',
    group: 'Hashes',
  },
  {
    name: 'HMSET',
    syntax: 'HMSET key field value [field value ...]',
    snippet: 'HMSET ${1:key} ${2:field1} "${3:val1}" ${4:field2} "${5:val2}"',
    doc: 'Sets the specified fields to their respective values in the hash stored at key.',
    group: 'Hashes',
  },
  {
    name: 'HMGET',
    syntax: 'HMGET key field [field ...]',
    snippet: 'HMGET ${1:key} ${2:field1} ${3:field2}',
    doc: 'Get the values of all the given hash fields.',
    group: 'Hashes',
  },
  {
    name: 'HGETALL',
    syntax: 'HGETALL key',
    snippet: 'HGETALL ${1:key}',
    doc: 'Get all the fields and values in a hash.',
    group: 'Hashes',
  },
  {
    name: 'HDEL',
    syntax: 'HDEL key field [field ...]',
    snippet: 'HDEL ${1:key} ${2:field}',
    doc: 'Deletes one or more hash fields.',
    group: 'Hashes',
  },
  {
    name: 'HEXISTS',
    syntax: 'HEXISTS key field',
    snippet: 'HEXISTS ${1:key} ${2:field}',
    doc: 'Determine if a hash field exists.',
    group: 'Hashes',
  },
  {
    name: 'HKEYS',
    syntax: 'HKEYS key',
    snippet: 'HKEYS ${1:key}',
    doc: 'Get all the fields in a hash.',
    group: 'Hashes',
  },
  {
    name: 'HVALS',
    syntax: 'HVALS key',
    snippet: 'HVALS ${1:key}',
    doc: 'Get all the values in a hash.',
    group: 'Hashes',
  },
  {
    name: 'HLEN',
    syntax: 'HLEN key',
    snippet: 'HLEN ${1:key}',
    doc: 'Get the number of fields in a hash.',
    group: 'Hashes',
  },
  {
    name: 'HINCRBY',
    syntax: 'HINCRBY key field increment',
    snippet: 'HINCRBY ${1:key} ${2:field} ${3:1}',
    doc: 'Increment the integer value of a hash field by the given number.',
    group: 'Hashes',
  },

  // Lists
  {
    name: 'LPUSH',
    syntax: 'LPUSH key element [element ...]',
    snippet: 'LPUSH ${1:key} "${2:element}"',
    doc: 'Prepend one or multiple elements to the head of a list.',
    group: 'Lists',
  },
  {
    name: 'RPUSH',
    syntax: 'RPUSH key element [element ...]',
    snippet: 'RPUSH ${1:key} "${2:element}"',
    doc: 'Append one or multiple elements to the tail of a list.',
    group: 'Lists',
  },
  {
    name: 'LPOP',
    syntax: 'LPOP key [count]',
    snippet: 'LPOP ${1:key}',
    doc: 'Removes and returns the first elements of the list stored at key.',
    group: 'Lists',
  },
  {
    name: 'RPOP',
    syntax: 'RPOP key [count]',
    snippet: 'RPOP ${1:key}',
    doc: 'Removes and returns the last elements of the list stored at key.',
    group: 'Lists',
  },
  {
    name: 'LRANGE',
    syntax: 'LRANGE key start stop',
    snippet: 'LRANGE ${1:key} ${2:0} ${3:-1}',
    doc: 'Get a range of elements from a list (0 is first, -1 is last).',
    group: 'Lists',
  },
  {
    name: 'LLEN',
    syntax: 'LLEN key',
    snippet: 'LLEN ${1:key}',
    doc: 'Get the length of a list.',
    group: 'Lists',
  },
  {
    name: 'LINDEX',
    syntax: 'LINDEX key index',
    snippet: 'LINDEX ${1:key} ${2:0}',
    doc: 'Get an element from a list by its index.',
    group: 'Lists',
  },
  {
    name: 'LSET',
    syntax: 'LSET key index element',
    snippet: 'LSET ${1:key} ${2:0} "${3:element}"',
    doc: 'Set the value of an element in a list by its index.',
    group: 'Lists',
  },
  {
    name: 'LREM',
    syntax: 'LREM key count element',
    snippet: 'LREM ${1:key} ${2:1} "${3:element}"',
    doc: 'Remove elements from a list matching the specified element.',
    group: 'Lists',
  },

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

  // Keys & Server
  {
    name: 'DEL',
    syntax: 'DEL key [key ...]',
    snippet: 'DEL ${1:key}',
    doc: 'Delete one or more keys. Returns the number of keys removed.',
    group: 'Keys & Server',
  },
  {
    name: 'EXISTS',
    syntax: 'EXISTS key [key ...]',
    snippet: 'EXISTS ${1:key}',
    doc: 'Determine if one or more keys exist (returns count of existing keys).',
    group: 'Keys & Server',
  },
  {
    name: 'EXPIRE',
    syntax: 'EXPIRE key seconds [NX|XX|GT|LT]',
    snippet: 'EXPIRE ${1:key} ${2:60}',
    doc: 'Set a key\'s time to live in seconds.',
    group: 'Keys & Server',
  },
  {
    name: 'TTL',
    syntax: 'TTL key',
    snippet: 'TTL ${1:key}',
    doc: 'Get the time to live for a key in seconds (-1=persistent, -2=expired/not exists).',
    group: 'Keys & Server',
  },
  {
    name: 'PERSIST',
    syntax: 'PERSIST key',
    snippet: 'PERSIST ${1:key}',
    doc: 'Remove the expiration from a key, making it persistent.',
    group: 'Keys & Server',
  },
  {
    name: 'TYPE',
    syntax: 'TYPE key',
    snippet: 'TYPE ${1:key}',
    doc: 'Determine the type stored at key (string, list, set, zset, hash, stream, none).',
    group: 'Keys & Server',
  },
  {
    name: 'KEYS',
    syntax: 'KEYS pattern',
    snippet: 'KEYS ${1:*}',
    doc: 'Find all keys matching the given pattern (e.g. `*`, `user:*`). Use with care on large production databases.',
    group: 'Keys & Server',
  },
  {
    name: 'SCAN',
    syntax: 'SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]',
    snippet: 'SCAN ${1:0} MATCH ${2:*} COUNT ${3:100}',
    doc: 'Incrementally iterate the keyspace using a cursor.',
    group: 'Keys & Server',
  },
  {
    name: 'PING',
    syntax: 'PING [message]',
    snippet: 'PING',
    doc: 'Ping the Redis server. Returns `PONG` or the echoed message.',
    group: 'Keys & Server',
  },
  {
    name: 'INFO',
    syntax: 'INFO [section]',
    snippet: 'INFO ${1:all}',
    doc: 'Get information and statistics about the Redis server (server, clients, memory, persistence, stats, cpu, keyspace).',
    group: 'Keys & Server',
  },
  {
    name: 'DBSIZE',
    syntax: 'DBSIZE',
    snippet: 'DBSIZE',
    doc: 'Return the total number of keys in the currently-selected database.',
    group: 'Keys & Server',
  },
  {
    name: 'SELECT',
    syntax: 'SELECT index',
    snippet: 'SELECT ${1:0}',
    doc: 'Change the selected database for the current connection.',
    group: 'Keys & Server',
  },
  {
    name: 'FLUSHDB',
    syntax: 'FLUSHDB [ASYNC|SYNC]',
    snippet: 'FLUSHDB',
    doc: 'Remove all keys from the current database.',
    group: 'Keys & Server',
  },
  {
    name: 'FLUSHALL',
    syntax: 'FLUSHALL [ASYNC|SYNC]',
    snippet: 'FLUSHALL',
    doc: 'Remove all keys from all databases on the Redis server.',
    group: 'Keys & Server',
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

let isRegistered = false;

/**
 * Registers the Redis language and IntelliSense provider in Monaco Editor.
 */
export function registerRedisLanguage(monaco: any): void {
  if (isRegistered || !monaco) return;

  const languageId = 'redis';

  // Register language ID
  monaco.languages.register({ id: languageId });

  // Language configuration (comments, brackets)
  monaco.languages.setLanguageConfiguration(languageId, {
    comments: {
      lineComment: '#',
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  const allKeywords = REDIS_COMMAND_DOCS.map((c) => c.name);
  const optionsKeywords = [
    'EX', 'PX', 'EXAT', 'PXAT', 'NX', 'XX', 'KEEPTTL', 'GET',
    'WITHSCORES', 'LIMIT', 'MATCH', 'COUNT', 'TYPE', 'ASC', 'DESC',
    'BYSCORE', 'BYLEX', 'REV', 'SYNC', 'ASYNC', 'STREAMS', 'BLOCK',
  ];

  // Monarch Token Provider for syntax highlighting
  monaco.languages.setMonarchTokensProvider(languageId, {
    defaultToken: 'invalid',
    ignoreCase: true,
    tokenPostfix: '.redis',

    keywords: allKeywords,
    options: optionsKeywords,

    typeKeywords: [
      'string', 'hash', 'list', 'set', 'zset', 'stream', 'json',
    ],

    operators: ['+', '-', '*', '/', '%', '=', '<', '>', '<=', '>=', '==', '!='],

    // Common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // Identifiers and keywords
        [/[a-zA-Z_\\$][\w\\$\\.]*/, {
          cases: {
            '@keywords': 'keyword',
            '@options': 'type',
            '@typeKeywords': 'type.identifier',
            '@default': 'identifier',
          },
        }],

        // Whitespace
        { include: '@whitespace' },

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        }],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/(#|\/\/).*$/, 'comment'],
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  });

  // Completion Item Provider (Autocomplete & Snippets)
  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = REDIS_COMMAND_DOCS.map((cmd) => {
        return {
          label: {
            label: cmd.name,
            detail: ` [${cmd.group}]`,
            description: cmd.syntax,
          },
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: cmd.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: {
            value: [
              `### \`${cmd.syntax}\``,
              `**Category**: *${cmd.group}*`,
              '',
              cmd.doc,
            ].join('\n\n'),
            isTrusted: true,
          },
          range,
        };
      });

      // Also add options keywords suggestions
      const optionSuggestions = optionsKeywords.map((opt) => ({
        label: opt,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: opt,
        range,
        detail: 'Redis Option / Flag',
      }));

      return { suggestions: [...suggestions, ...optionSuggestions] };
    },
  });

  isRegistered = true;
}
