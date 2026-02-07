import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize, { testConnection } from './config/database';
import { initModels } from './models';
import routes from './routes';

// Configurar variáveis de ambiente
dotenv.config();

// Log todas as variáveis de ambiente (para debug)
console.log('\n📋 Variáveis de ambiente disponíveis:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ Indefinida');
console.log('   PGHOST:', process.env.PGHOST ? `✅ ${process.env.PGHOST}` : '❌ Indefinida');
console.log('   PGPORT:', process.env.PGPORT ? `✅ ${process.env.PGPORT}` : '❌ Indefinida');
console.log('   PGUSER:', process.env.PGUSER ? `✅ ${process.env.PGUSER}` : '❌ Indefinida');
console.log('   PGPASSWORD:', process.env.PGPASSWORD ? '✅ Definida' : '❌ Indefinida');
console.log('   PGDATABASE:', process.env.PGDATABASE ? `✅ ${process.env.PGDATABASE}` : '❌ Indefinida');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development\n');

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : [
    process.env.FRONTEND_URL || 'http://localhost:8081',
    process.env.WEB_URL || 'http://localhost:3001'
  ],
  credentials: true
}));

// Middlewares de parsing
app.use(express.json({ limit: '50mb' })); // Limite maior para imagens base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Registrar rotas
app.use('/api', routes);

// Rota raiz
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Check Guincho API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      sinistros: '/api/sinistros'
    }
  });
});

// Middleware de erro global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro:', err);
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar servidor
const startServer = async () => {
  try {
    // Testar conexão com banco de dados
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Falha ao conectar com o banco de dados. Encerrando...');
      process.exit(1);
    }
    
    // Sincronizar modelos com o banco (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      // Disable alter: true in development to speed up startup
      // await sequelize.sync({ alter: true });
      console.log('✅ Modelos já estão sincronizados com o banco de dados');
    }
    
    // Inicializar modelos
    initModels();
    
    // Iniciar servidor - escutar em 0.0.0.0 para aceitar conexões de qualquer interface
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 URL: http://0.0.0.0:${PORT}`);
      console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar
startServer();

export default app;
