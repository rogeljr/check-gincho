import { Request, Response } from 'express';
import { Payment, Preference } from 'mercadopago';
import mercadoPagoConfig from '../config/mercadopago';
import Pagamento from '../models/Pagamento';
import Empresa from '../models/Empresa';

const paymentClient = new Payment(mercadoPagoConfig);
const preferenceClient = new Preference(mercadoPagoConfig);

// Criar preferência de pagamento (PIX ou Cartão)
export const criarPreferencia = async (req: Request, res: Response) => {
  try {
    const empresa = req.empresa!;
    console.log('📝 [PAGAMENTO] Iniciando criarPreferencia para empresa:', empresa.id);
    
    // Valor: R$5 por mês (teste)
    const valorMensal = 5.00;
    
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
        back_urls: {
          success: 'checkguincho://pagamento/sucesso',
          failure: 'checkguincho://pagamento/falha',
          pending: 'checkguincho://pagamento/pendente'
        },
        auto_return: 'approved',
        // notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/pagamentos/webhook`,
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
        preference_id: preference.id
      }
    });
    
    return res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar preferência:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
};

// Selecionar número de licenças e criar preferência de pagamento
export const selecionarLicencas = async (req: Request, res: Response) => {
  try {
    const empresa = req.empresa!;
    const { quantidade_licencas } = req.body;

    console.log('📝 [PAGAMENTO] Selecionando licenças para empresa:', empresa.id, 'Quantidade:', quantidade_licencas);

    // Validar quantidade de licenças
    if (!quantidade_licencas || typeof quantidade_licencas !== 'number') {
      return res.status(400).json({ error: 'quantidade_licencas deve ser um número' });
    }

    if (quantidade_licencas < 1 || quantidade_licencas > 10) {
      return res.status(400).json({ error: 'quantidade_licencas deve estar entre 1 e 10' });
    }

    // Validar se já tem a mesma quantidade
    if (empresa.quantidade_licencas === quantidade_licencas) {
      console.log('⚠️ [PAGAMENTO] Tentativa de pagar pela mesma quantidade já ativa');
      return res.status(400).json({ 
        error: `Você já possui ${quantidade_licencas} ${quantidade_licencas === 1 ? 'licença ativa' : 'licenças ativas'}. Selecione uma quantidade diferente.` 
      });
    }

    // Verificar se tem assinatura ativa com mais de 7 dias restantes
    const diasRestantes = empresa.diasRestantes();
    if (diasRestantes > 7) {
      console.log('⚠️ [PAGAMENTO] Assinatura ativa com muitos dias restantes:', diasRestantes);
      return res.status(400).json({ 
        error: `Você ainda tem ${diasRestantes} dias restantes. Só é possível alterar licenças nos últimos 7 dias antes da renovação.` 
      });
    }

    // Calcular valor: R$5 por licença
    const precoPorLicenca = 5.00;
    const valorTotal = precoPorLicenca * quantidade_licencas;

    // Criar preferência no Mercado Pago
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
        back_urls: {
          success: 'checkguincho://pagamento/sucesso',
          failure: 'checkguincho://pagamento/falha',
          pending: 'checkguincho://pagamento/pendente'
        },
        auto_return: 'approved',
        // notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/pagamentos/webhook`,
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
        quantidade_licencas_solicitadas: quantidade_licencas
      }
    });

    console.log(`✅ [PAGAMENTO] Preferência criada para ${quantidade_licencas} licenças - Total: R$${valorTotal.toFixed(2)}`);

    return res.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      quantidade_licencas,
      valor_total: valorTotal,
      preco_por_licenca: precoPorLicenca
    });
  } catch (error: any) {
    console.error('❌ Erro ao selecionar licenças:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Erro ao processar seleção de licenças' });
  }
};

// Webhook do Mercado Pago (notificações de pagamento)
export const webhookMercadoPago = async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    
    // Apenas processar notificações de pagamento
    if (type !== 'payment') {
      return res.sendStatus(200);
    }
    
    const paymentId = data.id;
    
    // Buscar informações do pagamento
    const payment = await paymentClient.get({ id: paymentId });
    
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