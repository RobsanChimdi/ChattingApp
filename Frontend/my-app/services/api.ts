// services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.token) {
          config.headers.Authorization = `Token ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          // Clear auth state
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  removeToken() {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  // HTTP methods
  async get<T>(url: string, config = {}) {
    return this.api.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config = {}) {
    return this.api.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config = {}) {
    return this.api.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config = {}) {
    return this.api.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config = {}) {
    return this.api.delete<T>(url, config);
  }
}

export const api = new ApiService();