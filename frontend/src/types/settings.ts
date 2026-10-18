export type StartupBehavior = 'last_project' | 'welcome_screen';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  onStartup: StartupBehavior;
  lastOpenedProjectFilePath?: string | null;
  theme?: ThemeMode;
  // Terminal
  terminalFontSize?: number;
  terminalCursorStyle?: 'block' | 'underline' | 'bar';
  terminalCopyOnSelect?: boolean;
  terminalShell?: string;
  // Appearance
  compactMode?: boolean;
  editorLigatures?: boolean;
  editorFontLigatures?: boolean;
  // AI Engine
  aiEnabled?: boolean;
  aiProvider?: string;
  aiApiKey?: string;
  gemini_api_key?: string;
  gemini_selected_model?: string;
  // Code Editor
  editorFontSize?: number;
  editorAutoSave?: 'off' | 'afterDelay' | 'onFocusChange';
  editorAutoSaveDelay?: number;
  editorWordWrap?: 'on' | 'off';
  editorTabSize?: number;
  // Docker Engine
  docker_default_engine?: 'windows' | 'wsl';
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  onStartup: 'last_project',
  lastOpenedProjectFilePath: null,
  theme: 'dark',
  terminalFontSize: 14,
  terminalCursorStyle: 'block',
  terminalCopyOnSelect: false,
  terminalShell: 'powershell',
  compactMode: false,
  editorLigatures: true,
  editorFontLigatures: true,
  aiEnabled: false,
  aiProvider: 'gemini-2.5-flash',
  aiApiKey: '',
  gemini_api_key: '',
  gemini_selected_model: 'gemini-2.5-flash',
  editorFontSize: 14,
  editorAutoSave: 'afterDelay',
  editorAutoSaveDelay: 1000,
  editorWordWrap: 'on',
  editorTabSize: 2,
  docker_default_engine: 'wsl',
};


