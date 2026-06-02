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
  quantidade_licencas?: number;
  prestador_nome?: string;
  prestador_telefone?: string;
  logo_url?: string;
  login_responsavel?: string;
}

export interface UsuarioEmpresa {
  id: number | null;
  empresa_id: number;
  nome: string;
  login: string;
  email?: string;
  role: 'admin' | 'operador' | 'visualizador';
  ativo: boolean;
}

export interface LoginResponse {
  token: string;
  empresa: Empresa;
  usuario?: UsuarioEmpresa;
}

export interface VerificarEmpresaResponse {
  exists: boolean;
  needsPassword?: boolean;
  needsValidation?: boolean;
  nome?: string;
  email?: string;
  message?: string;
}

export interface CadastrarEmpresaResponse {
  message: string;
  codigo: string;
  email: string;
  login_responsavel?: string;
}

export interface DefinirSenhaResponse {
  message: string;
  token: string;
  empresa: Empresa;
}

class AuthService {
  private getApiErrorMessage(error: any, fallback: string): string {
    return (
      error.response?.data?.details ||
      error.response?.data?.error ||
      error.message ||
      fallback
    );
  }

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
    return apiService.post<VerificarEmpresaResponse>(ENDPOINTS.VERIFICAR_EMPRESA, { codigo: codigo.trim().toLowerCase() });
  }
  
  // Cadastrar nova empresa COM SENHA
  async cadastrarEmpresaComSenha(data: {
    nome: string;
    codigo?: string;
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
    try {
      const response = await apiService.post<CadastrarEmpresaResponse>(ENDPOINTS.CADASTRAR_EMPRESA, {
        ...data,
        email: data.email.trim().toLowerCase(),
        device_id
      });
      return response;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Erro ao cadastrar empresa'));
    }
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
    try {
      const response = await apiService.post<CadastrarEmpresaResponse>(ENDPOINTS.CADASTRAR_EMPRESA, data);
      return response;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Erro ao cadastrar empresa'));
    }
  }
  
  // Login
  async login(codigo: string, login: string, senha: string): Promise<LoginResponse> {
    // Obter device_id persistente
    const device_id = await this.getDeviceId();
    
    const response = await apiService.post<LoginResponse>(ENDPOINTS.LOGIN, { 
      codigo: codigo.trim().toLowerCase(), 
      login: login.trim().toLowerCase(),
      senha, 
      device_id 
    });
    
    // Salvar token e dados da empresa
    await AsyncStorage.setItem('@checkguincho:token', response.token);
    await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response.empresa));
    if (response.usuario) {
      await AsyncStorage.setItem('@checkguincho:usuario', JSON.stringify(response.usuario));
    }
    
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

  async atualizarPrestador(data: {
    prestador_nome?: string;
    prestador_telefone?: string;
    logo_base64?: string;
    remover_logo?: boolean;
  }): Promise<{ success: boolean; empresa: Empresa }> {
    const response = await apiService.put<{ success: boolean; empresa: Empresa }>(
      ENDPOINTS.ATUALIZAR_PRESTADOR,
      data
    );

    if (response.success && response.empresa) {
      await AsyncStorage.setItem('@checkguincho:empresa', JSON.stringify(response.empresa));
    }

    return response;
  }

  async listarUsuarios(): Promise<{
    usuarios: UsuarioEmpresa[];
    limite_funcionarios: number;
    funcionarios_ativos: number;
    licencas_total: number;
  }> {
    return apiService.get(ENDPOINTS.USUARIOS);
  }

  async criarUsuario(data: {
    nome: string;
    login: string;
    email?: string;
    senha: string;
    role: 'operador' | 'visualizador';
  }): Promise<{ usuario: UsuarioEmpresa }> {
    return apiService.post(ENDPOINTS.USUARIOS, data);
  }

  async atualizarUsuario(id: number, data: {
    nome?: string;
    login?: string;
    email?: string;
    senha?: string;
    role?: 'operador' | 'visualizador';
    ativo?: boolean;
  }): Promise<{ usuario: UsuarioEmpresa }> {
    return apiService.put(ENDPOINTS.USUARIO_BY_ID(id), data);
  }

  async removerUsuario(id: number): Promise<{ success: boolean }> {
    return apiService.delete(ENDPOINTS.USUARIO_BY_ID(id));
  }
  
  // Logout
  async logout(): Promise<void> {
    await AsyncStorage.removeItem('@checkguincho:token');
    await AsyncStorage.removeItem('@checkguincho:empresa');
    await AsyncStorage.removeItem('@checkguincho:usuario');
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
