import React from 'react';

export type PaletteCategory =
  | 'Workspaces'
  | 'Databases'
  | 'Redis'
  | 'HTTP Client'
  | 'Terminal'
  | 'Git'
  | 'Docker'
  | 'General';

export interface PaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: PaletteCategory;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}
