import { RedisCommandDoc } from './types';

export function createRedisCompletionItemProvider(
  monaco: any,
  commandDocs: RedisCommandDoc[],
  optionsKeywords: string[]
) {
  return {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = commandDocs.map((cmd) => ({
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
      }));

      const optionSuggestions = optionsKeywords.map((opt) => ({
        label: opt,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: opt,
        range,
        detail: 'Redis Option / Flag',
      }));

      return { suggestions: [...suggestions, ...optionSuggestions] };
    },
  };
}
