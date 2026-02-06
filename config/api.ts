// Configuração da API
export const API_CONFIG = {
  // Para celular físico ou emulador Android, use o IP da sua máquina
  // Para descobrir seu IP: ipconfig (Windows) ou ifconfig (Mac/Linux)
  // Emulador Android: http://10.0.2.2:8080
  // iOS Simulator: http://localhost:8080
  // Celular físico: http://SEU_IP_LOCAL:8080 (ex: http://192.168.1.5:8080)
  
  BASE_URL: 'http://192.168.1.5:8080/api', // ✅ IP Local
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
  
  // Sinistros
  SINISTROS: '/sinistros',
  SINISTRO_BY_ID: (id: number) => `/sinistros/${id}`,
  ADICIONAR_FOTO: (id: number) => `/sinistros/${id}/fotos`,
  REMOVER_FOTO: (id: number, fotoId: number) => `/sinistros/${id}/fotos/${fotoId}`,
  ADICIONAR_ASSINATURA: (id: number) => `/sinistros/${id}/assinatura`,
  FINALIZAR_SINISTRO: (id: number) => `/sinistros/${id}/finalizar`,
  
  // Pagamentos
  CRIAR_PREFERENCIA: '/pagamentos/criar-preferencia',
  LISTAR_PAGAMENTOS: '/pagamentos',
};
