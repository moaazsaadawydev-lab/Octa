import React from 'react';
import clsx from 'clsx';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  className,
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-zinc-700',
        className
      )}
    >
      <div
        className={clsx(
          'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
};
