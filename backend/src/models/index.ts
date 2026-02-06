// Exportar todos os modelos
import Empresa from './Empresa';
import Usuario from './Usuario';
import Sinistro from './Sinistro';
import Foto from './Foto';
import Pagamento from './Pagamento';
import Log from './Log';
import TrialUsage from './TrialUsage';

export {
  Empresa,
  Usuario,
  Sinistro,
  Foto,
  Pagamento,
  Log,
  TrialUsage
};

// Inicializar relacionamentos
export const initModels = () => {
  // Os relacionamentos já estão definidos nos próprios modelos
  console.log('✅ Modelos inicializados');
};
