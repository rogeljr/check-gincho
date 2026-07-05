import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: undefined,
      httpsAgent: undefined,
    });

    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('@checkguincho:token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('@checkguincho:token');
          await AsyncStorage.removeItem('@checkguincho:empresa');
        }
        return Promise.reject(error);
      }
    );
  }

  private logError(method: string, url: string, error: any): void {
    const status = error.response?.status;
    const details = {
      message: error.message,
      code: error.code,
      status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      baseURL: this.api.defaults.baseURL,
      fullURL: `${this.api.defaults.baseURL}${url}`,
    };

    if (status && status >= 400 && error.response?.data) {
      console.log(`[ApiService] ${method} ${url} - Resposta da API`, details);
      return;
    }

    console.error(`[ApiService] ${method} ${url} - Error`, details);
  }

  private safeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = new Set([
      'senha',
      'confirmarSenha',
      'password',
      'token',
      'assinatura_base64',
    ]);

    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        sensitiveFields.has(key) ? '[PROTEGIDO]' : value,
      ])
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    try {
      console.log(`[ApiService] GET ${url}`, { params });
      const response = await this.api.get<T>(url, { params });
      console.log(`[ApiService] GET ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      this.logError('GET', url, error);
      throw error;
    }
  }

  async post<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`[ApiService] POST ${url}`, {
        data: this.safeLogData(data),
        baseURL: this.api.defaults.baseURL,
      });
      const response = await this.api.post<T>(url, data);
      console.log(`[ApiService] POST ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      this.logError('POST', url, error);
      throw error;
    }
  }

  async put<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`[ApiService] PUT ${url}`, { data: this.safeLogData(data) });
      const response = await this.api.put<T>(url, data);
      console.log(`[ApiService] PUT ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      this.logError('PUT', url, error);
      throw error;
    }
  }

  async delete<T>(url: string): Promise<T> {
    try {
      console.log(`[ApiService] DELETE ${url}`);
      const response = await this.api.delete<T>(url);
      console.log(`[ApiService] DELETE ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      this.logError('DELETE', url, error);
      throw error;
    }
  }
}

export default new ApiService();
