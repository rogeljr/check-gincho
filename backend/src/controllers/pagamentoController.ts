import { Request, Response } from 'express';
import { Payment, Preference } from 'mercadopago';
import { Op } from 'sequelize';
import mercadoPagoConfig from '../config/mercadopago';
import Pagamento from '../models/Pagamento';
import Empresa from '../models/Empresa';

const paymentClient = new Payment(mercadoPagoConfig);
const preferenceClient = new Preference(mercadoPagoConfig);
const PENDING_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000;

const getPublicBaseUrl = (req: Request) => {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
  if (backendUrl?.startsWith('https://')) return backendUrl;

  const host = req.get('host');
  if (!host) return undefined;

  const protocol = host.includes('railway.app') ? 'https' : req.protocol;
  return `${protocol}://${host}`;
};

const getNotificationUrl = (req: Request) => {
  const publicBaseUrl = getPublicBaseUrl(req);
  return publicBaseUrl ? `${publicBaseUrl}/api/pagamentos/webhook` : undefined;
};

const getBackUrls = (req: Request) => {
  const publicBaseUrl = getPublicBaseUrl(req);
  if (!publicBaseUrl) return undefined;

  return {
    success: `${publicBaseUrl}/api/pagamentos/retorno?status=success`,
    failure: `${publicBaseUrl}/api/pagamentos/retorno?status=failure`,
    pending: `${publicBaseUrl}/api/pagamentos/retorno?status=pending`
  };
};

const getCheckoutUrl = (preference: any) => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  return token.startsWith('TEST-')
    ? preference.sandbox_init_point || preference.init_point
    : preference.init_point || preference.sandbox_init_point;
};

const getCheckoutUrlFromPagamento = (pagamento: Pagamento) => {
  const metadata = pagamento.metadata || {};
  const preferenceId = metadata.preference_id || pagamento.mercadopago_id;

  if (metadata.checkout_url) return metadata.checkout_url;
  if (metadata.sandbox_init_point || metadata.init_point) return getCheckoutUrl(metadata);
  if (!preferenceId) return undefined;

  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const baseUrl = token.startsWith('TEST-')
    ? 'https://sandbox.mercadopago.com.br/checkout/v1/redirect'
    : 'https://www.mercadopago.com.br/checkout/v1/redirect';

  return `${baseUrl}?pref_id=${encodeURIComponent(preferenceId)}`;
};

const findRecentPendingPayment = async (empresaId: number) => {
  return Pagamento.findOne({
    where: {
      empresa_id: empresaId,
      status: 'pending',
      createdAt: {
        [Op.gte]: new Date(Date.now() - PENDING_PAYMENT_WINDOW_MS)
      }
    },
    order: [['createdAt', 'DESC']]
  });
};

const buildPendingPaymentResponse = (pagamento: Pagamento, quantidadeLicencas: number) => {
  const metadata = pagamento.metadata || {};
  const preferenceId = metadata.preference_id || pagamento.mercadopago_id;
  const valor = Number(pagamento.valor);
  const licencasPagamento = pagamento.quantidade_licencas_solicitadas || quantidadeLicencas;

  return {
    message: 'Já existe uma cobrança pendente recente. Reabrindo o mesmo checkout.',
    preference_id: preferenceId,
    init_point: metadata.init_point,
    sandbox_init_point: metadata.sandbox_init_point,
    checkout_url: getCheckoutUrlFromPagamento(pagamento),
    quantidade_licencas: licencasPagamento,
    valor_total: valor,
    preco_por_licenca: licencasPagamento > 0 ? valor / licencasPagamento : valor
  };
};

const getFirstQueryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.find((item) => {
      const text = String(item || '').trim().toLowerCase();
      return text && text !== 'null' && text !== 'undefined';
    });
  }

  return value;
};

const normalizePaymentReturnStatus = (req: Request) => {
  const candidates = [req.query.status, req.query.collection_status, req.query.payment_status]
    .map(getFirstQueryValue)
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => value && value !== 'null' && value !== 'undefined');

  const rawStatus = candidates[0] || 'pending';

  if (['success', 'approved', 'accredited'].includes(rawStatus)) {
    return {
      appPath: 'sucesso',
      title: 'Pagamento aprovado',
      description: 'Seu pagamento foi aprovado. Voltando para o Check Guincho.'
    };
  }

  if (['failure', 'rejected', 'cancelled', 'canceled'].includes(rawStatus)) {
    return {
      appPath: 'falha',
      title: 'Pagamento não aprovado',
      description: 'O pagamento não foi aprovado. Você pode voltar ao app e tentar novamente.'
    };
  }

  return {
    appPath: 'pendente',
    title: 'Pagamento pendente',
    description: 'O pagamento ainda está em análise. Volte ao app e toque em Atualizar Agora.'
  };
};

const ensureMercadoPagoConfigured = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

  if (!token) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado no backend');
  }

  if (!token.startsWith('TEST-') && !token.startsWith('APP_USR-')) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN inválido. Use Access Token TEST- no sandbox ou APP_USR- em produção.');
  }
};

const getPagamentoErrorResponse = (error: any) => {
  const mercadoPagoMessage = error?.cause?.[0]?.description || error?.cause?.message || error?.message;

  return {
    error: 'Erro ao criar preferência de pagamento',
    ...(mercadoPagoMessage ? { details: mercadoPagoMessage } : {})
  };
};

const getPaymentNotDueResponse = (diasRestantes: number) => ({
  error: `Sua assinatura ainda tem ${diasRestantes} dia(s) restante(s). A renovação só fica disponível na data da próxima cobrança.`
});

// Criar preferência de pagamento (PIX ou Cartão)
export const criarPreferencia = async (req: Request, res: Response) => {
  try {
    const empresa = req.empresa!;
    ensureMercadoPagoConfigured();
    console.log('📝 [PAGAMENTO] Iniciando criarPreferencia para empresa:', empresa.id);

    const diasRestantes = empresa.diasRestantes();
    if (diasRestantes > 0) {
      console.log('⚠️ [PAGAMENTO] Renovação bloqueada antes do vencimento:', diasRestantes);
      return res.status(400).json(getPaymentNotDueResponse(diasRestantes));
    }
    
    // Valor: R$5 por mês (teste)
    const valorMensal = 5.00;

    const pagamentoPendente = await findRecentPendingPayment(empresa.id);
    if (pagamentoPendente) {
      return res.json(buildPendingPaymentResponse(pagamentoPendente, 1));
    }
    
    const notificationUrl = getNotificationUrl(req);
    const backUrls = getBackUrls(req);
    
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `check-guincho-${empresa.id}`,
            title: 'Check Guincho - Assinatura Mensal',
            description: `Assinatura mensal para ${empresa.nome}`,
            quantity: 1,
            unit_price: valorMensal,
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: empresa.nome,
          email: empresa.email
        },
        ...(backUrls ? { back_urls: backUrls } : {}),
        auto_return: 'approved',
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        external_reference: `empresa_${empresa.id}_${Date.now()}`,
        statement_descriptor: 'CHECK GUINCHO',
        payment_methods: {
          excluded_payment_types: [],
          installments: 1 // Sem parcelamento
        }
      }
    });
    
    // Criar registro de pagamento pendente
    const pagamento = await Pagamento.create({
      empresa_id: empresa.id,
      mercadopago_id: preference.id,
      valor: valorMensal,
      status: 'pending',
      tipo_pagamento: 'pix', // Será atualizado depois
      quantidade_licencas_solicitadas: 1,
      metadata: {
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        checkout_url: getCheckoutUrl(preference),
        quantidade_licencas_solicitadas: 1
      }
    });
    
    return res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      checkout_url: getCheckoutUrl(preference)
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar preferência:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      response: error.response?.data || error.response,
      stack: error.stack
    });
    return res.status(500).json(getPagamentoErrorResponse(error));
  }
};

// Selecionar número de licenças e criar preferência de pagamento
export const selecionarLicencas = async (req: Request, res: Response) => {
  try {
    const empresa = req.empresa!;
    ensureMercadoPagoConfigured();
    const { quantidade_licencas } = req.body;

    console.log('📝 [PAGAMENTO] Selecionando licenças para empresa:', empresa.id, 'Quantidade:', quantidade_licencas);

    // Validar quantidade de licenças
    if (!quantidade_licencas || typeof quantidade_licencas !== 'number') {
      return res.status(400).json({ error: 'quantidade_licencas deve ser um número' });
    }

    if (quantidade_licencas < 1 || quantidade_licencas > 10) {
      return res.status(400).json({ error: 'quantidade_licencas deve estar entre 1 e 10' });
    }

    // Só permite gerar nova cobrança quando chegar na data prevista da próxima cobrança.
    const diasRestantes = empresa.diasRestantes();
    if (diasRestantes > 0) {
      console.log('⚠️ [PAGAMENTO] Renovação bloqueada antes do vencimento:', diasRestantes);
      return res.status(400).json(getPaymentNotDueResponse(diasRestantes));
    }

    // Calcular valor: R$5 por licença
    const precoPorLicenca = 5.00;
    const valorTotal = precoPorLicenca * quantidade_licencas;

    const pagamentoPendente = await findRecentPendingPayment(empresa.id);
    if (pagamentoPendente) {
      console.log('⚠️ [PAGAMENTO] Reutilizando cobrança pendente recente:', pagamentoPendente.id);
      return res.json(buildPendingPaymentResponse(pagamentoPendente, quantidade_licencas));
    }

    // Criar preferência no Mercado Pago
    const notificationUrl = getNotificationUrl(req);
    const backUrls = getBackUrls(req);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `check-guincho-${empresa.id}`,
            title: `Check Guincho - ${quantidade_licencas} ${quantidade_licencas === 1 ? 'Licença' : 'Licenças'} Mensal`,
            description: `${quantidade_licencas} ${quantidade_licencas === 1 ? 'licença' : 'licenças'} para ${empresa.nome} - R$${precoPorLicenca.toFixed(2)} cada`,
            quantity: quantidade_licencas,
            unit_price: precoPorLicenca,
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: empresa.nome,
          email: empresa.email
        },
        ...(backUrls ? { back_urls: backUrls } : {}),
        auto_return: 'approved',
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        external_reference: `empresa_${empresa.id}_${Date.now()}_${quantidade_licencas}lic`,
        statement_descriptor: 'CHECK GUINCHO',
        payment_methods: {
          excluded_payment_types: [],
          installments: 1 // Sem parcelamento
        }
      }
    });

    // Criar registro de pagamento pendente
    const pagamento = await Pagamento.create({
      empresa_id: empresa.id,
      mercadopago_id: preference.id,
      valor: valorTotal,
      status: 'pending',
      tipo_pagamento: 'pix', // Será atualizado depois
      quantidade_licencas_solicitadas: quantidade_licencas,
      metadata: {
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        checkout_url: getCheckoutUrl(preference),
        quantidade_licencas_solicitadas: quantidade_licencas
      }
    });

    console.log(`✅ [PAGAMENTO] Preferência criada para ${quantidade_licencas} licenças - Total: R$${valorTotal.toFixed(2)}`);

    return res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      checkout_url: getCheckoutUrl(preference),
      quantidade_licencas,
      valor_total: valorTotal,
      preco_por_licenca: precoPorLicenca
    });
  } catch (error: any) {
    console.error('❌ Erro ao selecionar licenças:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      response: error.response?.data || error.response,
      stack: error.stack
    });
    return res.status(500).json(getPagamentoErrorResponse(error));
  }
};

export const retornoPagamento = async (req: Request, res: Response) => {
  const paymentReturn = normalizePaymentReturnStatus(req);
  const deepLink = `checkguincho://pagamento/${paymentReturn.appPath}`;
  const intentLink = `intent://pagamento/${paymentReturn.appPath}#Intent;scheme=checkguincho;package=com.checkguincho.app;end`;

  return res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pagamento - Check Guincho</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f7f9fc; color: #1a1a1a; }
          .box { max-width: 420px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 10px; border: 1px solid #e6ecf3; }
          a { display: inline-block; margin-top: 16px; padding: 12px 18px; background: #27AE60; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; }
          small { display: block; margin-top: 16px; color: #667; line-height: 1.4; }
        </style>
        <script>
          function abrirApp() {
            window.location.href = '${deepLink}';
            setTimeout(function() {
              window.location.href = '${intentLink}';
            }, 700);
          }
          setTimeout(abrirApp, 800);
        </script>
      </head>
      <body>
        <div class="box">
          <h1>${paymentReturn.title}</h1>
          <p>${paymentReturn.description}</p>
          <a href="${deepLink}" onclick="abrirApp(); return false;">Abrir Check Guincho</a>
          <small>Se estiver testando pelo Expo Go, volte manualmente para o app. O botão funciona melhor no APK instalado.</small>
        </div>
      </body>
    </html>
  `);
};

// Webhook do Mercado Pago (notificações de pagamento)
export const webhookMercadoPago = async (req: Request, res: Response) => {
  try {
    const type = req.body?.type || req.query?.type || req.query?.topic;
    const paymentId = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;
    
    // Apenas processar notificações de pagamento
    if (type !== 'payment') {
      return res.sendStatus(200);
    }

    if (!paymentId) {
      console.warn('⚠️ [WEBHOOK] Notificação de pagamento sem ID:', { body: req.body, query: req.query });
      return res.sendStatus(400);
    }
    
    // Buscar informações do pagamento
    const payment = await paymentClient.get({ id: String(paymentId) });
    
    if (!payment) {
      return res.sendStatus(404);
    }
    
    // Buscar pagamento no banco
    const pagamento = await Pagamento.findOne({
      where: { mercadopago_id: payment.id?.toString() }
    });
    
    if (!pagamento) {
      // Criar novo registro se não existir
      const empresaId = parseInt(payment.external_reference?.split('_')[1] || '0');
      
      if (!empresaId) {
        return res.sendStatus(400);
      }

      // Tentar extrair quantidade de licenças do external_reference (formato: empresa_X_Y_Zlic)
      const licMatch = payment.external_reference?.match(/_(\d+)lic/);
      const quantidadeLicencas = licMatch ? parseInt(licMatch[1]) : 1;
      
      await Pagamento.create({
        empresa_id: empresaId,
        mercadopago_id: payment.id?.toString(),
        valor: payment.transaction_amount || 0,
        status: payment.status as any,
        tipo_pagamento: payment.payment_type_id as any,
        quantidade_licencas_solicitadas: quantidadeLicencas,
        data_pagamento: payment.status === 'approved' ? new Date() : undefined,
        metadata: payment as any
      });
      
      // Se aprovado, estender assinatura com quantidade de licenças
      if (payment.status === 'approved') {
        await estenderAssinatura(empresaId, quantidadeLicencas);
      }
    } else {
      // Atualizar status
      pagamento.status = payment.status as any;
      pagamento.tipo_pagamento = payment.payment_type_id as any;
      
      if (payment.status === 'approved' && !pagamento.data_pagamento) {
        pagamento.data_pagamento = new Date();
        await estenderAssinatura(pagamento.empresa_id, pagamento.quantidade_licencas_solicitadas);
      }
      
      pagamento.metadata = payment as any;
      await pagamento.save();
    }
    
    return res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.sendStatus(500);
  }
};

// Estender assinatura da empresa por 30 dias e atualizar licenças
const estenderAssinatura = async (empresaId: number, quantidadeLicencas?: number): Promise<void> => {
  const empresa = await Empresa.findByPk(empresaId);
  
  if (!empresa) return;
  
  const hoje = new Date();
  const dataExpiracao = empresa.data_expiracao && empresa.data_expiracao > hoje
    ? empresa.data_expiracao
    : hoje;
  
  // Adicionar 30 dias
  dataExpiracao.setDate(dataExpiracao.getDate() + 30);
  
  // Atualizar quantidade de licenças se fornecida
  if (quantidadeLicencas && quantidadeLicencas > 0) {
    empresa.quantidade_licencas = quantidadeLicencas;
    console.log(`📊 [ASSINATURA] Licenças atualizadas para ${quantidadeLicencas}`);
  }
  
  // Atualizar todos os campos relevantes
  empresa.data_expiracao = dataExpiracao;
  empresa.ativo = true;
  empresa.data_inicio_trial = undefined; // Remove trial
  await empresa.save();
  
  console.log(`✅ Assinatura da empresa ${empresa.nome} estendida até ${dataExpiracao.toLocaleDateString()} com ${empresa.quantidade_licencas} licença(s)`);
};

// Listar pagamentos da empresa
export const listarPagamentos = async (req: Request, res: Response) => {
  try {
    const pagamentos = await Pagamento.findAll({
      where: { empresa_id: req.empresaId },
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    return res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
};

// Obter status de pagamento
export const obterPagamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const pagamento = await Pagamento.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    return res.json(pagamento);
  } catch (error) {
    console.error('Erro ao obter pagamento:', error);
    return res.status(500).json({ error: 'Erro ao obter pagamento' });
  }
};
// Limpar pagamentos de teste (apenas desenvolvimento, SEM autenticação)
export const limparPagamentosTeste = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Apenas em desenvolvimento' });
    }

    const { empresa_id } = req.query;

    if (!empresa_id) {
      return res.status(400).json({ error: 'empresa_id obrigatório' });
    }

    const id = parseInt(empresa_id as string);
    
    // Deletar todos os pagamentos dessa empresa
    const deletados = await Pagamento.destroy({
      where: { empresa_id: id }
    });

    console.log(`🗑️  [PAGAMENTO] ${deletados} pagamento(s) deletado(s) para empresa ${id}`);

    // Buscar e resetar empresa
    const empresa = await Empresa.findByPk(id);
    if (empresa) {
      await empresa.update({
        data_expiracao: undefined,
        data_inicio_trial: new Date()
      });
      console.log('✅ [PAGAMENTO] Empresa resetada para estado inicial');
    }

    return res.json({
      message: `${deletados} pagamento(s) deletado(s). Empresa resetada.`
    });
  } catch (error: any) {
    console.error('❌ Erro ao limpar pagamentos:', error);
    return res.status(500).json({ error: 'Erro ao limpar pagamentos' });
  }
};
