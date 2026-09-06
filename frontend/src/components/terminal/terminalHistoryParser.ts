import { TerminalCommandBlock } from '../../types/terminalHistory';

/**
 * Determines whether a string is empty or contains only shell prompt artifacts/delimiters.
 */
export function isPromptOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (/^[|>❯➜λ%$#\s⚡]+$/.test(trimmed)) return true;
  if (/^(?:octa|powershell|ps|cmd|bash|zsh|wsl)?[\s⚡]*[|>❯➜λ%$#]+$/i.test(trimmed)) return true;
  if (/^PS\s*(?:[A-Za-z]:\\[^>]*|[^>]+)?>\s*$/i.test(trimmed)) return true;
  if (/^[A-Za-z]:\\[^>]*>\s*$/.test(trimmed)) return true;
  if (/^(?:[\w.-]+@[\w.-]+[^$#]*|MINGW64[^$#]*|[^$#\s]+)\s*[$#]\s*$/.test(trimmed)) return true;

  return false;
}

/**
 * Detects if a terminal buffer line represents a shell prompt.
 * Returns the extracted command string (or empty string if prompt has no command), or null if not a prompt.
 */
export function extractCommandFromPrompt(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Ignore npm / tool runner script sub-headers like "> octa@0.0.0 build"
  if (/^>\s+[\w@.-]+\s+build/i.test(trimmed) || /^>\s+tsc\b/i.test(trimmed)) {
    return null;
  }

  // 1. Custom / Octa / Starship prompt with |> (e.g., "Octa ⚡ |> command" or "Octa ⚡ |>")
  const customPromptMatch = trimmed.match(/^(?:.*[\s⚡])?\|>\s*(.*)$/);
  if (customPromptMatch) {
    return customPromptMatch[1].trim();
  }

  // 2. PowerShell: PS C:\Users\... > command or PS> command
  const psMatch = trimmed.match(/^PS\s*(?:[A-Za-z]:\\[^>]*|[^>]+)?>\s*(.*)$/i);
  if (psMatch) {
    return psMatch[1].trim();
  }

  // 3. Windows Command Prompt (cmd.exe): C:\path\subpath> command
  const cmdMatch = trimmed.match(/^[A-Za-z]:\\[^>]*>\s*(.*)$/);
  if (cmdMatch) {
    return cmdMatch[1].trim();
  }

  // 4. Unix / Bash / Zsh / WSL / Git Bash: user@host:...$ command or user@host:...# command
  const unixMatch = trimmed.match(/^(?:[\w.-]+@[\w.-]+[^$#]*|MINGW64[^$#]*|[^$#\s]+)\s*[$#]\s*(.*)$/);
  if (unixMatch) {
    return unixMatch[1].trim();
  }

  // 5. Starship / Modern prompt arrows (❯, ➜, λ, %, etc.):
  const symbolMatch = trimmed.match(/^(?:.*[\s\(\)])?(?:❯|➜|λ|%)\s*(.*)$/);
  if (symbolMatch) {
    return symbolMatch[1].trim();
  }

  // 6. Generic single prompt char: "> git status" or "$ git status"
  const genericMatch = trimmed.match(/^[>$]\s*(.*)$/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  // 7. Check if line is purely a prompt artifact
  if (isPromptOnly(trimmed)) {
    return '';
  }

  return null;
}

/**
 * Scans output text for common CLI error indicators and returns 1 (failure) or 0 (success).
 */
export function detectExitCode(output: string): number {
  if (!output || !output.trim()) return 0;

  const errorIndicators = [
    /\b(error|failed|failure|fatal|panic|cannot find|not found|unhandled rejection|traceback|syntax error)\b/i,
    /\b(CommandNotFoundException|ItemNotFoundException|UnauthorizedAccessException|ParameterBindingException|ObjectNotFound)\b/i,
    /\b(CategoryInfo|FullyQualifiedErrorId)\b/i,
    /No such file or directory/i,
    /Permission denied/i,
    /\bexit code [1-9]\b/i,
    /\bexit status [1-9]\b/i,
    /\berr:|\berr\s+-\b/i,
    /TS\d{4}:/i, // TypeScript compiler diagnostics
    /npm ERR!/i,
    /yarn error/i,
    /command not found/i,
  ];

  return errorIndicators.some((regex) => regex.test(output)) ? 1 : 0;
}

/**
 * Parses raw terminal buffer lines into a structured list of discrete command blocks.
 * Filters out ghost/empty commands and excludes the in-progress cursor prompt line.
 */
export function parseTerminalBufferToBlocks(lines: string[]): TerminalCommandBlock[] {
  const blocks: TerminalCommandBlock[] = [];
  let currentCmd: string | null = null;
  let currentOutput: string[] = [];
  let blockIndex = 1;

  for (const line of lines) {
    const extracted = extractCommandFromPrompt(line);
    if (extracted !== null) {
      // 1. Finalize previous command block if valid
      if (currentCmd !== null && currentCmd.trim() !== '' && !isPromptOnly(currentCmd)) {
        const outText = currentOutput.join('\n').trim();
        blocks.push({
          id: `cmd-${blockIndex++}`,
          command: currentCmd.trim(),
          output: outText,
          exitCode: detectExitCode(outText),
          timestamp: Date.now() - (lines.length - blockIndex) * 1000,
        });
      }
      currentOutput = [];

      // 2. Set new command if non-empty and not prompt-only; otherwise reset currentCmd
      if (extracted.trim() !== '' && !isPromptOnly(extracted)) {
        currentCmd = extracted.trim();
      } else {
        currentCmd = null; // Unsubmitted active prompt line
      }
    } else if (currentCmd !== null) {
      currentOutput.push(line);
    }
  }

  // Finalize last pending block ONLY if it has an executed command
  if (currentCmd !== null && currentCmd.trim() !== '' && !isPromptOnly(currentCmd)) {
    const outText = currentOutput.join('\n').trim();
    blocks.push({
      id: `cmd-${blockIndex++}`,
      command: currentCmd.trim(),
      output: outText,
      exitCode: detectExitCode(outText),
      timestamp: Date.now(),
    });
  }

  // Filter out any ghost/empty command blocks or prompt artifacts
  const filteredBlocks = blocks.filter(
    (b) => b.command.trim() !== '' && !isPromptOnly(b.command)
  );

  // Fallback: If no prompt patterns were matched but real buffer lines exist (ignoring prompt-only lines)
  if (filteredBlocks.length === 0) {
    const nonBlankLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !isPromptOnly(l));

    if (nonBlankLines.length > 0) {
      const firstLine = nonBlankLines[0];
      const rest = nonBlankLines.slice(1).join('\n').trim();
      filteredBlocks.push({
        id: 'cmd-fallback-1',
        command: firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine,
        output: rest || firstLine,
        exitCode: detectExitCode(rest || firstLine),
        timestamp: Date.now(),
      });
    }
  }

  return filteredBlocks;
}

/**
 * Concatenates the command and output of checked blocks in chronological order,
 * strictly enforcing a 3,500 characters payload cap while keeping error streams intact.
 */
export function formatSelectedCommandPayload(
  blocks: TerminalCommandBlock[],
  selectedIds: Set<string>,
  maxChars: number = 3500
): string {
  const selectedBlocks = blocks.filter((b) => selectedIds.has(b.id));
  if (selectedBlocks.length === 0) return '';

  const chunks = selectedBlocks.map((b) => {
    const cmd = `$ ${b.command}`;
    const out = b.output ? `\n${b.output}` : '';
    return `${cmd}${out}`;
  });

  let combined = chunks.join('\n\n').trim();

  if (combined.length > maxChars) {
    const sliceLen = maxChars - 32;
    let tail = combined.slice(-sliceLen);
    const firstNewline = tail.indexOf('\n');
    if (firstNewline !== -1 && firstNewline < 80) {
      tail = tail.slice(firstNewline + 1);
    }
    combined = '... [older output truncated]\n' + tail;
  }

  return combined;
}
