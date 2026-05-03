import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Token } from '../types';
import { login as apiLogin } from '../api/auth';
import { ApiClient } from '../api/client';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  setTokens: (tokens: Token) => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: async (username, password, _rememberMe = false) => {
        const tokens = await apiLogin({ username, password });
        set({ 
          accessToken: tokens.access_token, 
          refreshToken: tokens.refresh_token,
          isAuthenticated: true 
        });
        ApiClient.setToken(tokens.access_token);
        
        // If rememberMe is false, we can choose to clear it on app close
        // but for now we'll stick with persistent as requested
      },
      logout: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false });
        ApiClient.setToken('');
      },
      setTokens: (tokens) => {
        set({ 
          accessToken: tokens.access_token, 
          refreshToken: tokens.refresh_token,
          isAuthenticated: true 
        });
        ApiClient.setToken(tokens.access_token);
      },
      refreshSession: async () => {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) return;
        
        try {
          const response = await fetch(`${ApiClient.getBaseUrl()}/auth/refresh?refresh_token=${refreshToken}`, {
            method: 'POST'
          });
          if (response.ok) {
            const tokens = await response.json();
            useAuthStore.getState().setTokens(tokens);
          } else {
            useAuthStore.getState().logout();
          }
        } catch (e) {
          console.error("Refresh failed", e);
        }
      }
    }),
    {
      name: 'qfy-auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          ApiClient.setToken(state.accessToken);
        }
        ApiClient.setUnauthorizedHandler(async () => {
          await state?.refreshSession();
        });
      }
    }
  )
);
