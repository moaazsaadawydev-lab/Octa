import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { HttpMethod, HTTP_METHODS } from '../types';

export interface HttpMethodDropdownProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export const HttpMethodDropdown: React.FC<HttpMethodDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = HTTP_METHODS.find((m) => m.method === value) || HTTP_METHODS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ' +
          selectedOption.badge
        }
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-32 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1 z-50 animate-scale-up backdrop-blur-md">
          {HTTP_METHODS.map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => {
                onChange(m.method);
                setIsOpen(false);
              }}
              className={
                'w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono font-bold text-left transition-colors cursor-pointer ' +
                (m.method === value
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60')
              }
            >
              <span className={m.color}>{m.label}</span>
              {m.method === value && <Check className="w-3 h-3 text-brand-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
