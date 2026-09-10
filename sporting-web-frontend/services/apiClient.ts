import { tokenManager } from '../utils/tokenManager';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
  access_token?: string;
  statusCode?: number;
}

const isAuthEndpoint = (endpoint: string): boolean => {
  return (
    endpoint.includes('/auth/') ||
    endpoint.includes('/register-user') ||
    endpoint.includes('/forgot-password')
  );
};

/**
 * Executes clear Auth Token operation.
 */
const clearAuthToken = () => {
  tokenManager.clearTabSession();
  window.dispatchEvent(new Event('auth:unauthorized'));
};

let isRefreshing = false;
let refreshSubscribers: ((newToken: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (newToken: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function attemptRefreshToken(): Promise<string | null> {
  const rfToken = tokenManager.getActiveRefreshToken();
  if (!rfToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rfToken }),
    });

    if (!response.ok) return null;

    const data = await response.json().catch(() => ({}));
    const resPayload = data.data !== undefined ? data.data : data;
    const newAccessToken = resPayload?.access_token || data?.access_token;
    const newRefreshToken = resPayload?.refresh_token || data?.refresh_token || rfToken;

    if (newAccessToken) {
      const activeUser = tokenManager.getActiveUsername() || '';
      tokenManager.saveAccountToken(activeUser, newAccessToken, newRefreshToken);
      return newAccessToken;
    }
  } catch {
  }
  return null;
}

// Map to deduplicate concurrent identical GET requests across the app
const inFlightGetRequests = new Map<string, Promise<ApiResponse<any>>>();

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = tokenManager.getActiveToken() || 'anon';
  const dedupeKey = isGet && !isRetry ? `${token}:${endpoint}` : null;

  if (dedupeKey && inFlightGetRequests.has(dedupeKey)) {
    return inFlightGetRequests.get(dedupeKey)! as Promise<ApiResponse<T>>;
  }

  const execute = async (): Promise<ApiResponse<T>> => {
    try {
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const headers: Record<string, string> = {};
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const activeToken = tokenManager.getActiveToken();
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      // Standard 30s client timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      // Combine with options.signal if caller provided one
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers: {
            ...headers,
            ...(options.headers as Record<string, string>),
          },
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !isAuthEndpoint(endpoint) && !isRetry) {
          if (!isRefreshing) {
            isRefreshing = true;
            const newToken = await attemptRefreshToken();
            isRefreshing = false;
            onRefreshed(newToken);

            if (newToken) {
              return makeRequest<T>(endpoint, options, true);
            } else {
              clearAuthToken();
              return {
                success: false,
                message: 'Session expired (refresh token invalid or expired). Please log in again.',
                statusCode: 401,
              };
            }
          } else {
            return new Promise((resolve) => {
              subscribeTokenRefresh((newToken: string | null) => {
                if (newToken) {
                  resolve(makeRequest<T>(endpoint, options, true));
                } else {
                  clearAuthToken();
                  resolve({
                    success: false,
                    message: 'Session expired. Please log in again.',
                    statusCode: 401,
                  });
                }
              });
            });
          }
        }

        let errorMsg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message;

        if (response.status === 401) {
          if (isAuthEndpoint(endpoint)) {
            errorMsg = errorMsg && errorMsg !== 'Unauthorized'
              ? errorMsg
              : 'Incorrect username or password!';
          } else {
            errorMsg = 'Session expired. Please log in again.';
          }
        } else {
          errorMsg = errorMsg || 'Request failed from backend server.';
        }

        return {
          success: false,
          message: errorMsg,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        message: data.message || 'Success',
        data: data.data !== undefined ? data.data : data,
        access_token: data.access_token,
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Unable to connect to Backend API server.',
      };
    }
  };

  const reqPromise = execute();

  if (dedupeKey) {
    inFlightGetRequests.set(dedupeKey, reqPromise);
    reqPromise.finally(() => {
      inFlightGetRequests.delete(dedupeKey);
    });
  }

  return reqPromise;
}

export const apiClient = {
  /**
   * Retrieves base API URL
   */
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  /**
   * Retrieves Headers information.
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = tokenManager.getActiveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  request<T>(endpoint: string, options: RequestInit, isRetry = false): Promise<ApiResponse<T>> {
    return makeRequest<T>(endpoint, options, isRetry);
  },

  async get<T>(endpoint: string, customOptions?: RequestInit): Promise<ApiResponse<T>> {
    return makeRequest<T>(endpoint, { ...customOptions, method: 'GET' });
  },

  async post<T>(endpoint: string, body?: any, customOptions?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return makeRequest<T>(endpoint, {
      ...customOptions,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  async patch<T>(endpoint: string, body?: any, customOptions?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return makeRequest<T>(endpoint, {
      ...customOptions,
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  async delete<T>(endpoint: string, customOptions?: RequestInit): Promise<ApiResponse<T>> {
    return makeRequest<T>(endpoint, { ...customOptions, method: 'DELETE' });
  },
};
