/**
 * API Client Configuration
 *
 * Axios client for making API calls with proper configuration.
 * Uses relative paths to work in all environments (dev, staging, production).
 *
 * CRITICAL: Always use relative paths for internal APIs.
 * Never hardcode localhost URLs - they break production deployments.
 *
 * Based on: Attack Kit Section 2 - API & Networking Standards
 */

import axios from 'axios';

/**
 * Base URL for API calls
 * - Defaults to relative path '/api' (works in all environments)
 * - Only set NEXT_PUBLIC_API_URL if you need an external API endpoint
 * - Never hardcode localhost URLs
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Axios client instance with default configuration
 */
export const api = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add auth token to requests
 */
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (set during login)
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - Redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data);
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

/**
 * API Response Type
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Helper function to make GET requests
 */
export async function get<T = any>(url: string, params?: any): Promise<T> {
  const response = await api.get<APIResponse<T>>(url, { params });
  return response.data.data as T;
}

/**
 * Helper function to make POST requests
 */
export async function post<T = any>(url: string, data?: any): Promise<T> {
  const response = await api.post<APIResponse<T>>(url, data);
  return response.data.data as T;
}

/**
 * Helper function to make PUT requests
 */
export async function put<T = any>(url: string, data?: any): Promise<T> {
  const response = await api.put<APIResponse<T>>(url, data);
  return response.data.data as T;
}

/**
 * Helper function to make PATCH requests
 */
export async function patch<T = any>(url: string, data?: any): Promise<T> {
  const response = await api.patch<APIResponse<T>>(url, data);
  return response.data.data as T;
}

/**
 * Helper function to make DELETE requests
 */
export async function del<T = any>(url: string): Promise<T> {
  const response = await api.delete<APIResponse<T>>(url);
  return response.data.data as T;
}
