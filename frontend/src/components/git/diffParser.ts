export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'hunk' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

export interface SplitDiffRow {
  oldLine?: { number: number; text: string; type: 'delete' | 'context' };
  newLine?: { number: number; text: string; type: 'add' | 'context' };
  hunkHeader?: string;
}

export function parseUnifiedDiff(rawDiff: string): DiffLine[] {
  if (!rawDiff) return [];
  const lines = rawDiff.split('\n');
  const result: DiffLine[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      result.push({ type: 'header', text: line });
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'hunk', text: line });
    } else if (line.startsWith('+')) {
      result.push({
        type: 'add',
        newLineNumber: newLine,
        text: line.slice(1),
      });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({
        type: 'delete',
        oldLineNumber: oldLine,
        text: line.slice(1),
      });
      oldLine++;
    } else {
      const text = line.startsWith(' ') ? line.slice(1) : line;
      result.push({
        type: 'context',
        oldLineNumber: oldLine > 0 ? oldLine : undefined,
        newLineNumber: newLine > 0 ? newLine : undefined,
        text,
      });
      if (oldLine > 0) oldLine++;
      if (newLine > 0) newLine++;
    }
  }

  return result;
}

export function buildSplitDiff(lines: DiffLine[]): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'header') {
      i++;
      continue;
    }

    if (line.type === 'hunk') {
      rows.push({ hunkHeader: line.text });
      i++;
      continue;
    }

    if (line.type === 'context') {
      rows.push({
        oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'context' },
        newLine: { number: line.newLineNumber || 0, text: line.text, type: 'context' },
      });
      i++;
      continue;
    }

    if (line.type === 'delete') {
      const next = lines[i + 1];
      if (next && next.type === 'add') {
        rows.push({
          oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'delete' },
          newLine: { number: next.newLineNumber || 0, text: next.text, type: 'add' },
        });
        i += 2;
        continue;
      } else {
        rows.push({
          oldLine: { number: line.oldLineNumber || 0, text: line.text, type: 'delete' },
        });
        i++;
        continue;
      }
    }

    if (line.type === 'add') {
      rows.push({
        newLine: { number: line.newLineNumber || 0, text: line.text, type: 'add' },
      });
      i++;
      continue;
    }

    i++;
  }

  return rows;
}
