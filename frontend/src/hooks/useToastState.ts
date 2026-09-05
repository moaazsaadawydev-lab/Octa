import { useState, useCallback } from 'react';

export interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function useToastState() {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'info',
    message: '',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  return {
    toast,
    setToast,
    showToast,
  };
}
