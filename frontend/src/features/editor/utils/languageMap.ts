export function detectLanguage(fileName: string): string {
  const lower = fileName.toLowerCase();
  const ext = lower.split('.').pop() || '';

  // Specific filenames
  if (lower === 'dockerfile' || lower === 'containerfile') return 'dockerfile';
  if (lower.startsWith('.env')) return 'ini';
  if (lower === 'makefile') return 'makefile';

  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'css';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'py':
    case 'pyw':
      return 'python';
    case 'go':
      return 'go';
    case 'json':
      return 'json';
    case 'sql':
      return 'sql';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'ps1':
    case 'bat':
    case 'cmd':
      return 'powershell';
    case 'rs':
      return 'rust';
    case 'c':
    case 'h':
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'java':
      return 'java';
    case 'xml':
    case 'svg':
      return 'xml';
    default:
      return 'plaintext';
  }
}
