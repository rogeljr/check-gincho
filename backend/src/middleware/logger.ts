import { Request, Response, NextFunction } from 'express';
import Log from '../models/Log';

interface LogData {
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: any;
}

// Criar log de auditoria
export const createLog = async (
  req: Request,
  logData: LogData
): Promise<void> => {
  try {
    const ip = req.ip || 
               (req.connection && req.connection.remoteAddress) || 
               req.socket?.remoteAddress || 
               '0.0.0.0';
    
    const userAgent = typeof req.get === 'function' ? req.get('user-agent') : 'unknown';
    
    await Log.create({
      empresa_id: req.empresaId,
      usuario_id: undefined, // TODO: adicionar quando implementar usuários
      acao: logData.acao,
      entidade: logData.entidade,
      entidade_id: logData.entidade_id,
      ip: ip,
      user_agent: userAgent,
      detalhes: logData.detalhes
    });
  } catch (error) {
    console.error('Erro ao criar log:', error);
    // Não bloquear a requisição se houver erro no log
  }
};

// Middleware para logar automaticamente
export const logMiddleware = (acao: string, entidade: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      // Apenas logar se a requisição foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await createLog(req, {
          acao,
          entidade,
          detalhes: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        });
      }
    });
    
    next();
  };
};
