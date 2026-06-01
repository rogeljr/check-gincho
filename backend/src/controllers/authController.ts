// ...imports...

import { Request, Response } from 'express';
import Empresa from '../models/Empresa';
import Usuario from '../models/Usuario';
import TrialUsage from '../models/TrialUsage';
import { hashPassword, comparePassword, generateToken, generateCodigoEmpresa, validarCNPJ, formatarCNPJ } from '../utils/auth';
import { sendEmail, sendEmailDetailed, emailBoasVindas, emailSenhaDefinida, emailValidacaoConta, emailContaValidada } from '../services/emailService';
import { createLog } from '../middleware/logger';
import { uploadBase64Image, deleteImage } from '../services/uploadService';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Op } from 'sequelize';

const normalizarEmail = (email?: string) => String(email || '').trim().toLowerCase();
const normalizarLogin = (login?: string) => String(login || '').trim().toLowerCase();
const somenteDigitos = (valor?: string) => String(valor || '').replace(/\D/g, '');

const usuarioResponse = (usuario: Usuario) => ({
  id: usuario.id,
  empresa_id: usuario.empresa_id,
  nome: usuario.nome,
  login: usuario.login,
  email: usuario.email,
  role: usuario.role,
  ativo: usuario.ativo,
  createdAt: usuario.createdAt,
  updatedAt: usuario.updatedAt,
});

const sincronizarSessaoLicenca = (empresa: Empresa, token: string, deviceId: string, usuarioId?: number, role: string = 'admin') => {
  const quantidadeLicencas = empresa.quantidade_licencas || 1;
  const agoraIso = new Date().toISOString();
  const sessoesAtuais = Array.isArray(empresa.active_sessions) ? empresa.active_sessions : [];

  const sessoesSemDispositivoAtual = sessoesAtuais.filter(sessao => {
    const mesmoDispositivo = sessao.device_id === deviceId;
    const mesmoUsuario = usuarioId ? sessao.usuario_id === usuarioId : !sessao.usuario_id;
    return !mesmoDispositivo && !mesmoUsuario;
  });
  const sessoesAtualizadas = [
    ...sessoesSemDispositivoAtual,
    {
      token,
      device_id: deviceId,
      usuario_id: usuarioId,
      role,
      ultimo_login: agoraIso,
    },
  ];

  const sessoesDentroDoLimite = sessoesAtualizadas.slice(-quantidadeLicencas);
  empresa.active_sessions = sessoesDentroDoLimite;
  empresa.active_tokens = sessoesDentroDoLimite.map(sessao => sessao.token);

  return {
    quantidadeLicencas,
    sessoesAtivas: sessoesDentroDoLimite.length,
    substituiuMesmoDispositivo: sessoesAtuais.length !== sessoesSemDispositivoAtual.length,
    removeuExcedentes: sessoesAtualizadas.length > quantidadeLicencas,
  };
};

const toEmpresaResponse = (empresa: Empresa) => ({
  id: empresa.id,
  nome: empresa.nome,
  codigo: empresa.codigo,
  email: empresa.email,
  ativo: empresa.ativo && empresa.isAssinaturaAtiva(),
  diasRestantes: empresa.diasRestantes(),
  assinaturaAtiva: empresa.isAssinaturaAtiva(),
  emTrial: empresa.isTrialAtivo(),
  quantidade_licencas: empresa.quantidade_licencas,
  prestador_nome: empresa.prestador_nome,
  prestador_telefone: empresa.prestador_telefone,
  logo_url: empresa.logo_url,
  login_responsavel: empresa.login_responsavel || empresa.cnpj,
});

const cloudinaryConfigurado = () => (
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET)
);

const loginAdministrador = (empresa: Empresa, login: string): boolean => {
  const loginNormalizado = normalizarLogin(login);
  const digitosLogin = somenteDigitos(loginNormalizado);

  return (
    loginNormalizado === normalizarLogin(empresa.login_responsavel) ||
    loginNormalizado === normalizarLogin(empresa.codigo) ||
    digitosLogin === somenteDigitos(empresa.cnpj) ||
    (!!empresa.cpf_responsavel && digitosLogin === somenteDigitos(empresa.cpf_responsavel))
  );
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const empresaId = typeof decoded === 'string' ? undefined : (decoded as JwtPayload).empresaId;
    if (!empresaId) {
      return res.status(400).json({ error: 'Token inválido' });
    }
    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    if (!empresa.active_tokens || !empresa.active_tokens.includes(token)) {
      return res.status(400).json({ error: 'Token não está ativo' });
    }
    // Remover token do array
    empresa.active_tokens = empresa.active_tokens.filter(t => t !== token);
    empresa.active_sessions = (empresa.active_sessions || []).filter(sessao => sessao.token !== token);
    await empresa.save();
    console.log('✅ [LOGOUT] Token removido:', token);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('❌ [LOGOUT] Erro ao fazer logout:', error);
    return res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

// Verificar se empresa existe pelo código
export const verificarEmpresa = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ error: 'Código da empresa é obrigatório' });
    }
    
    const empresa = await Empresa.findOne({ where: { codigo } });
    
    if (!empresa) {
      return res.json({ 
        exists: false, 
        message: 'Empresa não encontrada. Deseja cadastrar?' 
      });
    }
    
    // Verificar se a empresa já definiu senha (fluxo antigo - retrocompatibilidade)
    if (!empresa.senha) {
      return res.json({
        exists: true,
        needsPassword: true,
        message: 'Empresa cadastrada. Aguardando definição de senha via email.'
      });
    }
    
    // Verificar se a conta já foi validada (fluxo novo)
    if (!empresa.ativo) {
      return res.json({
        exists: true,
        needsValidation: true,
        nome: empresa.nome,
        email: empresa.email,
        message: 'Conta aguardando validação. Verifique seu email e clique no link de confirmação.'
      });
    }
    
    return res.json({
      exists: true,
      needsPassword: false,
      needsValidation: false,
      nome: empresa.nome
    });
  } catch (error) {
    console.error('Erro ao verificar empresa:', error);
    return res.status(500).json({ error: 'Erro ao verificar empresa' });
  }
};

// Cadastrar nova empresa
export const cadastrarEmpresa = async (req: Request, res: Response) => {
  try {
    console.log('📝 [CADASTRO] Recebido request de cadastro:', { nome: req.body.nome, email: req.body.email, cnpj: req.body.cnpj });
    

    let { nome, cnpj, codigo, email, senha, cpf_responsavel, device_id, quantidade_licencas } = req.body;

    // Código da empresa sempre minúsculo
    if (codigo) codigo = codigo.toLowerCase();

    // Inicialização das variáveis
    const cpfLimpo = cpf_responsavel ? cpf_responsavel.replace(/\D/g, '') : '';
    const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : '';
    const cnpjFormatado = cnpjLimpo ? formatarCNPJ(cnpjLimpo) : '';
    const emailNormalizado = email ? email.trim().toLowerCase() : '';
    const licencas = quantidade_licencas && quantidade_licencas >= 1 && quantidade_licencas <= 10 ? quantidade_licencas : 1;

    // Validação de CPF/CNPJ
    // ...existing code...
    
    // 🔐 VERIFICAÇÃO ANTI-ABUSO: Verificar se CPF já usou trial e se o prazo expirou
    const trialJaUsado = await TrialUsage.findOne({ where: { cpf: cpfLimpo } });
    let temDireitoTrial = true;
    if (trialJaUsado) {
      const dataUso = trialJaUsado.data_uso || trialJaUsado.createdAt;
      const agora = new Date();
      const diasPassados = Math.floor((agora.getTime() - new Date(dataUso).getTime()) / (1000 * 60 * 60 * 24));
      if (diasPassados > 7) {
        temDireitoTrial = false;
        console.log('⚠️ [CADASTRO] CPF já usou trial e prazo expirou:', { cpf: cpfLimpo, diasPassados });
      } else {
        temDireitoTrial = true;
        console.log('⚠️ [CADASTRO] CPF já usou trial, mas ainda está dentro do prazo:', { cpf: cpfLimpo, diasPassados });
      }
    }
    
    // Verificar se CNPJ já existe
    if (!nome || !cnpjLimpo || !emailNormalizado || !senha || !cpfLimpo) {
      return res.status(400).json({ error: 'Nome, CNPJ, email, CPF do responsável e senha são obrigatórios' });
    }

    if (!validarCNPJ(cnpjLimpo)) {
      return res.status(400).json({ error: 'CNPJ inválido' });
    }

    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF do responsável inválido' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const empresaExistente = await Empresa.findOne({ where: { cnpj: cnpjFormatado } });
    if (empresaExistente) {
      console.log('❌ [CADASTRO] CNPJ já cadastrado');
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }
    
    // Verificar se email já existe (normalizado)
    const emailExistente = await Empresa.findOne({ where: { email: emailNormalizado } });
    if (emailExistente) {
      console.log('❌ [CADASTRO] Email já cadastrado');
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Gerar ou usar código fornecido
    let codigoFinal = codigo || generateCodigoEmpresa(nome);
    console.log('📌 [CADASTRO] Código gerado:', codigoFinal);
    
    // Verificar se código já existe
    let codigoExistente = await Empresa.findOne({ where: { codigo: codigoFinal } });
    let tentativa = 1;
    
    while (codigoExistente) {
      codigoFinal = `${codigo || generateCodigoEmpresa(nome)}-${tentativa}`;
      codigoExistente = await Empresa.findOne({ where: { codigo: codigoFinal } });
      tentativa++;
    }

    // Hash da senha
    const senhaHash = await hashPassword(senha);
    console.log('🔐 [CADASTRO] Senha hashada');
    
    // Criar empresa (já com senha, mas NÃO VALIDADA)
    const empresa = await Empresa.create({
      nome,
      cnpj: cnpjFormatado,
      codigo: codigoFinal,
      email: emailNormalizado,
      senha: senhaHash,
      cpf_responsavel: cpfLimpo,
      login_responsavel: cpfLimpo,
      quantidade_licencas: licencas,
      ativo: false // Será ativado após validação por email
    });
    
    console.log('✅ [CADASTRO] Empresa criada no banco:', { id: empresa.id, codigo: empresa.codigo, licencas });
    
    // Registrar uso de trial (ou tentativa) para prevenir abuso futuro
    if (temDireitoTrial) {
      await TrialUsage.create({
        cpf: cpfLimpo,
        device_id: device_id,
        empresa_id: empresa.id
      });
      console.log('📝 [CADASTRO] Trial registrado para CPF e dispositivo');
    }
    
    // Enviar email de validacao. A empresa so fica ativa apos clicar no link.
    const tokenValidacao = jwt.sign(
      { empresaId: empresa.id, action: 'validate_account', temDireitoTrial },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    console.log('[CADASTRO] Token de validacao gerado');

    const backendUrl = process.env.BACKEND_URL || 'https://check-gincho-production.up.railway.app';
    const validacaoUrl = `${backendUrl}/api/auth/validar-conta?token=${tokenValidacao}`;
    console.log('[CADASTRO] Tentando enviar email para:', emailNormalizado);

    const emailResultado = await sendEmailDetailed({
      to: emailNormalizado,
      subject: 'Check Guincho - Confirme sua conta',
      html: emailValidacaoConta(nome, codigoFinal, validacaoUrl)
    });

    if (!emailResultado.success) {
      console.error('[CADASTRO] Falha ao enviar email de validacao:', emailResultado);
      await TrialUsage.destroy({ where: { empresa_id: empresa.id } });
      await empresa.destroy();
      return res.status(502).json({
        error: 'Nao foi possivel enviar o email de validacao. Confira o email e tente novamente.',
        details: emailResultado.error,
        code: emailResultado.code,
        responseCode: emailResultado.responseCode,
        command: emailResultado.command,
        port: emailResultado.port,
        attemptedPorts: emailResultado.attemptedPorts,
        missingConfig: emailResultado.missingConfig,
      });
    }

    console.log('[CADASTRO] Email enviado com sucesso');

    return res.status(201).json({
      message: 'Empresa cadastrada com sucesso! Verifique seu email para validar a conta.',
      codigo: codigoFinal,
      email: emailNormalizado,
      login_responsavel: cpfLimpo,
      tem_direito_trial: temDireitoTrial
    });
  } catch (error) {
    console.error('❌ [CADASTRO] Erro ao cadastrar empresa:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa', details: (error as any).message });
  }
};

// Validar conta (via link do email)
export const validarConta = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }

    // --- Validação de token ---
    // Verificar token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    if (!decoded || decoded.action !== 'validate_account') {
      return res.status(400).json({ error: 'Token inválido' });
    }
    const empresa = await Empresa.findByPk(decoded.empresaId);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    if (empresa.ativo) {
      return res.status(400).json({ error: 'Conta já foi validada' });
    }

    // Ativar empresa e iniciar trial de 7 dias
    const agora = new Date();
    empresa.ativo = true;
    empresa.data_inicio_trial = agora; // Iniciar trial agora
    empresa.data_expiracao = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    await empresa.save();

    console.log('✅ [VALIDAÇÃO] Conta ativada e trial iniciado:', { empresaId: empresa.id, codigo: empresa.codigo });

    // Enviar email de boas-vindas
    await sendEmail({
      to: empresa.email,
      subject: 'Conta ativada com sucesso!',
      html: emailContaValidada(empresa.nome)
    });

    return res.json({
      message: 'Conta validada com sucesso! Você já pode fazer login.',
      codigo: empresa.codigo
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    
    console.error('Erro ao validar conta:', error);
    return res.status(500).json({ error: 'Erro ao validar conta' });
  }
};

// Rota GET para validar conta via navegador (redireciona para deep link)
export const validarContaViaBrowser = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Erro - Check Guincho</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #f44336; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Erro</h1>
              <p>Token de validação não encontrado.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Verificar e validar a conta
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.action !== 'validate_account') {
        throw new Error('Token inválido');
      }
      
      const empresa = await Empresa.findByPk(decoded.empresaId);
      
      if (!empresa) {
        throw new Error('Empresa não encontrada');
      }
      
      if (!empresa.ativo) {
        // Ativar empresa e iniciar trial
        empresa.ativo = true;
        
        // 🔐 VERIFICAR SE TEM DIREITO A TRIAL (7 DIAS)
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const temDireitoTrial = decoded.temDireitoTrial !== false;
        
        if (temDireitoTrial) {
          const agora = new Date();
          empresa.data_inicio_trial = agora; // Trial de 7 dias
          empresa.data_expiracao = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
          console.log('✅ [VALIDAÇÃO] Trial de 7 dias ativado');
        } else {
          // Se já usou trial antes, apenas 1 dia de acesso
          const dataLimitada = new Date();
          empresa.data_inicio_trial = new Date(dataLimitada.getTime() - (6 * 24 * 60 * 60 * 1000)); // 1 dia apenas
          empresa.data_expiracao = new Date(dataLimitada.getTime() + 24 * 60 * 60 * 1000);
          console.log('⚠️ [VALIDAÇÃO] Trial já foi usado - apenas 1 dia de acesso');
        }
        
        await empresa.save();
        
        console.log('✅ [VALIDAÇÃO VIA BROWSER] Conta ativada e trial iniciado:', { empresaId: empresa.id, codigo: empresa.codigo });
        
        // Enviar email de confirmação
        await sendEmail({
          to: empresa.email,
          subject: 'Conta ativada com sucesso!',
          html: emailContaValidada(empresa.nome)
        });
      }

      // Redirecionar para o deep link do app
      const deepLink = `checkguincho://validar-conta?token=${token}`;
      
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Conta Validada - Check Guincho</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #4CAF50; }
              p { color: #666; margin: 15px 0; }
              .success-icon { font-size: 80px; margin: 20px 0; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
              a:hover { background: #45a049; }
              .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
            <script>
              // Tentar abrir o app automaticamente
              setTimeout(function() {
                window.location.href = '${deepLink}';
              }, 1000);
            </script>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Conta Validada!</h1>
              <p>Sua conta foi ativada com sucesso!</p>
              <div class="info">
                <p><strong>Código da empresa:</strong> ${empresa.codigo}</p>
                <p>Agora você pode fazer login no aplicativo.</p>
              </div>
              <p>Abrindo o aplicativo...</p>
              <a href="${deepLink}">Se não abriu automaticamente, clique aqui</a>
            </div>
          </body>
        </html>
      `);
      
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Erro - Check Guincho</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #f44336; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>❌ Token Inválido</h1>
                <p>O link de validação expirou ou é inválido.</p>
                <p>Por favor, entre em contato com o suporte.</p>
              </div>
            </body>
          </html>
        `);
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('Erro ao validar conta via browser:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erro - Check Guincho</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #f44336; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Erro</h1>
            <p>Ocorreu um erro ao validar a conta.</p>
            <p>Por favor, tente novamente mais tarde.</p>
          </div>
        </body>
      </html>
    `);
  }
};

// Definir senha (DEPRECATED - mantido para compatibilidade)
export const definirSenha = async (req: Request, res: Response) => {
  try {
    const { token, senha, device_id } = req.body;
    
    if (!token || !senha) {
      return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    }

    if (!device_id) {
      console.log('❌ [DEFINIR SENHA] Device ID não fornecido');
      return res.status(400).json({ error: 'Identificação do dispositivo é obrigatória' });
    }
    
    if (senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.action !== 'set_password') {
      return res.status(400).json({ error: 'Token inválido' });
    }
    
    const empresa = await Empresa.findByPk(decoded.empresaId);
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    if (empresa.senha) {
      return res.status(400).json({ error: 'Senha já foi definida' });
    }
    
    // Definir senha e ativar empresa
    const senhaHash = await hashPassword(senha);
    empresa.senha = senhaHash;
    empresa.ativo = true;
    empresa.data_inicio_trial = new Date(); // Inicia trial AGORA
    empresa.device_id = device_id; // Salvar device_id da primeira autenticação
    empresa.ultimo_login = new Date();
    await empresa.save();
    
    // Enviar email de confirmação
    await sendEmail({
      to: empresa.email,
      subject: 'Senha definida com sucesso!',
      html: emailSenhaDefinida(empresa.nome)
    });
    
    // Gerar token de acesso
    const accessToken = generateToken(empresa.id, empresa.codigo);
    
    return res.json({
      message: 'Senha definida com sucesso! Seu período de teste de 7 dias começa agora.',
      token: accessToken,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        codigo: empresa.codigo,
        diasRestantes: empresa.diasRestantes()
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    
    console.error('Erro ao definir senha:', error);
    return res.status(500).json({ error: 'Erro ao definir senha' });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    let { codigo, senha, device_id, login } = req.body;
    if (codigo) codigo = codigo.trim().toLowerCase();
    login = normalizarLogin(login);

    console.log('[LOGIN] Tentativa de login:', { codigo, login: login || undefined, device_id });

    if (!codigo || !senha) {
      return res.status(400).json({ error: 'Codigo da empresa e senha sao obrigatorios' });
    }

    if (!device_id) {
      return res.status(400).json({ error: 'Identificacao do dispositivo e obrigatoria' });
    }

    const empresa = await Empresa.findOne({ where: { codigo } });

    if (!empresa) {
      return res.status(401).json({ error: 'Codigo ou senha invalidos' });
    }

    if (!login) {
      login = normalizarLogin(empresa.login_responsavel || empresa.cpf_responsavel || empresa.cnpj || empresa.codigo);
    }

    if (!empresa.ativo) {
      return res.status(401).json({
        error: 'Conta nao validada. Verifique seu email para validar a conta.'
      });
    }

    if (!empresa.senha) {
      return res.status(401).json({
        error: 'Senha nao definida. Verifique seu email para definir a senha.'
      });
    }

    let senhaHash = empresa.senha;
    let usuario: Usuario | null = null;
    let role = 'admin';
    const loginEhDono = loginAdministrador(empresa, login);

    if (!loginEhDono) {
      usuario = await Usuario.findOne({
        where: {
          empresa_id: empresa.id,
          login,
          ativo: true,
        },
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Usuario ou senha invalidos' });
      }

      senhaHash = usuario.senha;
      role = usuario.role;
    }

    const senhaValida = await comparePassword(senha, senhaHash);

    if (!senhaValida) {
      return res.status(401).json({ error: loginEhDono ? 'Login ou senha invalidos' : 'Usuario ou senha invalidos' });
    }

    const token = generateToken(empresa.id, empresa.codigo, usuario?.id, role);

    const controleLicencas = sincronizarSessaoLicenca(empresa, token, device_id, usuario?.id, role);
    empresa.device_id = device_id;
    empresa.ultimo_login = new Date();
    await empresa.save();
    console.log(`[LOGIN] Sessao ativa (${controleLicencas.sessoesAtivas}/${controleLicencas.quantidadeLicencas} dispositivos ativos)`);

    await createLog(
      { empresaId: empresa.id, usuarioId: usuario?.id } as Request,
      {
        acao: 'login',
        entidade: usuario ? 'usuario' : 'empresa',
        entidade_id: usuario?.id || empresa.id
      }
    );

    return res.json({
      token,
      empresa: toEmpresaResponse(empresa),
      usuario: usuario ? usuarioResponse(usuario) : {
        id: null,
        empresa_id: empresa.id,
        nome: empresa.nome,
        login: empresa.login_responsavel || empresa.cpf_responsavel || empresa.cnpj,
        email: empresa.email,
        role: 'admin',
        ativo: true,
      },
    });
  } catch (error) {
    console.error('[LOGIN] Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
};
// Obter informações da empresa logada
export const getEmpresa = async (req: Request, res: Response) => {
  try {
    const empresa = req.empresa!;
    
    // Calcular dias restantes e se está expirado
    const diasRestantes = empresa.diasRestantes();
    const assinaturaAtiva = empresa.isAssinaturaAtiva();
    
    // Se a assinatura expirou e está marcada como ativa, precisamos avisar
    const ativoAjustado = empresa.ativo && assinaturaAtiva;
    
    return res.json({
      ...toEmpresaResponse(empresa),
      ativo: ativoAjustado,
      diasRestantes,
      assinaturaAtiva,
    });
  } catch (error) {
    console.error('Erro ao obter empresa:', error);
    return res.status(500).json({ error: 'Erro ao obter informações da empresa' });
  }
};

// Redirecionar link HTTP para deep link do app
export const redirecionarDefinirSenha = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token não fornecido' });
    }

    // Redirecionar para o deep link do app
    const deepLink = `checkguincho://definir-senha?token=${encodeURIComponent(token)}`;
    
    // Retornar HTML com redirecionamento automático
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Redirecionando...</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #2C3E50;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          a {
            display: inline-block;
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          a:hover {
            background: #45a049;
          }
        </style>
        <script>
          // Tentar redirecionar para o deep link
          window.location.href = '${deepLink}';
          
          // Se não conseguir (deep link não funcionar), mostrar o botão após 2 segundos
          setTimeout(function() {
            document.getElementById('fallback').style.display = 'block';
          }, 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Abrindo Check Guincho...</h1>
          <p id="loading">Se o aplicativo não abrir automaticamente, clique no botão abaixo:</p>
          <div id="fallback" style="display: none;">
            <p>Se o aplicativo não foi aberto, clique aqui:</p>
            <a href="${deepLink}">Abrir Check Guincho</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro ao redirecionar:', error);
    return res.status(500).json({ error: 'Erro ao processar redirecionamento' });
  }
};

// Atualizar informações da empresa
export const atualizarEmpresa = async (req: Request, res: Response) => {
  try {
    console.log('📝 [ATUALIZAR] Request recebido');
    const empresaId = req.empresaId;
    const nomeNormalizado = String(req.body.nome || '').trim();
    const emailNormalizado = String(req.body.email || '').trim().toLowerCase();

    console.log('📝 [ATUALIZAR] empresaId:', empresaId, 'nome:', nomeNormalizado, 'email:', emailNormalizado);

    if (!empresaId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!nomeNormalizado || !emailNormalizado) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Verificar se email já existe em outra empresa
    if (emailNormalizado !== empresa.email) {
      const emailExistente = await Empresa.findOne({ where: { email: emailNormalizado } });
      if (emailExistente) {
        return res.status(400).json({ error: 'Email já cadastrado em outra empresa' });
      }
    }

    await empresa.update({ nome: nomeNormalizado, email: emailNormalizado });
    
    console.log(`✅ [ATUALIZAR] Empresa ${empresaId} atualizada: ${empresa.nome} | ${empresa.email}`);
    
    return res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      empresa: toEmpresaResponse(empresa)
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
};

export const atualizarPrestador = async (req: Request, res: Response) => {
  try {
    if (req.usuarioRole && req.usuarioRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas o cadastro administrador da empresa pode alterar dados do prestador e logo' });
    }

    const empresa = req.empresa!;
    const {
      prestador_nome,
      prestador_telefone,
      logo_base64,
      remover_logo
    } = req.body;

    if (prestador_nome !== undefined) {
      empresa.prestador_nome = String(prestador_nome || '').trim() || undefined;
    }

    if (prestador_telefone !== undefined) {
      empresa.prestador_telefone = String(prestador_telefone || '').trim() || undefined;
    }

    if (remover_logo) {
      if (empresa.logo_cloudinary_id) {
        await deleteImage(empresa.logo_cloudinary_id);
      }
      empresa.logo_url = undefined;
      empresa.logo_cloudinary_id = undefined;
    } else if (logo_base64) {
      if (empresa.logo_cloudinary_id) {
        await deleteImage(empresa.logo_cloudinary_id);
      }

      if (cloudinaryConfigurado()) {
        try {
          const uploadResult = await uploadBase64Image(String(logo_base64), `logos/${empresa.id}`);
          empresa.logo_url = uploadResult.secure_url;
          empresa.logo_cloudinary_id = uploadResult.public_id;
        } catch (uploadError) {
          console.warn('Falha ao enviar logo para Cloudinary; salvando data URI no banco:', uploadError);
          empresa.logo_url = String(logo_base64);
          empresa.logo_cloudinary_id = undefined;
        }
      } else {
        empresa.logo_url = String(logo_base64);
        empresa.logo_cloudinary_id = undefined;
      }
    }

    await empresa.save();

    return res.json({
      success: true,
      message: 'Dados do prestador atualizados com sucesso',
      empresa: toEmpresaResponse(empresa),
    });
  } catch (error) {
    console.error('Erro ao atualizar dados do prestador:', error);
    return res.status(500).json({ error: 'Erro ao atualizar dados do prestador' });
  }
};
const exigirAdmin = (req: Request, res: Response): boolean => {
  if (req.usuarioRole && req.usuarioRole !== 'admin') {
    res.status(403).json({ error: 'Apenas o administrador da empresa pode gerenciar usuarios' });
    return false;
  }

  return true;
};

export const listarUsuarios = async (req: Request, res: Response) => {
  try {
    if (!exigirAdmin(req, res)) return;

    const usuarios = await Usuario.findAll({
      where: { empresa_id: req.empresaId },
      order: [['ativo', 'DESC'], ['nome', 'ASC']],
    });

    const ativos = usuarios.filter(usuario => usuario.ativo).length;
    const limiteFuncionarios = Math.max((req.empresa?.quantidade_licencas || 1) - 1, 0);

    const administrador = {
      id: 0,
      empresa_id: req.empresa!.id,
      nome: req.empresa!.nome,
      login: req.empresa!.login_responsavel || req.empresa!.cnpj,
      email: req.empresa!.email,
      role: 'admin',
      ativo: true,
    };

    return res.json({
      usuarios: [administrador, ...usuarios.map(usuarioResponse)],
      limite_funcionarios: limiteFuncionarios,
      funcionarios_ativos: ativos,
      licencas_total: req.empresa?.quantidade_licencas || 1,
    });
  } catch (error) {
    console.error('Erro ao listar usuarios:', error);
    return res.status(500).json({ error: 'Erro ao listar usuarios' });
  }
};

export const criarUsuario = async (req: Request, res: Response) => {
  try {
    if (!exigirAdmin(req, res)) return;

    const empresa = req.empresa!;
    const nome = String(req.body.nome || '').trim();
    const login = normalizarLogin(req.body.login);
    const email = req.body.email ? normalizarEmail(req.body.email) : undefined;
    const senha = String(req.body.senha || '');
    const role = ['operador', 'visualizador'].includes(req.body.role) ? req.body.role : 'operador';

    if (!nome || !login || !senha) {
      return res.status(400).json({ error: 'Nome, login e senha sao obrigatorios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no minimo 6 caracteres' });
    }

    const limiteFuncionarios = Math.max((empresa.quantidade_licencas || 1) - 1, 0);
    const funcionariosAtivos = await Usuario.count({ where: { empresa_id: empresa.id, ativo: true } });

    if (funcionariosAtivos >= limiteFuncionarios) {
      return res.status(400).json({
        error: `Limite de usuarios atingido. Sua assinatura permite ${empresa.quantidade_licencas || 1} licenca(s): 1 administrador e ${limiteFuncionarios} funcionario(s).`,
      });
    }

    if (somenteDigitos(login) === somenteDigitos(empresa.cnpj) || login === normalizarLogin(empresa.codigo)) {
      return res.status(400).json({ error: 'Este login esta reservado para o administrador da empresa' });
    }

    const usuarioExistente = await Usuario.findOne({ where: { empresa_id: empresa.id, login } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Login ja cadastrado para esta empresa' });
    }

    const usuario = await Usuario.create({
      empresa_id: empresa.id,
      nome,
      login,
      email,
      senha: await hashPassword(senha),
      role,
      ativo: true,
    });

    return res.status(201).json({ usuario: usuarioResponse(usuario) });
  } catch (error) {
    console.error('Erro ao criar usuario:', error);
    return res.status(500).json({ error: 'Erro ao criar usuario' });
  }
};

export const atualizarUsuario = async (req: Request, res: Response) => {
  try {
    if (!exigirAdmin(req, res)) return;

    const empresa = req.empresa!;
    if (Number(req.params.id) === 0) {
      const nomeEmpresa = req.body.nome !== undefined ? String(req.body.nome || '').trim() : empresa.nome;
      const loginResponsavel = req.body.login !== undefined ? normalizarLogin(req.body.login) : normalizarLogin(empresa.login_responsavel || empresa.cnpj);
      const senha = req.body.senha ? String(req.body.senha) : undefined;

      if (!nomeEmpresa || !loginResponsavel) {
        return res.status(400).json({ error: 'Nome e login sao obrigatorios' });
      }

      const loginExistente = await Usuario.findOne({
        where: {
          empresa_id: empresa.id,
          login: loginResponsavel,
        },
      });

      if (loginExistente) {
        return res.status(400).json({ error: 'Login ja cadastrado para um funcionario' });
      }

      await empresa.update({
        nome: nomeEmpresa,
        login_responsavel: loginResponsavel,
        ...(senha ? { senha: await hashPassword(senha) } : {}),
      });

      return res.json({
        usuario: {
          id: 0,
          empresa_id: empresa.id,
          nome: empresa.nome,
          login: empresa.login_responsavel || empresa.cnpj,
          email: empresa.email,
          role: 'admin',
          ativo: true,
        },
      });
    }

    const usuario = await Usuario.findOne({
      where: {
        id: req.params.id,
        empresa_id: empresa.id,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const nome = req.body.nome !== undefined ? String(req.body.nome || '').trim() : usuario.nome;
    const login = req.body.login !== undefined ? normalizarLogin(req.body.login) : usuario.login;
    const email = req.body.email !== undefined ? normalizarEmail(req.body.email) || undefined : usuario.email;
    const senha = req.body.senha ? String(req.body.senha) : undefined;
    const role = ['operador', 'visualizador'].includes(req.body.role) ? req.body.role : usuario.role;
    const ativo = req.body.ativo !== undefined ? Boolean(req.body.ativo) : usuario.ativo;

    if (!nome || !login) {
      return res.status(400).json({ error: 'Nome e login sao obrigatorios' });
    }

    if (senha && senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no minimo 6 caracteres' });
    }

    if (!usuario.ativo && ativo) {
      const limiteFuncionarios = Math.max((empresa.quantidade_licencas || 1) - 1, 0);
      const funcionariosAtivos = await Usuario.count({ where: { empresa_id: empresa.id, ativo: true } });
      if (funcionariosAtivos >= limiteFuncionarios) {
        return res.status(400).json({ error: 'Limite de usuarios ativos atingido para a quantidade de licencas' });
      }
    }

    if (somenteDigitos(login) === somenteDigitos(empresa.cnpj) || login === normalizarLogin(empresa.codigo)) {
      return res.status(400).json({ error: 'Este login esta reservado para o administrador da empresa' });
    }

    if (login !== usuario.login) {
      const usuarioExistente = await Usuario.findOne({
        where: {
          empresa_id: empresa.id,
          login,
          id: { [Op.ne]: usuario.id },
        },
      });

      if (usuarioExistente) {
        return res.status(400).json({ error: 'Login ja cadastrado para esta empresa' });
      }
    }

    await usuario.update({
      nome,
      login,
      email,
      role,
      ativo,
      ...(senha ? { senha: await hashPassword(senha) } : {}),
    });

    if (!ativo) {
      empresa.active_sessions = (empresa.active_sessions || []).filter(sessao => sessao.usuario_id !== usuario.id);
      empresa.active_tokens = (empresa.active_sessions || []).map(sessao => sessao.token);
      await empresa.save();
    }

    return res.json({ usuario: usuarioResponse(usuario) });
  } catch (error) {
    console.error('Erro ao atualizar usuario:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuario' });
  }
};

export const removerUsuario = async (req: Request, res: Response) => {
  try {
    if (!exigirAdmin(req, res)) return;

    const empresa = req.empresa!;
    const usuario = await Usuario.findOne({
      where: {
        id: req.params.id,
        empresa_id: empresa.id,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    await usuario.update({ ativo: false });
    empresa.active_sessions = (empresa.active_sessions || []).filter(sessao => sessao.usuario_id !== usuario.id);
    empresa.active_tokens = (empresa.active_sessions || []).map(sessao => sessao.token);
    await empresa.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover usuario:', error);
    return res.status(500).json({ error: 'Erro ao remover usuario' });
  }
};
// Desenvolvimento: Resetar trial para X dias atrás
export const devResetarTrial = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Apenas em desenvolvimento' });
    }

    const { empresa_id, dias_atras = 7 } = req.body;

    if (!empresa_id) {
      return res.status(400).json({ error: 'empresa_id obrigatório' });
    }

    const empresa = await Empresa.findByPk(empresa_id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Calcular data de início do trial há X dias atrás
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias_atras);

    // Calcular dias restantes
    const agora = new Date();
    const dataExpiracao = new Date(dataInicio);
    dataExpiracao.setDate(dataExpiracao.getDate() + 7); // Trial é de 7 dias

    const diasRestantes = Math.max(0, Math.ceil((dataExpiracao.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)));

    // NÃO mexe no campo 'ativo' (que é para validação de email)
    // Apenas ajusta os campos de trial/assinatura
    await empresa.update({
      data_inicio_trial: dataInicio,
      data_expiracao: undefined  // Remove assinatura paga
      // ativo permanece true (validação de email)
    });

    console.log(`🔄 [DEV] Trial resetado para ${dias_atras} dias atrás. Dias restantes: ${diasRestantes}`);

    return res.json({
      message: `Trial resetado. Data início: ${dataInicio.toISOString()}, Dias restantes: ${diasRestantes}`,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        data_inicio_trial: dataInicio,
        dias_restantes: diasRestantes,
        emTrial: true
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao resetar trial:', error);
    return res.status(500).json({ error: 'Erro ao resetar trial' });
  }
};

// Desenvolvimento: Forçar reativação da empresa (resolve problema de validação)
export const devReativarEmpresa = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Apenas em desenvolvimento' });
    }

    const { empresa_id } = req.body;

    if (!empresa_id) {
      return res.status(400).json({ error: 'empresa_id obrigatório' });
    }

    const empresa = await Empresa.findByPk(empresa_id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Forçar empresa como validada e ativa
    await empresa.update({
      ativo: true // Força como validada/ativa
    });

    console.log(`✅ [DEV] Empresa ${empresa.id} reativada forçadamente`);

    return res.json({
      message: 'Empresa reativada com sucesso',
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        ativo: true
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao reativar empresa:', error);
    return res.status(500).json({ error: 'Erro ao reativar empresa' });
  }
};

// Desenvolvimento: Resetar senha manualmente
export const devResetarSenha = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Apenas em desenvolvimento' });
    }

    const { empresa_id, nova_senha } = req.body;

    if (!empresa_id || !nova_senha) {
      return res.status(400).json({ error: 'empresa_id e nova_senha obrigatórios' });
    }

    const empresa = await Empresa.findByPk(empresa_id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Hash da nova senha
    const senhaHash = await hashPassword(nova_senha);

    // Atualizar senha e garantir que está ativa
    await empresa.update({
      senha: senhaHash,
      ativo: true
    });

    console.log(`✅ [DEV] Senha da empresa ${empresa.id} resetada para: ${nova_senha}`);

    return res.json({
      message: 'Senha resetada com sucesso',
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        codigo: empresa.codigo
      },
      nova_senha: nova_senha // Apenas em dev
    });
  } catch (error: any) {
    console.error('❌ Erro ao resetar senha:', error);
    return res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};
