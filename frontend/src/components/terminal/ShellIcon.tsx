import React from 'react';
import { Terminal, SquareTerminal, GitBranch } from 'lucide-react';
import clsx from 'clsx';

interface ShellIconProps {
  shellId?: string;
  className?: string;
}

// Clean Linux Tux Penguin SVG Icon
export const LinuxTuxIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={clsx('inline-block flex-shrink-0', className)}
  >
    <path d="M12 2C9.5 2 8 3.8 8 6.5C8 7.6 8.3 8.7 8.8 9.5C7.2 10.3 6 12 6 14C6 14.8 6.2 15.6 6.6 16.3C5.6 17.1 5 18.2 5 19.5C5 20.9 6.1 22 7.5 22C8.7 22 9.7 21.2 10 20.1C10.6 20.3 11.3 20.5 12 20.5C12.7 20.5 13.4 20.3 14 20.1C14.3 21.2 15.3 22 16.5 22C17.9 22 19 20.9 19 19.5C19 18.2 18.4 17.1 17.4 16.3C17.8 15.6 18 14.8 18 14C18 12 16.8 10.3 15.2 9.5C15.7 8.7 16 7.6 16 6.5C16 3.8 14.5 2 12 2ZM10.5 5.5C10.8 5.5 11 5.7 11 6C11 6.3 10.8 6.5 10.5 6.5C10.2 6.5 10 6.3 10 6C10 5.7 10.2 5.5 10.5 5.5ZM13.5 5.5C13.8 5.5 14 5.7 14 6C14 6.3 13.8 6.5 13.5 6.5C13.2 6.5 13 6.3 13 6C13 5.7 13.2 5.5 13.5 5.5ZM12 7.5C12.8 7.5 13.5 7.9 13.5 8.5H10.5C10.5 7.9 11.2 7.5 12 7.5ZM12 11C13.7 11 15 12.3 15 14C15 15.7 13.7 17 12 17C10.3 17 9 15.7 9 14C9 12.3 10.3 11 12 11Z" />
  </svg>
);

export const ShellIcon: React.FC<ShellIconProps> = ({ shellId = 'powershell', className }) => {
  const idLower = shellId.toLowerCase();

  // WSL / Linux
  if (idLower === 'wsl' || idLower.startsWith('wsl_') || idLower.includes('ubuntu') || idLower.includes('linux')) {
    return <LinuxTuxIcon className={clsx('text-amber-500 dark:text-amber-400', className)} />;
  }

  // Git Bash
  if (idLower === 'git-bash' || idLower.includes('bash')) {
    return <GitBranch className={clsx('text-rose-500 dark:text-rose-400', className)} />;
  }

  // Command Prompt (CMD)
  if (idLower === 'cmd') {
    return <SquareTerminal className={clsx('text-slate-500 dark:text-zinc-400', className)} />;
  }

  // PowerShell / pwsh (Default)
  return <Terminal className={clsx('text-brand-500 dark:text-brand-400', className)} />;
};
