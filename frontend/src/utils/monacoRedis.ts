/**
 * Monaco Editor Redis Language Definition & Autocomplete Provider
 * Provides syntax highlighting, keywords tokenization, and rich IntelliSense
 * for Redis CLI commands, data types, and options.
 */

import { RedisCommandDoc, REDIS_OPTIONS_KEYWORDS } from './monacoRedis/types';
import { REDIS_COMMAND_DOCS } from './monacoRedis/commands';
import { getMonarchTokensProvider } from './monacoRedis/monarchTokens';
import { createRedisCompletionItemProvider } from './monacoRedis/completionProvider';

export { REDIS_COMMAND_DOCS };
export type { RedisCommandDoc };

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

  // Monarch Token Provider for syntax highlighting
  monaco.languages.setMonarchTokensProvider(
    languageId,
    getMonarchTokensProvider(allKeywords, REDIS_OPTIONS_KEYWORDS)
  );

  // Completion Item Provider (Autocomplete & Snippets)
  monaco.languages.registerCompletionItemProvider(
    languageId,
    createRedisCompletionItemProvider(monaco, REDIS_COMMAND_DOCS, REDIS_OPTIONS_KEYWORDS)
  );

  isRegistered = true;
}
