import apiService from './api.service';
import { ENDPOINTS } from '../config/api';

export interface PreferenciaPagamentoResponse {
  preference_id: string;
  init_point?: string;
  sandbox_init_point?: string;
  status?: 'approved' | 'pending';
  message?: string;
}

export interface SelecionarLicencasResponse {
  message: string;
  init_point: string;
  external_reference: string;
  quantidade_licencas: number;
  valor_total: number;
}

export interface Pagamento {
  id: number;
  empresa_id: number;
  mercadopago_id?: string;
  valor: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  tipo_pagamento: 'pix' | 'credit_card' | 'debit_card' | string;
  data_pagamento?: string;
  data_expiracao?: string;
  createdAt: string;
  updatedAt: string;
}

class PagamentoService {
  async criarPreferencia(): Promise<PreferenciaPagamentoResponse> {
    return apiService.post<PreferenciaPagamentoResponse>(ENDPOINTS.CRIAR_PREFERENCIA);
  }

  async listarPagamentos(): Promise<Pagamento[]> {
    return apiService.get<Pagamento[]>(ENDPOINTS.LISTAR_PAGAMENTOS);
  }

  // Selecionar quantidade de licenças e gerar preferência de pagamento
  async selecionarLicencas(quantidadeLicencas: number): Promise<SelecionarLicencasResponse> {
    console.log(`💳 [PagamentoService] Selecionando ${quantidadeLicencas} licenças`);
    
    try {
      const response = await apiService.post<SelecionarLicencasResponse>(
        '/pagamentos/selecionar-licencas',
        { quantidade_licencas: quantidadeLicencas }
      );
      
      console.log('✅ [PagamentoService] Resposta:', response);
      return response;
    } catch (error: any) {
      console.error('❌ [PagamentoService] Erro ao selecionar licenças:', error);
      throw error;
    }
  }
}

export default new PagamentoService();
