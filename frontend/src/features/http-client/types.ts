export * from '../../types/http';
export * from '../../types/environments';
export type { ProjectHttpClient } from '../../types/project';
export type { FormFieldPayload, HttpResponsePayload, HttpRequestPayload } from '../../services/api';

export interface HttpClientWorkspaceProps {
  data?: import('../../types/project').ProjectHttpClient;
  onUpdateData?: (data: import('../../types/project').ProjectHttpClient) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
