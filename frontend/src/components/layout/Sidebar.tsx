import React from 'react';
import {
  ConnectionSidebar,
  ConnectionSidebarProps,
} from '../../features/database/components/ConnectionSidebar';

export type SidebarProps = ConnectionSidebarProps & {
  onExportDatabase?: (server: any, databaseName: string, exportData: boolean) => void;
  onImportSQL?: (server: any, databaseName: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return <ConnectionSidebar {...props} />;
};
