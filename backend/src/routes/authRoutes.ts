import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Rotas públicas (sem autenticação)
router.post('/verificar-empresa', authController.verificarEmpresa);
router.post('/cadastrar', authController.cadastrarEmpresa);
router.post('/validar-conta', authController.validarConta);
router.get('/validar-conta', authController.validarContaViaBrowser); // Validar via browser (HTTP link)
router.post('/definir-senha', authController.definirSenha);
router.get('/definir-senha', authController.redirecionarDefinirSenha); // Redirecionar HTTP para deep link
router.post('/login', authController.login);

// Rotas protegidas (com autenticação)
router.get('/empresa', authMiddleware, authController.getEmpresa);
router.put('/empresa', authMiddleware, authController.atualizarEmpresa);

// Rota de desenvolvimento - resetar trial para X dias atrás
if (process.env.NODE_ENV === 'development') {
  router.put('/dev/resetar-trial', authController.devResetarTrial);
  router.put('/dev/reativar-empresa', authController.devReativarEmpresa);
  router.put('/dev/resetar-senha', authController.devResetarSenha);
}

export default router;
