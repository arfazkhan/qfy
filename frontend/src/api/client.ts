const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface RequestOptions extends RequestInit {
  auth?: boolean;
}

let accessToken: string | null = null;
let onUnauthorized: (() => Promise<void>) | null = null;

export const ApiClient = {
  setToken(token: string) {
    accessToken = token;
  },

  setUnauthorizedHandler(handler: () => Promise<void>) {
    onUnauthorized = handler;
  },

  getBaseUrl() {
    return API_BASE;
  },

  resolveStaticUrl(path: string | null | undefined) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    // Remove /api/v1 from the end to get the root host
    const host = API_BASE.split('/api/v1')[0];
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${host}${cleanPath}`;
  },

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { auth = true, ...init } = options;
    
    const headers = new Headers(init.headers);
    if (auth && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    
    try {
      const response = await fetch(url, { ...init, headers });

      if (response.status === 401 && auth && onUnauthorized) {
        await onUnauthorized();
        // Retry once after refresh
        return this.request<T>(endpoint, options);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        const error: any = new Error(errorData.detail || `Error ${response.status}: Request failed`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error(`API Request failed [${endpoint}]:`, error);
      throw error;
    }
  },

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      }
    });
  },

  async put<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      }
    });
  },

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
};
