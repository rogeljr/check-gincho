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

const formatDateTime = (value?: Date | string): string => {
  const date = value ? new Date(value) : new Date();
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatCpf = (value?: string): string => {
  const numbers = (value || '').replace(/\D/g, '');
  if (numbers.length !== 11) return value || '-';
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

const formatPhone = (value?: string): string => {
  const numbers = (value || '').replace(/\D/g, '');
  if (numbers.length === 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  if (numbers.length === 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return value || '-';
};

const valueOrDash = (value?: string | number | null): string => {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
};

const drawSectionTitle = (doc: PDFKit.PDFDocument, title: string, x: number, y: number, width: number) => {
  doc.rect(x, y, width, 18).fillAndStroke('#F1F3F5', '#222');
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(9).text(title, x, y + 5, { width, align: 'center' });
};

const drawCells = (
  doc: PDFKit.PDFDocument,
  cells: Array<{ label: string; value?: string | number | null; span?: number }>,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const unit = width / 4;
  let currentX = x;

  cells.forEach((cell) => {
    const span = cell.span || 1;
    const cellWidth = unit * span;
    doc.rect(currentX, y, cellWidth, height).stroke('#222');
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(8).text(cell.label, currentX + 4, y + 4, {
      width: cellWidth - 8,
      continued: true
    });
    doc.font('Helvetica').text(` ${valueOrDash(cell.value)}`, {
      width: cellWidth - 8,
      continued: false
    });
    currentX += cellWidth;
  });
};

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
      const docOptions: any = { size: 'A4', margin: 50, pdfVersion: '1.7' };
      if (senhaProtecao) {
        docOptions.userPassword = senhaProtecao;
        docOptions.ownerPassword = senhaProprietario || senhaProtecao;
        docOptions.permissions = {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false
        };
        console.log('🔐 [PDF] Senha configurada no documento');
      }
      
      const doc = new PDFDocument(docOptions);
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        if (senhaProtecao && !pdfBuffer.includes(Buffer.from('/Encrypt'))) {
          return reject(new Error('Falha ao criptografar o PDF: dicionário /Encrypt ausente'));
        }
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      const { sinistro, empresa, fotos } = data;
      
      const left = 40;
      const pageWidth = doc.page.width - 80;
      let y = 38;

      if (empresa.logo_url) {
        try {
          const logoBuffer = await downloadImage(empresa.logo_url);
          doc.rect(left, y, 90, 54).stroke('#222');
          doc.image(logoBuffer, left + 4, y + 4, { fit: [82, 46], align: 'center', valign: 'center' });
        } catch (error) {
          doc.rect(left, y, 90, 54).stroke('#222');
        }
      } else {
        doc.rect(left, y, 90, 54).stroke('#222');
        doc.fontSize(9).fillColor('#777').text('LOGO', left, y + 22, { width: 90, align: 'center' });
      }

      doc.fillColor('#111').font('Helvetica-Bold').fontSize(18)
        .text(empresa.nome, left + 100, y + 10, { width: pageWidth - 245, align: 'center' });
      doc.fontSize(12).text('Checklist de Atendimento', left + 100, y + 34, { width: pageWidth - 245, align: 'center' });
      doc.font('Helvetica').fontSize(8)
        .text(`Cód: ${sinistro.numero_sinistro || sinistro.id}`, left + pageWidth - 140, y + 12, { width: 140, align: 'right' })
        .text(`Data: ${formatDateTime(sinistro.createdAt)}`, left + pageWidth - 140, y + 28, { width: 140, align: 'right' });

      y += 68;
      drawSectionTitle(doc, 'Dados da Empresa', left, y, pageWidth);
      y += 18;
      drawCells(doc, [
        { label: 'Empresa:', value: empresa.nome, span: 2 },
        { label: 'Responsável:', value: empresa.prestador_nome },
        { label: 'Telefone:', value: formatPhone(empresa.prestador_telefone) },
      ], left, y, pageWidth, 24);
      y += 24;

      drawSectionTitle(doc, 'Dados do Cliente', left, y, pageWidth);
      y += 18;
      drawCells(doc, [
        { label: 'Cliente:', value: sinistro.nome_cliente, span: 2 },
        { label: 'CPF:', value: formatCpf(sinistro.cpf_cliente) },
        { label: 'Telefone:', value: formatPhone(sinistro.telefone_cliente) },
      ], left, y, pageWidth, 24);
      y += 24;

      drawSectionTitle(doc, 'Informações do Veículo', left, y, pageWidth);
      y += 18;
      drawCells(doc, [
        { label: 'Placa:', value: sinistro.placa_veiculo },
        { label: 'Modelo:', value: sinistro.modelo_veiculo },
        { label: 'Cor:', value: sinistro.cor_veiculo },
        { label: 'Tipo:', value: sinistro.tipo_atendimento },
      ], left, y, pageWidth, 24);
      y += 24;

      drawSectionTitle(doc, 'Dados da Coleta', left, y, pageWidth);
      y += 18;
      drawCells(doc, [{ label: 'Origem:', value: sinistro.origem_endereco, span: 4 }], left, y, pageWidth, 28);
      y += 28;
      drawCells(doc, [
        { label: 'Latitude:', value: valueOrDash(sinistro.latitude_inicio) },
        { label: 'Longitude:', value: valueOrDash(sinistro.longitude_inicio) },
        { label: 'Data:', value: formatDateTime(sinistro.createdAt), span: 2 },
      ], left, y, pageWidth, 24);
      y += 24;

      drawSectionTitle(doc, 'Dados da Entrega', left, y, pageWidth);
      y += 18;
      drawCells(doc, [{ label: 'Destino:', value: sinistro.destino_endereco, span: 4 }], left, y, pageWidth, 28);
      y += 28;
      drawCells(doc, [
        { label: 'Latitude:', value: valueOrDash(sinistro.latitude_fim) },
        { label: 'Longitude:', value: valueOrDash(sinistro.longitude_fim) },
        { label: 'KM rodado:', value: sinistro.quilometragem ? `${sinistro.quilometragem} km` : '-', span: 2 },
      ], left, y, pageWidth, 24);
      y += 24;

      drawSectionTitle(doc, 'Observações', left, y, pageWidth);
      y += 18;
      drawCells(doc, [{ label: 'OBS:', value: sinistro.observacoes, span: 4 }], left, y, pageWidth, 36);
      y += 54;

      doc.font('Helvetica').fontSize(9).fillColor('#111')
        .text(`Eu, ${sinistro.nome_cliente || 'cliente'}, concordo com as informações registradas neste checklist.`, left, y, {
          width: pageWidth,
          align: 'center'
        });
      y += 28;

      const assinaturaX = left + 130;
      const assinaturaW = pageWidth - 260;
      if (sinistro.assinatura_url) {
        try {
          const assinaturaBuffer = await downloadImage(sinistro.assinatura_url);
          doc.image(assinaturaBuffer, assinaturaX + 30, y, { fit: [assinaturaW - 60, 55], align: 'center', valign: 'center' });
        } catch (error) {
          console.error('Erro ao carregar assinatura:', error);
        }
      }
      y += 62;
      doc.moveTo(assinaturaX, y).lineTo(assinaturaX + assinaturaW, y).stroke('#111');
      doc.font('Helvetica-Bold').fontSize(9).text('Assinatura do Cliente', assinaturaX, y + 4, { width: assinaturaW, align: 'center' });
      y += 32;

      doc.font('Helvetica-Bold').fontSize(12).text('Galeria de Fotos', left, y, { width: pageWidth, align: 'center' });
      y += 20;

      if (fotos && fotos.length > 0) {
        const imageWidth = (pageWidth - 28) / 3;
        const imageHeight = 145;
        const captionHeight = 14;

        for (let i = 0; i < fotos.length; i++) {
          if (y + imageHeight + captionHeight > doc.page.height - 60) {
            doc.addPage();
            y = 50;
          }

          const col = i % 3;
          const x = left + col * (imageWidth + 14);

          try {
            const imageBuffer = await downloadImage(fotos[i].url);
            doc.rect(x, y, imageWidth, imageHeight).stroke('#C8C8C8');
            doc.image(imageBuffer, x + 3, y + 3, {
              fit: [imageWidth - 6, imageHeight - 6],
              align: 'center',
              valign: 'center'
            });
          } catch (error) {
            console.error(`Erro ao carregar foto ${fotos[i].id}:`, error);
            doc.rect(x, y, imageWidth, imageHeight).stroke('#C8C8C8');
          }

          doc.font('Helvetica').fontSize(8).fillColor('#111').text(`Foto ${i + 1}`, x, y + imageHeight + 4, {
            width: imageWidth,
            align: 'center'
          });

          if (col === 2 || i === fotos.length - 1) {
            y += imageHeight + captionHeight + 14;
          }
        }
      } else {
        doc.rect(left, y, pageWidth, 28).stroke('#222');
        doc.font('Helvetica').fontSize(9).text('Nenhuma foto registrada', left, y + 9, { width: pageWidth, align: 'center' });
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
