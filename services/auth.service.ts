import apiService from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../config/api';

export interface Empresa {
  id: number;
  nome: string;
  codigo: string;
  email: string;
  ativo: boolean;
  diasRestantes: number;
  assinaturaAtiva: boolean;
  emTrial?: boolean;
}

export interface LoginResponse {
  token: string;
  empresa: Empresa;
}

export interface VerificarEmpresaResponse {
  exists: boolean;
  needsPassword?: boolean;
  nome?: string;
  message?: string;
}

export interface CadastrarEmpresaResponse {
  message: string;
  codigo: string;
  email: string;
}

export interface DefinirSenhaResponse {
  message: string;
  token: string;
  empresa: Empresa;
}

class AuthService {
  // Gerar ou recuperar device_id persistente
  private async getDeviceId(): Promise<string> {
    try {
      // Tentar recuperar device_id já salvo
      let deviceId = await AsyncStorage.getItem('@checkguincho:device_id');
      
      if (!deviceId) {
        // Gerar novo device_id se não existir
        deviceId = this.generateDeviceId();
        // Salvar para uso futuro
        await AsyncStorage.setItem('@checkguincho:device_id', deviceId);
        console.log('🆔 [DeviceID] Novo device_id gerado:', deviceId);
      } else {
        console.log('🆔 [DeviceID] Device_id recuperado:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('❌ [DeviceID] Erro ao obter device_id:', error);
      // Fallback: gerar um novo a cada vez se der erro
      return this.generateDeviceId();
    }
  }
  
  // Gerar ID único do dispositivo
  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `mobile_${timestamp}_${randomStr}`;
  }

  // Verificar se empresa existe
  async verificarEmpresa(codigo: string): Promise<VerificarEmpresaResponse> {
    return apiService.post<VerificarEmpresaResponse>(ENDPOINTS.VERIFICAR_EMPRESA, { codigo });
  }
  
  // Cadastrar nova empresa COM SENHA
  async cadastrarEmpresaComSenha(data: {
    nome: string;
    cnpj: string;
    email: string;
    senha: string;
    cpf_responsavel: string;
    telefone?: string;
    endereco?: string;
    quantidade_licencas?: number;
  }): Promise<CadastrarEmpresaResponse> {
    // Obter device_id persistente
    const device_id = await this.getDeviceId();
    
    return apiService.post<CadastrarEmpresaResponse>(ENDPOINTS.CADASTRAR_EMPRESA, {
      ...data,
      device_id
    });
  }
  
  // Cadastrar nova empresa (deprecated - manter para compatibilidade)
  async cadastrarEmpresa(data: {
    nome: string;
    cnpj: string;
    codigo?: string;
    email: string;
    telefone?: string;
    endereco?: string;
  }): Promise<CadastrarEmpresaResponse> {
    return apiService.post<CadastrarEmpresaResponse>(ENDPOINTS.CADASTRAR_EMPRESA, data);
  }
  
  // Login
  async login(codigo: string, senha: string): Promise<LoginResponse> {
    // Obter device_id persistente
    const device_id = await this.getDeviceId();
    
    const response = await apiService.post<LoginResponse>(ENDPOINTS.LOGIN, { 
      codigo, 
      senha, 
      device_id 
    });
    
    // Salvar token e dados da empresa
    await AsyncStorage.setItem('@checkguincho:token', response.token);
    await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response.empresa));
    
    return response;
  }

  // Definir senha (via link do email)
  async definirSenha(token: string, senha: string): Promise<DefinirSenhaResponse> {
    // Obter device_id persistente
    const device_id = await this.getDeviceId();
    
    const response = await apiService.post<DefinirSenhaResponse>(ENDPOINTS.DEFINIR_SENHA, { 
      token, 
      senha, 
      device_id 
    });

    // Salvar token e dados da empresa
    await AsyncStorage.setItem('@checkguincho:token', response.token);
    await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response.empresa));

    return response;
  }
  
  // Validar conta (via link do email)
  async validarConta(token: string): Promise<{ message: string; empresa: Empresa }> {
    return apiService.post(ENDPOINTS.VALIDAR_CONTA, { token });
  }
  
  // Obter dados da empresa logada
  async getEmpresa(): Promise<Empresa> {
    try {
      console.log('🔍 [AuthService] Buscando dados da empresa...');
      const response = await apiService.get<Empresa>(ENDPOINTS.GET_EMPRESA);
      // Atualiza cache local para evitar status antigo
      await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response));
      console.log('✅ [AuthService] Empresa obtida:', response);
      return response;
    } catch (error: any) {
      console.error('❌ [AuthService] Erro ao buscar empresa:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
  
  // Atualizar informações da empresa
  async atualizarEmpresa(data: { nome: string; email: string }): Promise<{ success: boolean; empresa: Empresa }> {
    try {
      console.log('🔄 [AuthService] Tentando atualizar empresa...', { url: ENDPOINTS.GET_EMPRESA, data });
      
      const response = await apiService.put<{ success: boolean; empresa: Empresa }>(
        ENDPOINTS.GET_EMPRESA,
        data
      );
      
      console.log('✅ [AuthService] Resposta recebida:', response);
      
      // Atualizar empresa armazenada localmente
      if (response.success && response.empresa) {
        await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response.empresa));
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ [AuthService] Erro ao atualizar empresa:', error);
      console.error('❌ [AuthService] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
  
  // Logout
  async logout(): Promise<void> {
    await AsyncStorage.removeItem('@checkguincho:token');
    await AsyncStorage.removeItem('@checkguincho:empresa');
  }
  
  // Verificar se está logado
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('@checkguincho:token');
    return !!token;
  }
  
  // Obter empresa armazenada localmente
  async getEmpresaLocal(): Promise<Empresa | null> {
    const empresaJson = await AsyncStorage.getItem('@checkguincho:empresa');
    return empresaJson ? JSON.parse(empresaJson) : null;
  }
}

export default new AuthService();
