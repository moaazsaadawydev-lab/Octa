export type GitChangeType = 'added' | 'modified' | 'deleted';

export interface GitLineChange {
  startLine: number;
  endLine: number;
  type: GitChangeType;
}

export function computeLineDiff(original: string, current: string): GitLineChange[] {
  if (original === current) return [];

  // Newly created file
  if (!original && current) {
    const totalLines = Math.max(1, current.split('\n').length);
    return [{ startLine: 1, endLine: totalLines, type: 'added' }];
  }

  const origLines = original.split('\n');
  const currLines = current.split('\n');

  // 1. Trim common prefix
  let prefix = 0;
  while (
    prefix < origLines.length &&
    prefix < currLines.length &&
    origLines[prefix] === currLines[prefix]
  ) {
    prefix++;
  }

  // 2. Trim common suffix
  let suffix = 0;
  while (
    suffix < origLines.length - prefix &&
    suffix < currLines.length - prefix &&
    origLines[origLines.length - 1 - suffix] === currLines[currLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  const origMid = origLines.slice(prefix, origLines.length - suffix);
  const currMid = currLines.slice(prefix, currLines.length - suffix);

  // Pure additions in the middle
  if (origMid.length === 0 && currMid.length > 0) {
    return [
      {
        startLine: prefix + 1,
        endLine: prefix + currMid.length,
        type: 'added',
      },
    ];
  }

  // Pure deletions in the middle
  if (origMid.length > 0 && currMid.length === 0) {
    const line = Math.max(1, prefix);
    return [{ startLine: line, endLine: line, type: 'deleted' }];
  }

  // Both have differences - perform line LCS
  const lineMap = new Map<string, number>();
  let nextId = 1;
  const getLineId = (line: string) => {
    let id = lineMap.get(line);
    if (!id) {
      id = nextId++;
      lineMap.set(line, id);
    }
    return id;
  };

  const aIds = origMid.map(getLineId);
  const bIds = currMid.map(getLineId);

  // If middle is too large (> 500 lines), mark whole middle as modified to prevent O(N^2)
  if (aIds.length > 500 || bIds.length > 500) {
    return [
      {
        startLine: prefix + 1,
        endLine: Math.max(prefix + 1, prefix + currMid.length),
        type: 'modified',
      },
    ];
  }

  // Standard DP LCS table
  const M = aIds.length;
  const N = bIds.length;
  const dp: number[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0));

  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      if (aIds[i] === bIds[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to find edits
  let i = M;
  let j = N;
  interface DiffOp {
    type: 'same' | 'add' | 'del';
    currIndex: number;
  }
  const ops: DiffOp[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aIds[i - 1] === bIds[j - 1]) {
      ops.push({ type: 'same', currIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'add', currIndex: j - 1 });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.push({ type: 'del', currIndex: j });
      i--;
    }
  }

  ops.reverse();

  // Convert operations into contiguous line changes
  const changes: GitLineChange[] = [];
  let k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.type === 'same') {
      k++;
      continue;
    }

    let hasAdd = false;
    let hasDel = false;
    let startB = op.currIndex;
    let endB = op.currIndex;

    while (k < ops.length && ops[k].type !== 'same') {
      if (ops[k].type === 'add') {
        hasAdd = true;
        endB = Math.max(endB, ops[k].currIndex);
      } else if (ops[k].type === 'del') {
        hasDel = true;
      }
      k++;
    }

    const startLine = prefix + startB + 1;
    const endLine = prefix + (hasAdd ? endB + 1 : startB + 1);

    if (hasAdd && hasDel) {
      changes.push({ startLine, endLine, type: 'modified' });
    } else if (hasAdd) {
      changes.push({ startLine, endLine, type: 'added' });
    } else if (hasDel) {
      const delLine = Math.max(1, prefix + startB);
      changes.push({ startLine: delLine, endLine: delLine, type: 'deleted' });
    }
  }

  return changes;
}
