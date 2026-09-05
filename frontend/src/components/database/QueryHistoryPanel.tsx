import React from 'react';
import {
  QueryHistoryDrawer,
  QueryHistoryDrawerProps,
} from '../../features/database/components/QueryHistoryDrawer';

export type QueryHistoryPanelProps = QueryHistoryDrawerProps;

export const QueryHistoryPanel: React.FC<QueryHistoryPanelProps> = (props) => {
  return <QueryHistoryDrawer {...props} />;
};
