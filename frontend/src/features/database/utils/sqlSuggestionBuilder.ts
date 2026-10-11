import { SchemaTable, SchemaColumn } from '../hooks/useMonacoSQLCompletion';
import { SQL_FUNCTIONS, SQL_SNIPPETS } from './sqlCompletionData';

export function safeSqlId(name: string): string {
  return /^[a-z_][a-z0-9_]*$/i.test(name) ? name : `"${name}"`;
}

export function buildSuggestions(
  monacoApi: any,
  range: any,
  ctx: { contextType: string; qualifierTable?: string },
  tables: SchemaTable[],
  columns: SchemaColumn[],
  databases: string[],
  statementKeywords: string[],
  clauseKeywords: string[],
  operatorKeywords: string[]
): any[] {
  const suggestions: any[] = [];

  const makeDb = (db: string, prio: string) => ({
    label: db,
    kind: monacoApi.languages.CompletionItemKind.Module,
    detail: 'Database',
    insertText: safeSqlId(db),
    range,
    sortText: `${prio}_${db}`,
  });

  const makeTbl = (tbl: SchemaTable, prio: string) => ({
    label: tbl.name,
    kind: monacoApi.languages.CompletionItemKind.Class,
    detail: 'Table',
    insertText: safeSqlId(tbl.name),
    range,
    sortText: `${prio}_${tbl.name}`,
  });

  const makeCol = (col: SchemaColumn, prio: string) => ({
    label: col.name,
    kind: monacoApi.languages.CompletionItemKind.Field,
    detail: col.tableName ? `${col.tableName}.${col.name} (${col.dataType || 'col'})` : `${col.name} (${col.dataType || 'col'})`,
    insertText: safeSqlId(col.name),
    range,
    sortText: `${prio}_${col.name}`,
  });

  const makeKw = (kw: string, prio: string) => ({
    label: kw,
    kind: monacoApi.languages.CompletionItemKind.Keyword,
    detail: 'SQL Keyword',
    insertText: kw,
    range,
    sortText: `${prio}_${kw}`,
  });

  const makeFn = (fn: (typeof SQL_FUNCTIONS)[0], prio: string) => ({
    label: fn.name,
    kind: monacoApi.languages.CompletionItemKind.Function,
    detail: fn.detail,
    insertText: fn.snippet,
    insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    sortText: `${prio}_${fn.name}`,
  });

  const makeSnip = (snip: (typeof SQL_SNIPPETS)[0], prio: string) => ({
    label: snip.label,
    kind: monacoApi.languages.CompletionItemKind.Snippet,
    detail: snip.detail,
    documentation: snip.documentation,
    insertText: snip.insertText,
    insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    sortText: `${prio}_${snip.label}`,
  });

  if (ctx.contextType === 'DOT_MEMBER' && ctx.qualifierTable) {
    const matched = columns.filter((c) => c.tableName.toLowerCase() === ctx.qualifierTable);
    if (matched.length > 0) {
      suggestions.push({
        label: '*',
        kind: monacoApi.languages.CompletionItemKind.Field,
        detail: `All columns of ${ctx.qualifierTable}`,
        insertText: '*',
        range,
        sortText: '0_*',
      });
      matched.forEach((c) => suggestions.push(makeCol(c, '0')));
      return suggestions;
    }
  }

  if (ctx.contextType === 'DATABASE') {
    databases.forEach((db) => suggestions.push(makeDb(db, '0')));
    ['DATABASE', 'SCHEMA'].forEach((kw) => suggestions.push(makeKw(kw, '1')));
    return suggestions;
  }

  if (ctx.contextType === 'TABLE') {
    tables.forEach((tbl) => suggestions.push(makeTbl(tbl, '0')));
    databases.forEach((db) => suggestions.push(makeDb(db, '1')));
    ['AS', 'ON', 'WHERE', 'SET'].forEach((kw) => suggestions.push(makeKw(kw, '2')));
    return suggestions;
  }

  if (ctx.contextType === 'COLUMN') {
    columns.forEach((c) => suggestions.push(makeCol(c, '0')));
    SQL_FUNCTIONS.forEach((fn) => suggestions.push(makeFn(fn, '1')));
    clauseKeywords.forEach((kw) => suggestions.push(makeKw(kw, '2')));
    operatorKeywords.forEach((kw) => suggestions.push(makeKw(kw, '2')));
    tables.forEach((tbl) => suggestions.push(makeTbl(tbl, '3')));
    return suggestions;
  }

  if (ctx.contextType === 'STATEMENT_START') {
    SQL_SNIPPETS.forEach((s) => suggestions.push(makeSnip(s, '0')));
    statementKeywords.forEach((kw) => suggestions.push(makeKw(kw, '1')));
    tables.forEach((tbl) => suggestions.push(makeTbl(tbl, '2')));
    return suggestions;
  }

  // GENERAL fallback
  statementKeywords.forEach((kw) => suggestions.push(makeKw(kw, '0')));
  tables.forEach((tbl) => suggestions.push(makeTbl(tbl, '1')));
  columns.forEach((c) => suggestions.push(makeCol(c, '2')));
  databases.forEach((db) => suggestions.push(makeDb(db, '3')));
  SQL_FUNCTIONS.forEach((fn) => suggestions.push(makeFn(fn, '4')));
  SQL_SNIPPETS.forEach((s) => suggestions.push(makeSnip(s, '5')));

  return suggestions;
}
