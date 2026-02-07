import axios, { AxiosInstance, AxiosError } from 'axios';
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
      validateStatus: () => true, // Aceita qualquer status
    });
    
    // Interceptor para adicionar token em todas as requisições
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
    
    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido - fazer logout
          await AsyncStorage.removeItem('@checkguincho:token');
          await AsyncStorage.removeItem('@checkguincho:empresa');
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Métodos genéricos
  async get<T>(url: string, params?: any): Promise<T> {
    try {
      console.log(`🔄 [ApiService] GET ${url}`, { params });
      const response = await this.api.get<T>(url, { params });
      console.log(`✅ [ApiService] GET ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [ApiService] GET ${url} - Error`, {
        message: error.message,
        code: error.code,
        baseURL: this.api.defaults.baseURL,
        fullURL: `${this.api.defaults.baseURL}${url}`
      });
      throw error;
    }
  }
  
  async post<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`🔄 [ApiService] POST ${url}`, { data, baseURL: this.api.defaults.baseURL });
      const response = await this.api.post<T>(url, data);
      console.log(`✅ [ApiService] POST ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [ApiService] POST ${url} - Error`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        baseURL: this.api.defaults.baseURL,
        fullURL: `${this.api.defaults.baseURL}${url}`
      });
      throw error;
    }
  }
  
  async put<T>(url: string, data?: any): Promise<T> {
    try {
      console.log(`🔄 [ApiService] PUT ${url}`, { data });
      const response = await this.api.put<T>(url, data);
      console.log(`✅ [ApiService] PUT ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [ApiService] PUT ${url} - Error`, {
        message: error.message,
        code: error.code,
        baseURL: API_CONFIG.BASE_URL,
        fullURL: `${API_CONFIG.BASE_URL}${url}`
      });
      throw error;
    }
  }
  
  async delete<T>(url: string): Promise<T> {
    try {
      console.log(`🔄 [ApiService] DELETE ${url}`);
      const response = await this.api.delete<T>(url);
      console.log(`✅ [ApiService] DELETE ${url} - Success`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [ApiService] DELETE ${url} - Error`, {
        message: error.message,
        code: error.code,
        baseURL: this.api.defaults.baseURL,
        fullURL: `${this.api.defaults.baseURL}${url}`
      });
      throw error;
    }
  }
}

export default new ApiService();
