import { format } from 'sql-formatter';

let isProvidersRegistered = false;

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT INTO',
  'UPDATE',
  'DELETE FROM',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL OUTER JOIN',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'TRUNCATE TABLE',
  'RETURNING',
  'UNION ALL',
  'EXISTS',
  'DISTINCT',
  'CASE WHEN',
  'COALESCE',
  'NOW()',
  'COUNT',
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'VACUUM',
  'EXPLAIN ANALYZE',
];

export function registerSqlProviders(
  monacoInstance: any,
  getTables: () => string[],
  getColumns: () => string[]
) {
  if (isProvidersRegistered) return;
  isProvidersRegistered = true;

  monacoInstance.languages.registerDocumentFormattingEditProvider('sql', {
    provideDocumentFormattingEdits: (model: any) => {
      try {
        const text = model.getValue();
        const formatted = format(text, {
          language: 'postgresql',
          keywordCase: 'upper',
          tabWidth: 2,
          linesBetweenQueries: 2,
        });
        return [{ range: model.getFullModelRange(), text: formatted }];
      } catch (e) {
        console.warn('SQL format failed:', e);
        return [];
      }
    },
  });

  monacoInstance.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      SQL_KEYWORDS.forEach((kw) => {
        suggestions.push({
          label: kw,
          kind: monacoInstance.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        });
      });

      suggestions.push({
        label: 'sel (SELECT * FROM ...)',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: 'SELECT * FROM ${1:table} WHERE ${2:condition};',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Basic SELECT statement with WHERE clause',
        range,
      });

      suggestions.push({
        label: 'ins (INSERT INTO ...)',
        kind: monacoInstance.languages.CompletionItemKind.Snippet,
        insertText: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});',
        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'INSERT statement template',
        range,
      });

      getTables().forEach((tbl) => {
        suggestions.push({
          label: tbl,
          kind: monacoInstance.languages.CompletionItemKind.Class,
          insertText: tbl,
          detail: 'Database Table',
          range,
        });
      });

      getColumns().forEach((col) => {
        suggestions.push({
          label: col,
          kind: monacoInstance.languages.CompletionItemKind.Field,
          insertText: col,
          detail: 'Table Column',
          range,
        });
      });

      return { suggestions };
    },
  });
}
