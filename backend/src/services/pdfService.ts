import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import Sinistro from '../models/Sinistro';
import Empresa from '../models/Empresa';
import Foto from '../models/Foto';
import https from 'https';
import http from 'http';

interface PDFData {
  sinistro: Sinistro;
  empresa: Empresa;
  fotos: Foto[];
}

// Baixar imagem da URL
const downloadImage = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      const chunks: Buffer[] = [];
      
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
};

export const generatePDF = async (
  data: PDFData,
  senhaProtecao?: string,
  senhaProprietario?: string
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🔐 [PDF] Gerando PDF com senha:', senhaProtecao || 'SEM SENHA');
      
      // Se houver senha, adicionar criptografia
      const docOptions: any = { size: 'A4', margin: 50 };
      if (senhaProtecao) {
        docOptions.userPassword = senhaProtecao;
        docOptions.ownerPassword = senhaProprietario || senhaProtecao;
        console.log('🔐 [PDF] Senha configurada no documento');
      }
      
      const doc = new PDFDocument(docOptions);
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const { sinistro, empresa, fotos } = data;
      
      // ========== CABEÇALHO ==========
      doc.fontSize(20)
         .fillColor('#2C3E50')
         .text('RELATÓRIO DE SINISTRO', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#7F8C8D')
         .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, {
           align: 'center'
         });
      
      doc.moveDown(2);
      
      // ========== DADOS DA EMPRESA ==========
      doc.fontSize(14)
         .fillColor('#34495E')
         .text('Dados da Empresa', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#2C3E50')
         .text(`Empresa: ${empresa.nome}`)
         .text(`CNPJ: ${empresa.cnpj}`)
         .text(`Código: ${empresa.codigo}`);
      
      doc.moveDown(2);
      
      // ========== DADOS DO SINISTRO ==========
      doc.fontSize(14)
         .fillColor('#34495E')
         .text('Dados do Atendimento', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#2C3E50')
         .text(`Placa do Veículo: ${sinistro.placa_veiculo}`)
         .text(`Tipo de Atendimento: ${sinistro.tipo_atendimento}`)
         .text(`Cliente: ${sinistro.nome_cliente || 'Não informado'}`)
         .text(`Data: ${sinistro.createdAt?.toLocaleDateString('pt-BR')} às ${sinistro.createdAt?.toLocaleTimeString('pt-BR')}`);
      
      if (sinistro.observacoes) {
        doc.moveDown(0.5);
        doc.text(`Observações: ${sinistro.observacoes}`);
      }
      
      doc.moveDown(2);
      
      // ========== LOCALIZAÇÃO E QUILOMETRAGEM ==========
      doc.fontSize(14)
         .fillColor('#34495E')
         .text('Localização e Percurso', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#2C3E50');
      
      if (sinistro.latitude_inicio && sinistro.longitude_inicio) {
        doc.text(`Local de Origem: ${sinistro.latitude_inicio}, ${sinistro.longitude_inicio}`);
      }
      
      if (sinistro.latitude_fim && sinistro.longitude_fim) {
        doc.text(`Local de Destino: ${sinistro.latitude_fim}, ${sinistro.longitude_fim}`);
      }
      
      if (sinistro.quilometragem) {
        doc.fontSize(12)
           .fillColor('#27AE60')
           .font('Helvetica-Bold')
           .text(`Quilometragem Percorrida: ${sinistro.quilometragem} km`);
        doc.font('Helvetica');
      }
      
      doc.moveDown(2);
      
      // ========== FOTOS ==========
      if (fotos && fotos.length > 0) {
        doc.addPage();
        
        doc.fontSize(14)
           .fillColor('#34495E')
           .text('Fotos do Sinistro', { underline: true });
        
        doc.moveDown();
        
        let currentY = doc.y;
        const imageWidth = 130;
        const imageHeight = 100;
        const imagesPerRow = 2;
        const spacingX = 30;
        const spacingY = 15;
        
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          
          try {
            // Baixar imagem
            const imageBuffer = await downloadImage(foto.url);
            
            // Calcular posição
            const col = i % imagesPerRow;
            const row = Math.floor(i / imagesPerRow);
            
            const x = 50 + (col * (imageWidth + spacingX));
            const y = currentY + (row * (imageHeight + spacingY + 30));
            
            // Verificar se precisa de nova página
            if (y + imageHeight > doc.page.height - 50) {
              doc.addPage();
              currentY = 50;
              
              const newRow = 0;
              const newY = currentY + (newRow * (imageHeight + spacingY + 30));
              
              doc.image(imageBuffer, x, newY, { width: imageWidth, height: imageHeight });
              
              if (foto.descricao) {
                doc.fontSize(8)
                   .fillColor('#7F8C8D')
                   .text(foto.descricao, x, newY + imageHeight + 5, { width: imageWidth, align: 'center' });
              }
            } else {
              doc.image(imageBuffer, x, y, { width: imageWidth, height: imageHeight });
              
              if (foto.descricao) {
                doc.fontSize(8)
                   .fillColor('#7F8C8D')
                   .text(foto.descricao, x, y + imageHeight + 5, { width: imageWidth, align: 'center' });
              }
            }
          } catch (error) {
            console.error(`Erro ao carregar foto ${foto.id}:`, error);
            // Continuar mesmo se uma foto falhar
          }
        }
      }
      
      // ========== ASSINATURA ==========
      if (sinistro.assinatura_url) {
        doc.addPage();
        
        doc.fontSize(14)
           .fillColor('#34495E')
           .text('Assinatura', { underline: true });
        
        doc.moveDown();
        
        try {
          const assinaturaBuffer = await downloadImage(sinistro.assinatura_url);
          doc.image(assinaturaBuffer, 50, doc.y, { width: 150, height: 80 });
          
          doc.moveDown(10);
          doc.fontSize(10)
             .fillColor('#2C3E50')
             .text(`Assinado por: ${sinistro.assinatura_nome}`, { align: 'center' });
          
          doc.moveDown(0.5);
          doc.fontSize(8)
             .fillColor('#7F8C8D')
             .text(`Data: ${sinistro.finalizado_em?.toLocaleDateString('pt-BR')} às ${sinistro.finalizado_em?.toLocaleTimeString('pt-BR')}`, {
               align: 'center'
             });
        } catch (error) {
          console.error('Erro ao carregar assinatura:', error);
          doc.text('Erro ao carregar assinatura', { align: 'center' });
        }
      }
      
      // ========== RODAPÉ ==========
      const pageRange = (doc as any).bufferedPageRange();
      const totalPages = pageRange.count;
      const startPage = pageRange.start;
      
      if (totalPages > 0) {
        for (let i = 0; i < totalPages; i++) {
          try {
            const pageIndex = startPage + i;
            doc.switchToPage(pageIndex);
            
            doc.fontSize(8)
               .fillColor('#95A5A6')
               .text(
                 `Página ${i + 1} de ${totalPages} | Check Guincho © ${new Date().getFullYear()}`,
                 50,
                 doc.page.height - 50,
                 { align: 'center' }
               );
          } catch (pageError) {
            console.error(`Erro ao adicionar rodapé na página ${i}:`, pageError);
          }
        }
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Upload do PDF para Cloudinary
import cloudinary from '../config/cloudinary';

export const uploadPDF = async (pdfBuffer: Buffer, sinistroId: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'check-guincho/pdfs',
        resource_type: 'auto',
        public_id: `sinistro_${sinistroId}_${Date.now()}`,
        format: 'pdf'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );
    
    const readableStream = new Readable();
    readableStream.push(pdfBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

const somenteNumeros = (value?: string): string => (value || '').replace(/\D/g, '');

const getSenhaCliente = (sinistro: Sinistro): string => {
  const cpf = somenteNumeros(sinistro.cpf_cliente);
  if (cpf.length !== 11) {
    throw new Error('CPF do cliente é obrigatório para proteger o PDF');
  }
  return cpf;
};

const getSenhaEmpresa = (empresa: Empresa): string => {
  const cnpj = somenteNumeros(empresa.cnpj);
  if (cnpj.length !== 14) {
    throw new Error('CNPJ da empresa é obrigatório para proteger o PDF');
  }
  return cnpj;
};

// Gerar PDF com senha para cliente (senha = CPF do cliente; CNPJ abre como proprietário)
export const generatePDFClienteComSenha = async (data: PDFData): Promise<Buffer> => {
  try {
    const cpfSenha = getSenhaCliente(data.sinistro);
    const cnpjSenha = getSenhaEmpresa(data.empresa);
    const pdfBuffer = await generatePDF(data, cpfSenha, cnpjSenha);
    
    return pdfBuffer;
  } catch (error) {
    console.error('Erro ao gerar PDF do cliente com senha:', error);
    throw error;
  }
};

// Gerar PDF com senha para prestador (senha = CNPJ da empresa)
export const generatePDFPrestadorComSenha = async (data: PDFData): Promise<Buffer> => {
  try {
    const cnpjSenha = getSenhaEmpresa(data.empresa);
    const pdfBuffer = await generatePDF(data, cnpjSenha, cnpjSenha);
    
    return pdfBuffer;
  } catch (error) {
    console.error('Erro ao gerar PDF do prestador com senha:', error);
    throw error;
  }
};
