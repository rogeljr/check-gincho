import { Router } from 'express';
import * as sinistroController from '../controllers/sinistroController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// CRUD de sinistros
router.post('/', sinistroController.criarSinistro);
router.get('/', sinistroController.listarSinistros);
router.get('/:id', sinistroController.obterSinistro);
router.put('/:id', sinistroController.atualizarSinistro);
router.delete('/:id', sinistroController.deletarSinistro);

// Fotos
router.post('/:id/fotos', sinistroController.adicionarFoto);
router.delete('/:id/fotos/:fotoId', sinistroController.removerFoto);

// Assinatura
router.post('/:id/assinatura', sinistroController.adicionarAssinatura);
router.delete('/:id/assinatura', sinistroController.apagarAssinatura);

// Finalizar
router.post('/:id/finalizar', sinistroController.finalizarSinistro);

// Enviar PDF para cliente
router.post('/:id/enviar-pdf', sinistroController.enviarPDFParaCliente);

// Gerar link WhatsApp para cliente
router.post('/:id/enviar-whatsapp', sinistroController.gerarLinkWhatsApp);

export default router;
