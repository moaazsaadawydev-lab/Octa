import React from 'react';
import { Terminal, Boxes } from 'lucide-react';
import clsx from 'clsx';

interface DockerEngineBadgeProps {
  activeEngine: 'windows' | 'wsl' | string;
  distro?: string;
  isOnline: boolean;
  className?: string;
  onClick?: () => void;
}

export const DockerEngineBadge: React.FC<DockerEngineBadgeProps> = ({
  activeEngine,
  distro,
  isOnline,
  className,
  onClick,
}) => {
  const isWSL = activeEngine === 'wsl';
  const label = isWSL ? `WSL2: ${distro || 'Linux'}` : 'Windows Engine';
  const endpoint = isWSL ? 'tcp://127.0.0.1:2375' : 'npipe:////./pipe/docker_engine';

  return (
    <div
      onClick={onClick}
      title={`Engine: ${label} (${endpoint}) - ${isOnline ? 'Online' : 'Offline'}`}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all select-none border',
        'bg-slate-100/90 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300',
        onClick && 'cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700',
        className
      )}
    >
      {/* Engine Icon */}
      {isWSL ? (
        <Terminal className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
      ) : (
        <Boxes className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
      )}

      {/* Label */}
      <span className="font-semibold tracking-tight truncate max-w-[120px]">
        {label}
      </span>

      {/* Real-time Health Ping Dot */}
      <span
        className={clsx(
          'w-2 h-2 rounded-full flex-shrink-0 transition-colors',
          isOnline
            ? 'bg-emerald-500 shadow-xs shadow-emerald-500/80 animate-pulse'
            : 'bg-rose-500 shadow-xs shadow-rose-500/80'
        )}
      />
    </div>
  );
};
