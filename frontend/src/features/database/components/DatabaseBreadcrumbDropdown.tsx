import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
}

interface DatabaseBreadcrumbDropdownProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: DropdownItem[];
  title?: string;
}

export const DatabaseBreadcrumbDropdown: React.FC<DatabaseBreadcrumbDropdownProps> = ({
  label,
  icon,
  isOpen,
  onToggle,
  onClose,
  items,
  title,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const dropdownWidth = 220;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 10));
      setCoords({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', onClose, true);
      return () => {
        window.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', onClose, true);
      };
    }
  }, [isOpen, onClose]);

  return (
    <div className="relative inline-flex items-center flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={items.length > 0 ? onToggle : undefined}
        title={title}
        className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors text-xs group ${
          items.length > 0 ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {icon}
        <span className="truncate max-w-[140px] font-medium">{label}</span>
        {items.length > 0 && (
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300 flex-shrink-0" />
        )}
      </button>

      {isOpen && items.length > 0 && (
        <div
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed min-w-[210px] max-h-72 overflow-y-auto bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-700/80 rounded-xl shadow-2xl py-1 z-[9999] text-xs text-slate-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100 scrollbar-thin"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left ${
                item.isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/50 dark:bg-brand-950/20'
                  : 'text-slate-700 dark:text-zinc-300'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
