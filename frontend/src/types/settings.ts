export type StartupBehavior = 'last_project' | 'welcome_screen';

export interface AppSettings {
  onStartup: StartupBehavior;
  lastOpenedProjectFilePath?: string | null;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  onStartup: 'last_project',
  lastOpenedProjectFilePath: null,
};
