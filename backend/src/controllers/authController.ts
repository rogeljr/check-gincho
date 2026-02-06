// Logout
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const empresa = await Empresa.findByPk(decoded.empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    if (!empresa.active_tokens || !empresa.active_tokens.includes(token)) {
      return res.status(400).json({ error: 'Token não está ativo' });
    }
    // Remover token do array
    empresa.active_tokens = empresa.active_tokens.filter(t => t !== token);
    await empresa.save();
    console.log('✅ [LOGOUT] Token removido:', token);
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('❌ [LOGOUT] Erro ao fazer logout:', error);
    return res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};
import { Request, Response } from 'express';
import Empresa from '../models/Empresa';
import TrialUsage from '../models/TrialUsage';
import { hashPassword, comparePassword, generateToken, generateCodigoEmpresa, validarCNPJ, formatarCNPJ } from '../utils/auth';
import { sendEmail, emailBoasVindas, emailSenhaDefinida, emailValidacaoConta, emailContaValidada } from '../services/emailService';
import { createLog } from '../middleware/logger';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

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
    
    const { nome, cnpj, codigo, email, senha, cpf_responsavel, device_id, quantidade_licencas } = req.body;
    
      if (!nome || !cnpj || !email || !senha || !cpf_responsavel || !device_id) {
        console.log('❌ [CADASTRO] Dados obrigatórios faltando');
        return res.status(400).json({ 
          error: 'Nome, CNPJ, email, senha, CPF do responsável e identificação do dispositivo são obrigatórios' 
        });
      }

      // Validação de email: formato e TLD permitido
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const allowedTLDs = ['.com', '.com.br', '.net', '.org', '.br'];
      const emailNormalizado = email.trim().toLowerCase();
      if (!emailRegex.test(emailNormalizado)) {
        console.log('❌ [CADASTRO] Email inválido (regex):', emailNormalizado);
        return res.status(400).json({ error: 'Email inválido' });
      }
      const tld = emailNormalizado.substring(emailNormalizado.lastIndexOf('.'));
      if (!allowedTLDs.some(allowed => emailNormalizado.endsWith(allowed))) {
        console.log('❌ [CADASTRO] Email com TLD não permitido:', emailNormalizado);
        return res.status(400).json({ error: 'Email deve terminar com .com, .com.br, .net, .org ou .br' });
      }

      if (senha.length < 6) {
        console.log('❌ [CADASTRO] Senha muito curta');
        return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
      }

      // Validar quantidade de licenças (padrão 1, máximo 10)
      const licencas = quantidade_licencas && quantidade_licencas >= 1 && quantidade_licencas <= 10 
        ? quantidade_licencas 
        : 1;
      console.log(`📊 [CADASTRO] Quantidade de licenças selecionadas: ${licencas}`);

      // Validar CPF
      const cpfLimpo = cpf_responsavel.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        console.log('❌ [CADASTRO] CPF inválido:', cpf_responsavel);
        return res.status(400).json({ error: 'CPF inválido' });
      }
    
      if (!validarCNPJ(cnpj)) {
        console.log('❌ [CADASTRO] CNPJ inválido:', cnpj);
        return res.status(400).json({ error: 'CNPJ inválido' });
      }
    
      const cnpjFormatado = formatarCNPJ(cnpj);
      console.log('✅ [CADASTRO] CNPJ formatado:', cnpjFormatado);

    if (senha.length < 6) {
      console.log('❌ [CADASTRO] Senha muito curta');
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Validar quantidade de licenças (padrão 1, máximo 10)
    const licencas = quantidade_licencas && quantidade_licencas >= 1 && quantidade_licencas <= 10 
      ? quantidade_licencas 
      : 1;
    console.log(`📊 [CADASTRO] Quantidade de licenças selecionadas: ${licencas}`);

    // Validar CPF
    const cpfLimpo = cpf_responsavel.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      console.log('❌ [CADASTRO] CPF inválido:', cpf_responsavel);
      return res.status(400).json({ error: 'CPF inválido' });
    }
    
    if (!validarCNPJ(cnpj)) {
      console.log('❌ [CADASTRO] CNPJ inválido:', cnpj);
      return res.status(400).json({ error: 'CNPJ inválido' });
    }
    
    const cnpjFormatado = formatarCNPJ(cnpj);
    console.log('✅ [CADASTRO] CNPJ formatado:', cnpjFormatado);
    
    // 🔐 VERIFICAÇÃO ANTI-ABUSO: Verificar se CPF ou device_id já usaram trial
    const trialJaUsado = await TrialUsage.findOne({
      where: {
        [Op.or]: [
          { cpf: cpfLimpo },
          { device_id: device_id }
        ]
      }
    });
    
    let temDireitoTrial = true;
    if (trialJaUsado) {
      console.log('⚠️ [CADASTRO] CPF ou dispositivo já utilizou trial:', { cpf: cpfLimpo, device_id });
      temDireitoTrial = false;
    }
    
    // Verificar se CNPJ já existe
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
      device_id: device_id,
      quantidade_licencas: licencas, // Quantidade selecionada no cadastro
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
    
    // --- COMENTADO: Envio de email de validação ---
    // // Gerar token de validação (válido por 24h)
    // const tokenValidacao = jwt.sign(
    //   { empresaId: empresa.id, action: 'validate_account' },
    //   process.env.JWT_SECRET!,
    //   { expiresIn: '24h' }
    // );
    // console.log('🎫 [CADASTRO] Token de validação gerado');
    // const backendUrl = process.env.BACKEND_URL || `http://192.168.1.5:8080`;
    // const validacaoUrl = `${backendUrl}/api/auth/validar-conta?token=${tokenValidacao}`;
    // console.log('📧 [CADASTRO] Tentando enviar email para:', email);
    // const emailEnviado = await sendEmail({
    //   to: email,
    //   subject: 'Check Guincho - Confirme sua conta',
    //   html: emailValidacaoConta(nome, codigoFinal, validacaoUrl)
    // });
    // if (emailEnviado) {
    //   console.log('✅ [CADASTRO] Email enviado com sucesso');
    // } else {
    //   console.log('⚠️ [CADASTRO] Falha ao enviar email, mas conta foi criada');
    // }

    // Ativar empresa automaticamente
    await empresa.update({ ativo: true });
    console.log('✅ [CADASTRO] Empresa ativada automaticamente (teste)');

    return res.status(201).json({
      message: 'Empresa cadastrada e ativada com sucesso! Login liberado.',
      codigo: codigoFinal,
      email,
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

    // --- COMENTADO: Validação de token ---
    // // Verificar token
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    // if (decoded.action !== 'validate_account') {
    //   return res.status(400).json({ error: 'Token inválido' });
    // }
    // const empresa = await Empresa.findByPk(decoded.empresaId);
    // Permitir validação direta (para testes)
    return res.status(200).json({ message: 'Conta validada (teste)', validada: true });
    
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    if (empresa.ativo) {
      return res.status(400).json({ error: 'Conta já foi validada' });
    }
    
    // Ativar empresa e iniciar trial de 7 dias
    empresa.ativo = true;
    empresa.data_inicio_trial = new Date(); // ✅ Iniciar trial agora
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
          empresa.data_inicio_trial = new Date(); // ✅ Trial de 7 dias
          console.log('✅ [VALIDAÇÃO] Trial de 7 dias ativado');
        } else {
          // Se já usou trial antes, apenas 1 dia de acesso
          const dataLimitada = new Date();
          empresa.data_inicio_trial = new Date(dataLimitada.getTime() - (6 * 24 * 60 * 60 * 1000)); // 1 dia apenas
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
    const { codigo, senha, device_id } = req.body;
    
    console.log('🔐 [LOGIN] Tentativa de login:', { codigo, device_id });
    
    if (!codigo || !senha) {
      console.log('❌ [LOGIN] Código ou senha não fornecidos');
      return res.status(400).json({ error: 'Código e senha são obrigatórios' });
    }

    if (!device_id) {
      console.log('❌ [LOGIN] Device ID não fornecido');
      return res.status(400).json({ error: 'Identificação do dispositivo é obrigatória' });
    }
    
    const empresa = await Empresa.findOne({ where: { codigo } });
    
    if (!empresa) {
      console.log('❌ [LOGIN] Empresa não encontrada:', codigo);
      return res.status(401).json({ error: 'Código ou senha inválidos' });
    }
    
    console.log('✅ [LOGIN] Empresa encontrada:', { id: empresa.id, ativo: empresa.ativo, temSenha: !!empresa.senha });
    
    if (!empresa.ativo) {
      console.log('⚠️ [LOGIN] Empresa não validada');
      return res.status(401).json({ 
        error: 'Conta não validada. Verifique seu email para validar a conta.' 
      });
    }

    if (!empresa.senha) {
      console.log('⚠️ [LOGIN] Empresa sem senha definida');
      return res.status(401).json({ 
        error: 'Senha não definida. Verifique seu email para definir a senha.' 
      });
    }
    
    const senhaValida = await comparePassword(senha, empresa.senha);
    
    console.log('🔑 [LOGIN] Validação de senha:', { senhaValida });
    
    if (!senhaValida) {
      console.log('❌ [LOGIN] Senha inválida');
      return res.status(401).json({ error: 'Código ou senha inválidos' });
    }
    
    // Gerar token
    const token = generateToken(empresa.id, empresa.codigo);
    
    // 🔐 MULTI-SESSÃO: Adicionar novo token ao array active_tokens (respeita quantidade_licencas)
    // Retrocompatibilidade: empresas antigas não têm esses campos
    if (!empresa.active_tokens) {
      empresa.active_tokens = [];
    }
    
    // Usar default 1 se quantidade_licencas não existe ou é null
    const quantidadeLicencas = empresa.quantidade_licencas || 1;
    
    // Bloquear login se já atingiu o limite de licenças
    if (empresa.active_tokens.length >= quantidadeLicencas) {
      console.log('🚫 [LOGIN] Limite de dispositivos atingido. Login negado.');
      return res.status(403).json({ error: `Limite de dispositivos atingido (${quantidadeLicencas}). Faça logout em outro aparelho para liberar acesso.` });
    }

    // Adicionar novo token
    empresa.active_tokens.push(token);
    empresa.device_id = device_id;
    empresa.ultimo_login = new Date();
    await empresa.save();
    console.log(`✅ [LOGIN] Novo token adicionado (${empresa.active_tokens.length}/${quantidadeLicencas} dispositivos ativos)`);
    
    // Calcular status ajustado (considerar expiração)
    const diasRestantes = empresa.diasRestantes();
    const assinaturaAtiva = empresa.isAssinaturaAtiva();
    const ativoAjustado = empresa.ativo && assinaturaAtiva;
    
    console.log('✅ [LOGIN] Login bem-sucedido:', { 
      empresaId: empresa.id, 
      diasRestantes, 
      assinaturaAtiva,
      ativoAjustado
    });
    
    // Log de login
    await createLog(
      { empresaId: empresa.id } as Request,
      {
        acao: 'login',
        entidade: 'empresa',
        entidade_id: empresa.id
      }
    );
    
    return res.json({
      token,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        codigo: empresa.codigo,
        email: empresa.email,
        ativo: ativoAjustado, // Ajustado para considerar expiração
        diasRestantes: diasRestantes,
        assinaturaAtiva: assinaturaAtiva
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] Erro ao fazer login:', error);
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
      id: empresa.id,
      nome: empresa.nome,
      codigo: empresa.codigo,
      email: empresa.email,
      ativo: ativoAjustado, // Ajustado para considerar expiração
      diasRestantes: diasRestantes,
      assinaturaAtiva: assinaturaAtiva,
      emTrial: empresa.isTrialAtivo()
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
    const { nome, email } = req.body;

    console.log('📝 [ATUALIZAR] empresaId:', empresaId, 'nome:', nome, 'email:', email);

    if (!empresaId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Verificar se email já existe em outra empresa
    if (email !== empresa.email) {
      const emailExistente = await Empresa.findOne({ where: { email } });
      if (emailExistente) {
        return res.status(400).json({ error: 'Email já cadastrado em outra empresa' });
      }
    }

    await empresa.update({ nome, email });
    
    console.log(`✅ [ATUALIZAR] Empresa ${empresaId} atualizada: ${nome} | ${email}`);
    
    return res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        email: empresa.email,
        codigo: empresa.codigo,
        ativo: empresa.ativo,
        diasRestantes: empresa.diasRestantes
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return res.status(500).json({ error: 'Erro ao atualizar empresa' });
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