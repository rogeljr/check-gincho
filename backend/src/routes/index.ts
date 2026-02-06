import { Router } from 'express';
import authRoutes from './authRoutes';
import sinistroRoutes from './sinistroRoutes';
import pagamentoRoutes from './pagamentoRoutes';

const router = Router();

// Registrar rotas
router.use('/auth', authRoutes);
router.use('/sinistros', sinistroRoutes);
router.use('/pagamentos', pagamentoRoutes);

// Rota de health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Check Guincho API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
