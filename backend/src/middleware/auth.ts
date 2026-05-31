import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Empresa from '../models/Empresa';

interface JWTPayload {
  empresaId: number;
  codigo: string;
  usuarioId?: number;
  role?: string;
}

const tokenEstaAtivo = (empresa: Empresa, token: string): boolean => {
  if (empresa.active_tokens && empresa.active_tokens.length > 0) {
    return empresa.active_tokens.includes(token);
  }

  if (empresa.active_sessions && empresa.active_sessions.length > 0) {
    return empresa.active_sessions.some((sessao: any) => sessao.token === token);
  }

  return true;
};

// Estender o tipo Request para incluir empresa
declare global {
  namespace Express {
    interface Request {
      empresa?: Empresa;
      empresaId?: number;
      usuarioId?: number;
      usuarioRole?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    const empresa = await Empresa.findByPk(decoded.empresaId);
    
    if (!empresa) {
      return res.status(401).json({ error: 'Empresa não encontrada' });
    }
    
    // 🔐 VERIFICAÇÃO MULTI-SESSÃO: Validar se é um dos tokens ativos
    // Se não há tokens ativos (retrocompatibilidade), permitir
    if (!tokenEstaAtivo(empresa, token)) {
      console.log('❌ [AUTH] Token inválido - não está na lista de sessões ativas');
      return res.status(401).json({ 
        error: 'Sua sessão foi encerrada porque o limite de dispositivos foi atingido',
        code: 'SESSION_REPLACED'
      });
    }
    
    // Verificar se a assinatura está ativa
    if (!empresa.isAssinaturaAtiva()) {
      return res.status(403).json({ 
        error: 'Assinatura expirada',
        message: 'Sua assinatura expirou. Renove para continuar usando o app.',
        diasRestantes: 0
      });
    }
    
    req.empresa = empresa;
    req.empresaId = empresa.id;
    req.usuarioId = decoded.usuarioId;
    req.usuarioRole = decoded.role || 'admin';
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
};

// Middleware que valida token, mas NÃO bloqueia por assinatura expirada
export const authMiddlewareSemAssinatura = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const empresa = await Empresa.findByPk(decoded.empresaId);
    
    if (!empresa) {
      return res.status(401).json({ error: 'Empresa não encontrada' });
    }

    if (!tokenEstaAtivo(empresa, token)) {
      return res.status(401).json({
        error: 'Sua sessão foi encerrada porque o limite de dispositivos foi atingido',
        code: 'SESSION_REPLACED'
      });
    }
    
    req.empresa = empresa;
    req.empresaId = empresa.id;
    req.usuarioId = decoded.usuarioId;
    req.usuarioRole = decoded.role || 'admin';
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
};

// Middleware opcional que não bloqueia se expirado, apenas informa
export const authMiddlewareOptional = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const empresa = await Empresa.findByPk(decoded.empresaId);
    
    if (empresa) {
      req.empresa = empresa;
      req.empresaId = empresa.id;
      req.usuarioId = decoded.usuarioId;
      req.usuarioRole = decoded.role || 'admin';
    }
    
    next();
  } catch (error) {
    next();
  }
};
