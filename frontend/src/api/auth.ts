import { ApiClient } from './client';
import { Token, LoginRequest } from '../types';

export const login = async (data: LoginRequest): Promise<Token> => {
  const response = await ApiClient.request<Token>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    auth: false,
    headers: { 'Content-Type': 'application/json' }
  });
  ApiClient.setToken(response.access_token);
  return response;
};

export const refresh = async (refreshToken: string): Promise<Token> => {
  return ApiClient.request<Token>(`/auth/refresh?refresh_token=${refreshToken}`, {
    method: 'POST',
    auth: false
  });
};
