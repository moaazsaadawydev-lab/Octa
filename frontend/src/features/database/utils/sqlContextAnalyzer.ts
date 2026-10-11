export type SqlContextType =
  | 'STATEMENT_START'
  | 'DATABASE'
  | 'TABLE'
  | 'COLUMN'
  | 'DOT_MEMBER'
  | 'GENERAL';

export interface SqlCursorContext {
  contextType: SqlContextType;
  qualifierTable?: string;
  prefix: string;
}

const TABLE_CLAUSE_REGEX =
  /\b(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|INTO|INSERT\s+INTO|UPDATE|TABLE|TRUNCATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE|DESCRIBE|DESC)\s+([a-zA-Z0-9_"]*)$/i;

const DATABASE_CLAUSE_REGEX =
  /\b(USE|DATABASE|CONNECT\s+TO)\s+([a-zA-Z0-9_"]*)$/i;

const COLUMN_CLAUSE_REGEX =
  /\b(SELECT|SELECT\s+DISTINCT|WHERE|AND|OR|HAVING|ORDER\s+BY|GROUP\s+BY|SET|ON|RETURNING)\s+([^;,]*)$/i;

export function resolveTableAlias(
  fullText: string,
  alias: string
): string | null {
  const cleanAlias = alias.toLowerCase();
  const aliasRegex =
    /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_"]+)\s+(?:AS\s+)?([a-zA-Z0-9_"]+)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = aliasRegex.exec(fullText)) !== null) {
    const rawTable = match[1].replace(/"/g, '').toLowerCase();
    const rawAlias = match[2].replace(/"/g, '').toLowerCase();
    if (rawAlias === cleanAlias) {
      return rawTable;
    }
  }
  return null;
}

export function analyzeSqlContext(
  textBeforeCursor: string,
  fullText = ''
): SqlCursorContext {
  const trimmed = textBeforeCursor.trim();

  // 1. Check for Dot Member (e.g. "users." or "u.name")
  const dotMatch = textBeforeCursor.match(/([a-zA-Z0-9_"]+)\s*\.\s*([a-zA-Z0-9_"]*)$/);
  if (dotMatch) {
    const rawQualifier = dotMatch[1].replace(/"/g, '');
    const prefix = dotMatch[2].replace(/"/g, '');
    const resolvedTable = resolveTableAlias(fullText, rawQualifier) || rawQualifier;
    return {
      contextType: 'DOT_MEMBER',
      qualifierTable: resolvedTable.toLowerCase(),
      prefix,
    };
  }

  // 2. Check for Statement Start (empty, ends with semicolon, or just whitespace)
  if (!trimmed || /;\s*$/.test(trimmed)) {
    return { contextType: 'STATEMENT_START', prefix: '' };
  }

  // 3. Check for Database Clause (e.g. "USE ...", "DATABASE ...")
  const dbMatch = textBeforeCursor.match(DATABASE_CLAUSE_REGEX);
  if (dbMatch) {
    return {
      contextType: 'DATABASE',
      prefix: (dbMatch[2] || '').replace(/"/g, ''),
    };
  }

  // 4. Check for Table Clause (e.g. "FROM ...", "JOIN ...", "INTO ...")
  const tblMatch = textBeforeCursor.match(TABLE_CLAUSE_REGEX);
  if (tblMatch) {
    return {
      contextType: 'TABLE',
      prefix: (tblMatch[2] || '').replace(/"/g, ''),
    };
  }

  // 5. Check for Column / Expression Clause (e.g. "SELECT ...", "WHERE ...")
  const colMatch = textBeforeCursor.match(COLUMN_CLAUSE_REGEX);
  if (colMatch) {
    const tokens = colMatch[2].trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || '';
    return {
      contextType: 'COLUMN',
      prefix: lastToken.replace(/"/g, ''),
    };
  }

  return { contextType: 'GENERAL', prefix: '' };
}
