export type StartupBehavior = 'last_project' | 'welcome_screen';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  onStartup: StartupBehavior;
  lastOpenedProjectFilePath?: string | null;
  theme?: ThemeMode;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  onStartup: 'last_project',
  lastOpenedProjectFilePath: null,
  theme: 'dark',
};
