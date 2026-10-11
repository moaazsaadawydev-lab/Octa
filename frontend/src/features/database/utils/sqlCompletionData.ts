export interface SqlFunctionDef {
  name: string;
  snippet: string;
  detail: string;
}

export interface SqlSnippetDef {
  label: string;
  insertText: string;
  detail: string;
  documentation: string;
}

export const STATEMENT_KEYWORDS = [
  'SELECT',
  'INSERT INTO',
  'UPDATE',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'TRUNCATE TABLE',
  'WITH',
  'EXPLAIN ANALYZE',
  'SHOW',
  'USE',
];

export const CLAUSE_KEYWORDS = [
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL OUTER JOIN',
  'CROSS JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'SET',
  'VALUES',
  'RETURNING',
  'UNION ALL',
];

export const OPERATOR_KEYWORDS = [
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS NULL',
  'IS NOT NULL',
  'BETWEEN',
  'LIKE',
  'ILIKE',
  'EXISTS',
  'DISTINCT',
  'AS',
  'ASC',
  'DESC',
  'CASE WHEN',
  'THEN',
  'ELSE',
  'END',
];

export const SQL_FUNCTIONS: SqlFunctionDef[] = [
  { name: 'COUNT', snippet: 'COUNT(${1:*})', detail: 'Aggregate: count rows' },
  { name: 'SUM', snippet: 'SUM(${1:column})', detail: 'Aggregate: total sum' },
  { name: 'AVG', snippet: 'AVG(${1:column})', detail: 'Aggregate: average value' },
  { name: 'MIN', snippet: 'MIN(${1:column})', detail: 'Aggregate: minimum value' },
  { name: 'MAX', snippet: 'MAX(${1:column})', detail: 'Aggregate: maximum value' },
  { name: 'COALESCE', snippet: 'COALESCE(${1:val1}, ${2:default})', detail: 'Return first non-null' },
  { name: 'NOW', snippet: 'NOW()', detail: 'Current date and timestamp' },
  { name: 'CONCAT', snippet: 'CONCAT(${1:str1}, ${2:str2})', detail: 'String concatenation' },
  { name: 'LOWER', snippet: 'LOWER(${1:column})', detail: 'Convert to lowercase' },
  { name: 'UPPER', snippet: 'UPPER(${1:column})', detail: 'Convert to uppercase' },
  { name: 'LENGTH', snippet: 'LENGTH(${1:column})', detail: 'String character length' },
];

export const SQL_SNIPPETS: SqlSnippetDef[] = [
  {
    label: 'sel (SELECT * FROM ...)',
    insertText: 'SELECT * FROM ${1:table} WHERE ${2:condition};',
    detail: 'SQL Query Template',
    documentation: 'Quick SELECT query with WHERE clause',
  },
  {
    label: 'ins (INSERT INTO ...)',
    insertText: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});',
    detail: 'SQL Insert Template',
    documentation: 'Insert records into table',
  },
  {
    label: 'upd (UPDATE ... SET)',
    insertText: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};',
    detail: 'SQL Update Template',
    documentation: 'Update records matching condition',
  },
  {
    label: 'del (DELETE FROM ...)',
    insertText: 'DELETE FROM ${1:table}\nWHERE ${2:condition};',
    detail: 'SQL Delete Template',
    documentation: 'Delete records matching condition',
  },
];
