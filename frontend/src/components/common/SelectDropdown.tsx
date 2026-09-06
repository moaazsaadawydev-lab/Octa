import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
  disabled?: boolean;
}

interface SelectDropdownProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  options,
  onChange,
  disabled = false,
  className,
  id,
}) => {
  return (
    <div className={clsx('relative inline-flex items-center', className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white dark:bg-[#0a0d13] border border-slate-300 dark:border-zinc-800/80 hover:dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className="bg-white dark:bg-[#0d1117] text-slate-800 dark:text-zinc-200 py-1.5"
          >
            {opt.label} {opt.badge ? `(${opt.badge})` : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 absolute right-2 pointer-events-none" />
    </div>
  );
};
