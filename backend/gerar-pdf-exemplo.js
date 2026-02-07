require('dotenv').config();
const { Sequelize } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false
});

async function gerarPDFExemplo() {
  try {
    console.log('🔄 Conectando ao banco...');
    await sequelize.authenticate();
    console.log('✅ Conectado!\n');

    // Buscar um sinistro real
    const [sinistros] = await sequelize.query(`
      SELECT s.*, e.nome as empresa_nome, e.cnpj, e.codigo
      FROM sinistros s
      JOIN empresas e ON s.empresa_id = e.id
      ORDER BY s.id DESC
      LIMIT 1
    `);

    if (!sinistros || sinistros.length === 0) {
      console.log('❌ Nenhum sinistro encontrado');
      process.exit(1);
    }

    const sinistro = sinistros[0];
    console.log('📋 Gerando PDF para sinistro:', sinistro.numero_sinistro || sinistro.id);

    // Criar o PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const outputPath = path.join(__dirname, 'exemplo-pdf-sinistro.pdf');
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);

    // ========== CABEÇALHO ==========
    doc.fontSize(20)
       .fillColor('#0066CC')
       .text('CHECK GUINCHO', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(18)
       .fillColor('#2C3E50')
       .text('RELATÓRIO DE SINISTRO', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .fillColor('#7F8C8D')
       .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, {
         align: 'center'
       });
    
    doc.moveDown(2);

    // Linha separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#E0E0E0')
       .stroke();
    
    doc.moveDown(1);

    // ========== NÚMERO DO SINISTRO ==========
    doc.fontSize(12)
       .fillColor('#666666')
       .text('NÚMERO DO SINISTRO', 50, doc.y);
    
    doc.fontSize(16)
       .fillColor('#0066CC')
       .font('Helvetica-Bold')
       .text(sinistro.numero_sinistro || `SIN${sinistro.id}`, 50, doc.y + 5);
    
    doc.moveDown(2);
    doc.font('Helvetica');

    // ========== DADOS DA EMPRESA ==========
    doc.fontSize(14)
       .fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text('DADOS DA EMPRESA', 50, doc.y);
    
    doc.moveDown(0.5);
    
    const empresaY = doc.y;
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Razão Social:', 50, empresaY)
       .text('CNPJ:', 50, empresaY + 15)
       .text('Código:', 50, empresaY + 30);
    
    doc.fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text(sinistro.empresa_nome, 150, empresaY)
       .text(sinistro.cnpj || 'Não informado', 150, empresaY + 15)
       .text(sinistro.codigo, 150, empresaY + 30);
    
    doc.moveDown(4);
    doc.font('Helvetica');

    // Linha separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#E0E0E0')
       .stroke();
    
    doc.moveDown(1);

    // ========== DADOS DO VEÍCULO ==========
    doc.fontSize(14)
       .fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text('DADOS DO VEÍCULO', 50, doc.y);
    
    doc.moveDown(0.5);
    
    const veiculoY = doc.y;
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Placa:', 50, veiculoY)
       .text('Modelo:', 50, veiculoY + 15)
       .text('Cor:', 50, veiculoY + 30);
    
    doc.fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text(sinistro.placa_veiculo, 150, veiculoY)
       .text(sinistro.modelo_veiculo || 'Não informado', 150, veiculoY + 15)
       .text(sinistro.cor_veiculo || 'Não informada', 150, veiculoY + 30);
    
    doc.moveDown(4);
    doc.font('Helvetica');

    // Linha separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#E0E0E0')
       .stroke();
    
    doc.moveDown(1);

    // ========== DADOS DO CLIENTE ==========
    doc.fontSize(14)
       .fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text('DADOS DO CLIENTE', 50, doc.y);
    
    doc.moveDown(0.5);
    
    const clienteY = doc.y;
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Nome:', 50, clienteY)
       .text('CPF:', 50, clienteY + 15)
       .text('Telefone:', 50, clienteY + 30);
    
    doc.fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text(sinistro.nome_cliente || 'Não informado', 150, clienteY)
       .text(sinistro.cpf_cliente || 'Não informado', 150, clienteY + 15)
       .text(sinistro.telefone_cliente || 'Não informado', 150, clienteY + 30);
    
    doc.moveDown(4);
    doc.font('Helvetica');

    // Linha separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#E0E0E0')
       .stroke();
    
    doc.moveDown(1);

    // ========== DETALHES DO ATENDIMENTO ==========
    doc.fontSize(14)
       .fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text('DETALHES DO ATENDIMENTO', 50, doc.y);
    
    doc.moveDown(0.5);
    
    const atendimentoY = doc.y;
    doc.fontSize(10)
       .fillColor('#666666')
       .font('Helvetica')
       .text('Tipo:', 50, atendimentoY)
       .text('Status:', 50, atendimentoY + 15)
       .text('Data/Hora:', 50, atendimentoY + 30);
    
    const dataHora = new Date(sinistro.createdAt);
    doc.fillColor('#2C3E50')
       .font('Helvetica-Bold')
       .text(sinistro.tipo_atendimento || 'Guincho', 150, atendimentoY)
       .text(sinistro.status || 'Rascunho', 150, atendimentoY + 15)
       .text(`${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR')}`, 150, atendimentoY + 30);
    
    doc.moveDown(4);
    doc.font('Helvetica');

    // ========== OBSERVAÇÕES ==========
    if (sinistro.observacoes) {
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#E0E0E0')
         .stroke();
      
      doc.moveDown(1);

      doc.fontSize(14)
         .fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text('OBSERVAÇÕES', 50, doc.y);
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor('#2C3E50')
         .font('Helvetica')
         .text(sinistro.observacoes, 50, doc.y, {
           width: 495,
           align: 'justify'
         });
      
      doc.moveDown(2);
    }

    // ========== LOCALIZAÇÃO ==========
    if (sinistro.latitude_inicio || sinistro.longitude_inicio) {
      doc.addPage();
      
      doc.fontSize(14)
         .fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text('LOCALIZAÇÃO', 50, 50);
      
      doc.moveDown(0.5);
      
      const locY = doc.y;
      doc.fontSize(10)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Origem:', 50, locY)
         .text('Latitude:', 70, locY + 15)
         .text('Longitude:', 70, locY + 30);
      
      doc.fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text(sinistro.latitude_inicio || 'N/A', 150, locY + 15)
         .text(sinistro.longitude_inicio || 'N/A', 150, locY + 30);
      
      if (sinistro.latitude_fim || sinistro.longitude_fim) {
        doc.font('Helvetica')
           .fillColor('#666666')
           .text('Destino:', 50, locY + 60)
           .text('Latitude:', 70, locY + 75)
           .text('Longitude:', 70, locY + 90);
        
        doc.fillColor('#2C3E50')
           .font('Helvetica-Bold')
           .text(sinistro.latitude_fim || 'N/A', 150, locY + 75)
           .text(sinistro.longitude_fim || 'N/A', 150, locY + 90);
      }
    }

    // ========== RODAPÉ ==========
    doc.fontSize(8)
       .fillColor('#999999')
       .text(
         `Documento gerado automaticamente pelo sistema Check Guincho em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
         50,
         doc.page.height - 50,
         { align: 'center', width: 495 }
       );

    doc.end();

    stream.on('finish', () => {
      console.log('\n✅ PDF gerado com sucesso!');
      console.log(`📄 Arquivo: ${outputPath}`);
      console.log('\n📋 Conteúdo do PDF:');
      console.log('  • Cabeçalho com logo Check Guincho');
      console.log('  • Número do sinistro');
      console.log('  • Dados da empresa (Nome, CNPJ, Código)');
      console.log('  • Dados do veículo (Placa, Modelo, Cor)');
      console.log('  • Dados do cliente (Nome, CPF, Telefone)');
      console.log('  • Detalhes do atendimento (Tipo, Status, Data/Hora)');
      console.log('  • Observações');
      console.log('  • Localização GPS (Origem e Destino)');
      console.log('  • Rodapé com data/hora de geração');
      console.log('\n💡 Abra o arquivo para visualizar!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

gerarPDFExemplo();
