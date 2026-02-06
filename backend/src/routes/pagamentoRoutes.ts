import { Router } from 'express';
import * as pagamentoController from '../controllers/pagamentoController';
import { authMiddlewareSemAssinatura } from '../middleware/auth';

const router = Router();

// Webhook (público, sem autenticação)
router.post('/webhook', pagamentoController.webhookMercadoPago);

// Rota de desenvolvimento - deletar pagamentos de teste (SEM autenticação)
if (process.env.NODE_ENV === 'development') {
  router.delete('/dev/limpar', pagamentoController.limparPagamentosTeste);
}

// Rotas protegidas
router.post('/criar-preferencia', authMiddlewareSemAssinatura, pagamentoController.criarPreferencia);
router.post('/selecionar-licencas', authMiddlewareSemAssinatura, pagamentoController.selecionarLicencas);
router.get('/', authMiddlewareSemAssinatura, pagamentoController.listarPagamentos);
router.get('/:id', authMiddlewareSemAssinatura, pagamentoController.obterPagamento);

export default router;
