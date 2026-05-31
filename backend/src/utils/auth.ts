import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

// Hash de senha
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Comparar senha
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Gerar JWT
export const generateToken = (empresaId: number, codigo: string, usuarioId?: number, role: string = 'admin'): string => {
  return jwt.sign(
    { empresaId, codigo, usuarioId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' } // Token válido por 30 dias
  );
};

// Gerar código da empresa a partir do nome
export const generateCodigoEmpresa = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-') // Substitui caracteres especiais por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, '') // Remove hífens do início e fim
    .substring(0, 50); // Limita a 50 caracteres
};

// Validar CNPJ (básico)
export const validarCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // Todos os dígitos iguais
  
  return true; // Validação simplificada
};

// Formatar CNPJ
export const formatarCNPJ = (cnpj: string): string => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};
