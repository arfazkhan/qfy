import { ApiClient } from './client';
import { ScanResponse } from '../types';

export const scanImage = async (file: File): Promise<ScanResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return ApiClient.request<ScanResponse>('/scan', {
    method: 'POST',
    body: formData,
    // Note: Don't set Content-Type header manually when sending FormData, 
    // the browser will set it with the correct boundary.
  });
};
