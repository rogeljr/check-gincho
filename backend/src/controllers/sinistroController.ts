import { Request, Response } from 'express';
import Sinistro from '../models/Sinistro';
import Foto from '../models/Foto';
import Empresa from '../models/Empresa';
import { createLog } from '../middleware/logger';
import { uploadBase64Image, deleteImage } from '../services/uploadService';
import { uploadPDF, generatePDFClienteComSenha } from '../services/pdfService';
import { sendEmailComAnexo, emailPDFSinistroCliente } from '../services/emailService';
import { Op } from 'sequelize';

// Gerar número único de sinistro
const gerarNumeroSinistro = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  
  return `SIN${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}${random}`;
};

// Criar novo sinistro
export const criarSinistro = async (req: Request, res: Response) => {
  try {
    // Não registrar CPF, telefone, assinatura ou demais dados pessoais.
    console.log('📝 [SINISTRO] Nova solicitação recebida', {
      empresa_id: req.empresaId,
      possui_placa: Boolean(req.body.placa_veiculo)
    });
    
    const {
      placa_veiculo,
      tipo_atendimento,
      nome_cliente,
      cpf_cliente,
      telefone_cliente,
      modelo_veiculo,
      cor_veiculo,
      observacoes,
      latitude_inicio,
      longitude_inicio,
      origem_latitude,
      origem_longitude,
      origem_endereco,
      destino_latitude,
      destino_longitude,
      destino_endereco,
      quilometragem,
    } = req.body;
    
    if (!placa_veiculo) {
      console.log('❌ [SINISTRO] Placa do veículo é obrigatória');
      return res.status(400).json({ error: 'Placa do veículo é obrigatória' });
    }
    
    const sinistro = await Sinistro.create({
      numero_sinistro: gerarNumeroSinistro(),
      empresa_id: req.empresaId!,
      placa_veiculo: placa_veiculo.toUpperCase(),
      tipo_atendimento: tipo_atendimento || 'Guincho',
      nome_cliente,
      cpf_cliente,
      telefone_cliente,
      modelo_veiculo,
      cor_veiculo,
      observacoes,
      latitude_inicio: latitude_inicio || origem_latitude,
      longitude_inicio: longitude_inicio || origem_longitude,
      origem_endereco,
      latitude_fim: destino_latitude,
      longitude_fim: destino_longitude,
      destino_endereco,
      quilometragem: quilometragem,
      status: 'rascunho',
      sincronizado: true
    });
    
    console.log('✅ [SINISTRO] Sinistro criado:', { id: sinistro.id, placa: sinistro.placa_veiculo });
    
    await createLog(req, {
      acao: 'criar',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.status(201).json(sinistro);
  } catch (error) {
    console.error('❌ [SINISTRO] Erro ao criar sinistro:', error);
    return res.status(500).json({ error: 'Erro ao criar sinistro', details: (error as any).message });
  }
};

// Listar sinistros da empresa
export const listarSinistros = async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0, startDate, endDate } = req.query;
    
    const where: any = { empresa_id: req.empresaId };
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate as string) : new Date();

      // Ajustar para intervalo do dia inteiro
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      where.createdAt = { [Op.between]: [start, end] };
    }
    
    const sinistros = await Sinistro.findAll({
      where,
      include: [
        {
          model: Foto,
          as: 'fotos',
          attributes: ['id', 'url', 'descricao', 'ordem']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Math.min(Math.max(parseInt(limit as string) || 50, 1), 100),
      offset: Math.max(parseInt(offset as string) || 0, 0)
    });
    
    return res.json(sinistros);
  } catch (error) {
    console.error('Erro ao listar sinistros:', error);
    return res.status(500).json({ error: 'Erro ao listar sinistros' });
  }
};

// Obter sinistro por ID
export const obterSinistro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      },
      include: [
        {
          model: Foto,
          as: 'fotos',
          attributes: ['id', 'url', 'cloudinary_id', 'descricao', 'ordem'],
          order: [['ordem', 'ASC']]
        }
      ]
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    return res.json(sinistro);
  } catch (error) {
    console.error('Erro ao obter sinistro:', error);
    return res.status(500).json({ error: 'Erro ao obter sinistro' });
  }
};

// Atualizar sinistro
export const atualizarSinistro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      placa_veiculo,
      tipo_atendimento,
      nome_cliente,
      cpf_cliente,
      telefone_cliente,
      modelo_veiculo,
      cor_veiculo,
      observacoes,
      status,
      origem_latitude,
      origem_longitude,
      origem_endereco,
      latitude_fim,
      longitude_fim,
      destino_latitude,
      destino_longitude,
      destino_endereco,
      quilometragem
    } = req.body;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    // Verificar se pode editar: se tem assinatura e passou 1 hora, apenas avisar
    if (sinistro.status === 'finalizado' && sinistro.assinatura_timestamp) {
      const agora = new Date();
      const timestampAssinatura = new Date(sinistro.assinatura_timestamp);
      const minutoDecorridos = Math.floor((agora.getTime() - timestampAssinatura.getTime()) / (1000 * 60));
      
      if (minutoDecorridos > 60) {
        return res.status(400).json({ 
          error: 'GRACE_PERIOD_EXPIRED',
          message: 'Este sinistro foi finalizado há mais de 1 hora. Entre em contato com o suporte para fazer alterações.' 
        });
      }
    }
    
    const sinistroData = sinistro as any;

    // Atualizar campos
    if (placa_veiculo) sinistroData.placa_veiculo = placa_veiculo.toUpperCase();
    if (tipo_atendimento) sinistroData.tipo_atendimento = tipo_atendimento;
    if (nome_cliente !== undefined) sinistroData.nome_cliente = nome_cliente;
    if (cpf_cliente !== undefined) sinistroData.cpf_cliente = cpf_cliente;
    if (telefone_cliente !== undefined) sinistroData.telefone_cliente = telefone_cliente;
    if (modelo_veiculo !== undefined) sinistroData.modelo_veiculo = modelo_veiculo;
    if (cor_veiculo !== undefined) sinistroData.cor_veiculo = cor_veiculo;
    if (observacoes !== undefined) sinistroData.observacoes = observacoes;
    if (status) sinistroData.status = status;
    const origemJaColetada = !!(sinistro.latitude_inicio || sinistro.longitude_inicio || sinistro.origem_endereco);
    const destinoJaColetado = !!(sinistro.latitude_fim || sinistro.longitude_fim || sinistro.destino_endereco);

    if (!origemJaColetada) {
      if (origem_latitude !== undefined) sinistroData.latitude_inicio = origem_latitude;
      if (origem_longitude !== undefined) sinistroData.longitude_inicio = origem_longitude;
      if (origem_endereco !== undefined) sinistroData.origem_endereco = origem_endereco;
    }

    if (!destinoJaColetado) {
      if (latitude_fim !== undefined || destino_latitude !== undefined) {
        sinistroData.latitude_fim = latitude_fim ?? destino_latitude;
      }
      if (longitude_fim !== undefined || destino_longitude !== undefined) {
        sinistroData.longitude_fim = longitude_fim ?? destino_longitude;
      }
      if (destino_endereco !== undefined) sinistroData.destino_endereco = destino_endereco;
    }
    if (quilometragem !== undefined) sinistroData.quilometragem = quilometragem;
    
    await sinistro.save();
    
    await createLog(req, {
      acao: 'atualizar',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.json(sinistro);
  } catch (error) {
    console.error('Erro ao atualizar sinistro:', error);
    return res.status(500).json({ error: 'Erro ao atualizar sinistro' });
  }
};

// Adicionar foto ao sinistro
export const adicionarFoto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imagem_base64, descricao, ordem } = req.body;
    
    console.log(`📸 [FOTO] Recebendo foto para sinistro ${id}:`, { descricao, ordem, hasBase64: !!imagem_base64 });
    
    if (!imagem_base64) {
      console.log('❌ [FOTO] Erro: imagem_base64 ausente');
      return res.status(400).json({ error: 'Imagem é obrigatória' });
    }
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!sinistro) {
      console.log(`❌ [FOTO] Sinistro ${id} não encontrado`);
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    if (sinistro.status === 'finalizado') {
      console.log(`❌ [FOTO] Sinistro ${id} está finalizado`);
      return res.status(400).json({ error: 'Não é possível adicionar fotos a sinistro finalizado' });
    }
    
    // Salvar base64 direto no banco (sem upload para Cloudinary)
    console.log(`💾 [FOTO] Salvando foto para sinistro ${id} no banco...`);
    const foto = await Foto.create({
      sinistro_id: sinistro.id,
      url: imagem_base64, // Armazenar base64 direto
      descricao,
      ordem: ordem || 0
    });
    
    console.log(`✅ [FOTO] Foto ${foto.id} salva com sucesso para sinistro ${id}`);
    
    await createLog(req, {
      acao: 'adicionar_foto',
      entidade: 'sinistro',
      entidade_id: sinistro.id,
      detalhes: { foto_id: foto.id }
    });
    
    return res.status(201).json(foto);
  } catch (error) {
    console.error('❌ Erro ao adicionar foto:', error);
    return res.status(500).json({ error: 'Erro ao adicionar foto', details: (error as any).message });
  }
};

// Remover foto do sinistro
export const removerFoto = async (req: Request, res: Response) => {
  try {
    const { id, fotoId } = req.params;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    if (sinistro.status === 'finalizado') {
      return res.status(400).json({ error: 'Não é possível remover fotos de sinistro finalizado' });
    }
    
    const foto = await Foto.findOne({
      where: {
        id: fotoId,
        sinistro_id: sinistro.id
      }
    });
    
    if (!foto) {
      return res.status(404).json({ error: 'Foto não encontrada' });
    }
    
    // Deletar do Cloudinary (se tiver ID)
    if (foto.cloudinary_id) {
      await deleteImage(foto.cloudinary_id);
    }
    
    // Deletar do banco
    await foto.destroy();
    
    await createLog(req, {
      acao: 'remover_foto',
      entidade: 'sinistro',
      entidade_id: sinistro.id,
      detalhes: { foto_id: foto.id }
    });
    
    return res.json({ message: 'Foto removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover foto:', error);
    return res.status(500).json({ error: 'Erro ao remover foto' });
  }
};

// Adicionar assinatura ao sinistro
export const adicionarAssinatura = async (req: Request, res: Response) => {
  let assinaturaCloudinaryId: string | undefined;

  try {
    const { id } = req.params;
    const { assinatura_base64, nome } = req.body;
    
    if (!assinatura_base64 || !nome) {
      return res.status(400).json({ error: 'Assinatura e nome são obrigatórios' });
    }
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      },
      include: [
        {
          model: Foto,
          as: 'fotos'
        }
      ]
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    if (sinistro.status === 'finalizado') {
      return res.status(400).json({ error: 'Sinistro já finalizado' });
    }

    const cpfCliente = (sinistro.cpf_cliente || '').replace(/\D/g, '');
    if (cpfCliente.length !== 11) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório para gerar o PDF protegido' });
    }
    
    // Upload para Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadBase64Image(assinatura_base64, `assinaturas/${sinistro.id}`);
      assinaturaCloudinaryId = uploadResult.public_id;
    } catch (uploadError) {
      console.error('Erro ao enviar assinatura para Cloudinary:', uploadError);
      return res.status(500).json({
        error: 'Erro ao enviar assinatura',
        etapa: 'upload_assinatura',
        details: (uploadError as any).message,
        code: (uploadError as any).code,
      });
    }
    
    // Atualizar sinistro
    sinistro.assinatura_url = uploadResult.secure_url;
    sinistro.assinatura_nome = nome;
    sinistro.assinatura_timestamp = new Date();
    
    // Gerar PDF automaticamente com senha do CPF do cliente e CNPJ da empresa.
    try {
      const empresa = await Empresa.findByPk(req.empresaId!);
      
      if (!empresa) {
        return res.status(500).json({ error: 'Empresa não encontrada para gerar o PDF protegido' });
      }

      const fotos = await (sinistro as any).getFotos?.();
      
      const pdfBuffer = await generatePDFClienteComSenha({
        sinistro,
        empresa,
        fotos: fotos || []
      });
      
      // Upload do PDF para Cloudinary
      const pdfUrl = await uploadPDF(pdfBuffer, sinistro.id);
      sinistro.pdf_url = pdfUrl;
      sinistro.status = 'finalizado';
      sinistro.finalizado_em = new Date();
    } catch (pdfError) {
      console.error('Erro ao gerar PDF protegido após assinatura:', pdfError);
      if (assinaturaCloudinaryId) {
        await deleteImage(assinaturaCloudinaryId);
      }
      return res.status(500).json({
        error: 'Não foi possível gerar o PDF protegido. O sinistro não foi finalizado.',
        etapa: 'gerar_pdf_protegido',
        details: (pdfError as any).message,
        code: (pdfError as any).code,
      });
    }
    
    await sinistro.save();
    
    await createLog(req, {
      acao: 'adicionar_assinatura',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.json({
      assinatura_url: uploadResult.secure_url,
      assinatura_nome: nome,
      pdf_url: sinistro.pdf_url || null,
      status: sinistro.status
    });
  } catch (error) {
    console.error('Erro ao adicionar assinatura:', error);
    return res.status(500).json({
      error: 'Erro ao adicionar assinatura',
      etapa: 'assinatura',
      details: (error as any).message,
      code: (error as any).code,
    });
  }
};

// Apagar assinatura (quando edita sinistro finalizado)
export const apagarAssinatura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    // Apagar assinatura e voltar para rascunho
    sinistro.assinatura_url = undefined;
    sinistro.assinatura_nome = undefined;
    sinistro.assinatura_timestamp = undefined;
    sinistro.pdf_url = undefined;
    sinistro.status = 'rascunho';
    sinistro.finalizado_em = undefined;
    
    await sinistro.save();
    
    await createLog(req, {
      acao: 'apagar_assinatura',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.json({ message: 'Assinatura apagada e status voltou para rascunho' });
  } catch (error) {
    console.error('Erro ao apagar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao apagar assinatura' });
  }
};

// Finalizar sinistro
export const finalizarSinistro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      },
      include: [
        {
          model: Foto,
          as: 'fotos'
        }
      ]
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    if (sinistro.status === 'finalizado' && sinistro.pdf_url) {
      return res.status(400).json({ error: 'Sinistro já está finalizado' });
    }
    
    // Validar se tem todos os dados necessários
    if (!sinistro.latitude_fim || !sinistro.longitude_fim) {
      return res.status(400).json({ error: 'Localização final é obrigatória' });
    }

    const cpfCliente = (sinistro.cpf_cliente || '').replace(/\D/g, '');
    if (cpfCliente.length !== 11) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório para gerar o PDF protegido' });
    }
    
    // Buscar fotos associadas (opcional)
    const fotos = await (sinistro as any).getFotos?.();
    
    // Atualizar status
    sinistro.status = 'finalizado';
    sinistro.finalizado_em = new Date();
    
    // Gerar PDF COM SENHA DA PLACA
    try {
      const empresa = await Empresa.findByPk(req.empresaId!);
      
      if (!empresa) {
        return res.status(500).json({ error: 'Empresa não encontrada' });
      }
      
      const pdfBuffer = await generatePDFClienteComSenha({
        sinistro,
        empresa,
        fotos: fotos
      });
      
      // Upload do PDF para Cloudinary
      const pdfUrl = await uploadPDF(pdfBuffer, sinistro.id);
      sinistro.pdf_url = pdfUrl;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      return res.status(500).json({
        error: 'Não foi possível gerar o PDF protegido. O sinistro não foi finalizado.',
      });
    }
    
    await sinistro.save();
    
    await createLog(req, {
      acao: 'finalizar',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.json({
      message: 'Sinistro finalizado com sucesso',
      sinistro
    });
  } catch (error) {
    console.error('Erro ao finalizar sinistro:', error);
    return res.status(500).json({ error: 'Erro ao finalizar sinistro' });
  }
};

// Recriar o arquivo protegido, inclusive para sinistros gerados antes da
// adoção da senha por CPF/CNPJ. A rota é autenticada e limitada à empresa.
export const regenerarPDFProtegido = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sinistro = await Sinistro.findOne({
      where: { id, empresa_id: req.empresaId, status: 'finalizado' },
      include: [{ model: Foto, as: 'fotos' }]
    });

    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro finalizado não encontrado' });
    }

    const empresa = await Empresa.findByPk(req.empresaId!);
    if (!empresa) {
      return res.status(500).json({ error: 'Empresa não encontrada' });
    }

    const pdfBuffer = await generatePDFClienteComSenha({
      sinistro,
      empresa,
      fotos: (sinistro as any).fotos || []
    });
    const pdfUrl = await uploadPDF(pdfBuffer, sinistro.id);

    sinistro.pdf_url = pdfUrl;
    await sinistro.save();

    await createLog(req, {
      acao: 'regenerar_pdf_protegido',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });

    return res.json({
      message: 'PDF protegido regenerado com sucesso',
      pdf_url: pdfUrl,
      protecao: {
        cliente: 'CPF (somente números)',
        empresa: 'CNPJ (somente números)'
      }
    });
  } catch (error) {
    console.error('Erro ao regenerar PDF protegido:', error);
    return res.status(500).json({
      error: 'Não foi possível regenerar o PDF protegido',
      details: (error as any).message
    });
  }
};

// Deletar sinistro (soft delete)
export const deletarSinistro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId
      }
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }
    
    if (sinistro.status === 'finalizado') {
      return res.status(400).json({ error: 'Não é possível deletar sinistro finalizado' });
    }
    
    sinistro.status = 'cancelado';
    await sinistro.save();
    
    await createLog(req, {
      acao: 'deletar',
      entidade: 'sinistro',
      entidade_id: sinistro.id
    });
    
    return res.json({ message: 'Sinistro cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar sinistro:', error);
    return res.status(500).json({ error: 'Erro ao deletar sinistro' });
  }
};

// Enviar PDF do sinistro para o cliente por email
export const enviarPDFParaCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email_cliente } = req.body;
    
    if (!email_cliente) {
      return res.status(400).json({ error: 'Email do cliente é obrigatório' });
    }
    
    const sinistro = await Sinistro.findOne({
      where: {
        id,
        empresa_id: req.empresaId,
        status: 'finalizado' // Só pode enviar se estiver finalizado
      },
      include: [
        {
          model: Foto,
          as: 'fotos'
        }
      ]
    });
    
    if (!sinistro) {
      return res.status(404).json({ error: 'Sinistro não encontrado ou ainda não foi finalizado' });
    }
    
    if (!sinistro.pdf_url) {
      return res.status(400).json({ error: 'PDF do sinistro não foi gerado' });
    }
    
    try {
      const empresa = await Empresa.findByPk(req.empresaId!);
      
      if (!empresa) {
        return res.status(500).json({ error: 'Empresa não encontrada' });
      }
      
      // Buscar fotos
      const fotos = await (sinistro as any).getFotos?.();
      
      // Gerar PDF protegido com CPF do cliente; CNPJ da empresa abre como proprietário.
      const pdfBuffer = await generatePDFClienteComSenha({
        sinistro,
        empresa,
        fotos: fotos || []
      });
      
      // Enviar email com PDF em anexo
      const nomeCliente = sinistro.nome_cliente || 'Cliente';
      const html = emailPDFSinistroCliente(
        nomeCliente,
        empresa.nome,
        sinistro.cpf_cliente || ''
      );
      
      const emailEnviado = await sendEmailComAnexo({
        to: email_cliente,
        subject: `Check Guincho - Relatório de Sinistro ${sinistro.placa_veiculo}`,
        html,
        attachments: [
          {
            filename: `sinistro_${sinistro.id}_${sinistro.placa_veiculo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      
      if (!emailEnviado) {
        return res.status(500).json({ error: 'Erro ao enviar email' });
      }
      
      await createLog(req, {
        acao: 'enviar_pdf',
        entidade: 'sinistro',
        entidade_id: sinistro.id,
        detalhes: `Email enviado para ${email_cliente}`
      });
      
      return res.json({
        message: 'PDF enviado com sucesso para o email do cliente',
        email: email_cliente,
        senha: (sinistro.cpf_cliente || '').replace(/\D/g, '')
      });
    } catch (error) {
      console.error('Erro ao gerar/enviar PDF:', error);
      return res.status(500).json({ error: 'Erro ao processar PDF' });
    }
  } catch (error) {
    console.error('Erro ao enviar PDF para cliente:', error);
    return res.status(500).json({ error: 'Erro ao enviar PDF para cliente' });
  }
};

// Gerar link WhatsApp para enviar PDF ao cliente
export const gerarLinkWhatsApp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { telefone_cliente } = req.body;

    if (!id || !telefone_cliente) {
      return res.status(400).json({ error: 'ID do sinistro e telefone são obrigatórios' });
    }

    const sinistro = await Sinistro.findByPk(id);
    if (!sinistro || sinistro.empresa_id !== req.empresaId) {
      return res.status(404).json({ error: 'Sinistro não encontrado' });
    }

    // Limpar o telefone (remover caracteres especiais)
    const telefoneLimpo = telefone_cliente.replace(/\D/g, '');
    
    const senhaCpf = (sinistro.cpf_cliente || '').replace(/\D/g, '');
    if (senhaCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF do cliente é obrigatório para informar a senha do PDF' });
    }
    
    // Mensagem WhatsApp com instruções de proteção
    const mensagem = `Olá ${sinistro.nome_cliente}! 👋

Seu sinistro #${sinistro.numero_sinistro} foi processado com sucesso.

🚗 Placa do veículo: ${sinistro.placa_veiculo}
📄 Seu PDF foi enviado para seu email e está protegido.

🔐 PARA ABRIR O PDF, DIGITE A SENHA:
${senhaCpf}

(CPF do cliente, somente números)

Check Guincho ✅`;
    
    // Codificar mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Link WhatsApp (formato internacional)
    const linkWhatsApp = `https://wa.me/${telefoneLimpo}?text=${mensagemCodificada}`;
    
    console.log(`✅ [WHATSAPP] Link gerado para sinistro ${id} com proteção de PDF por CPF`);
    
    return res.json({
      success: true,
      link: linkWhatsApp,
      mensagem: mensagem,
      telefone: telefoneLimpo,
      senha_pdf: senhaCpf
    });
  } catch (error) {
    console.error('Erro ao gerar link WhatsApp:', error);
    return res.status(500).json({ error: 'Erro ao gerar link WhatsApp' });
  }
};
