// Configuração da API
export const API_CONFIG = {
  // Produção: Railway
  // Local: http://192.168.1.5:8080/api
  
  BASE_URL: 'https://check-gincho-production.up.railway.app/api', // ✅ Railway Cloud
  TIMEOUT: 60000, // Aumentado para 60 segundos
};

export const ENDPOINTS = {
  // Auth
  VERIFICAR_EMPRESA: '/auth/verificar-empresa',
  CADASTRAR_EMPRESA: '/auth/cadastrar',
  VALIDAR_CONTA: '/auth/validar-conta',
  DEFINIR_SENHA: '/auth/definir-senha',
  LOGIN: '/auth/login',
  GET_EMPRESA: '/auth/empresa',
  ATUALIZAR_PRESTADOR: '/auth/empresa/prestador',
  USUARIOS: '/auth/usuarios',
  USUARIO_BY_ID: (id: number) => `/auth/usuarios/${id}`,
  
  // Sinistros
  SINISTROS: '/sinistros',
  SINISTRO_BY_ID: (id: number) => `/sinistros/${id}`,
  ADICIONAR_FOTO: (id: number) => `/sinistros/${id}/fotos`,
  REMOVER_FOTO: (id: number, fotoId: number) => `/sinistros/${id}/fotos/${fotoId}`,
  ADICIONAR_ASSINATURA: (id: number) => `/sinistros/${id}/assinatura`,
  FINALIZAR_SINISTRO: (id: number) => `/sinistros/${id}/finalizar`,
  
  // Pagamentos
  CRIAR_PREFERENCIA: '/pagamentos/criar-preferencia',
  SELECIONAR_LICENCAS: '/pagamentos/selecionar-licencas',
  LISTAR_PAGAMENTOS: '/pagamentos',
};
