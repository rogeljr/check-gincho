import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
    
    console.log(`✅ Email enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return false;
  }
};

// Template de email de boas-vindas
export const emailBoasVindas = (nomeEmpresa: string, codigoEmpresa: string, deepLink: string, fallbackUrl: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .codigo-box { background: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; font-size: 18px; font-weight: bold; color: #2C3E50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo ao Check Guincho!</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeEmpresa}</strong>!</p>
          <p>Sua conta foi criada com sucesso. Para começar a usar o aplicativo, você precisa definir sua senha.</p>
          
          <div class="codigo-box">
            <strong>Seu código da empresa:</strong><br>
            ${codigoEmpresa}
          </div>
          
          <p><strong>Você tem 7 dias grátis para testar!</strong></p>
          <p>Clique no botão abaixo para definir sua senha:</p>
          <a href="${fallbackUrl}" class="button">Definir Senha no App</a>
          <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
          <p style="word-break: break-all; background: #fff; padding: 10px; border-left: 4px solid #4CAF50;">
            <code>${deepLink}</code>
          </p>
          <p>Após definir sua senha, você poderá fazer login no aplicativo e começar a registrar seus sinistros.</p>
          <p><strong>Recursos do Check Guincho:</strong></p>
          <ul>
            <li>Registro de sinistros com fotos</li>
            <li>Captura de localização e cálculo de quilometragem</li>
            <li>Assinatura digital</li>
            <li>Geração automática de PDF</li>
            <li>Funciona offline</li>
          </ul>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda.</p>
          <p>&copy; 2026 Check Guincho - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template de confirmação de senha definida
export const emailSenhaDefinida = (nomeEmpresa: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Senha Definida!</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeEmpresa}</strong>!</p>
          <p>Sua senha foi definida com sucesso. Agora você pode fazer login no aplicativo Check Guincho.</p>
          <p><strong>Seu período de teste gratuito de 7 dias começa agora!</strong></p>
          <p>Baixe o aplicativo e comece a usar:</p>
          <ul>
            <li>Abra o app Check Guincho</li>
            <li>Insira o código da sua empresa</li>
            <li>Digite a senha que você acabou de criar</li>
          </ul>
          <p>Aproveite!</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda.</p>
          <p>&copy; 2026 Check Guincho - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template de validação de conta
export const emailValidacaoConta = (nomeEmpresa: string, codigoEmpresa: string, linkValidacao: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .codigo-box { background: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; font-size: 18px; font-weight: bold; color: #2C3E50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bem-vindo ao Check Guincho!</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeEmpresa}</strong>!</p>
          <p>Sua conta foi criada com sucesso! Para começar a usar o aplicativo, você precisa validar sua conta clicando no link abaixo.</p>
          
          <div class="codigo-box">
            <strong>Seu código da empresa:</strong><br>
            ${codigoEmpresa}
          </div>
          
          <p><strong>Você tem 7 dias grátis para testar!</strong></p>
          <p>Clique no botão abaixo para validar sua conta:</p>
          <a href="${linkValidacao}" class="button">Validar Conta</a>
          <p>Após validar sua conta, você poderá fazer login no aplicativo com o código acima e a senha que você definiu no cadastro.</p>
          <p><strong>Recursos do Check Guincho:</strong></p>
          <ul>
            <li>Registro de sinistros com fotos</li>
            <li>Captura de localização e cálculo de quilometragem</li>
            <li>Assinatura digital</li>
            <li>Geração automática de PDF</li>
            <li>Funciona offline</li>
          </ul>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda.</p>
          <p>&copy; 2026 Check Guincho - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template de conta validada
export const emailContaValidada = (nomeEmpresa: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Conta Validada! ✓</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeEmpresa}</strong>!</p>
          <p>Sua conta foi validada com sucesso! Agora você pode fazer login no aplicativo Check Guincho.</p>
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Abra o app Check Guincho</li>
            <li>Insira o código da sua empresa</li>
            <li>Digite a senha que você criou no cadastro</li>
            <li>Comece a registrar seus sinistros!</li>
          </ul>
          <p><strong>Período de teste:</strong> Você tem 7 dias grátis para testar todas as funcionalidades.</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda.</p>
          <p>&copy; 2026 Check Guincho - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template para enviar PDF do sinistro para o cliente
export const emailPDFSinistroCliente = (nomeCliente: string, nomeEmpresa: string, placaVeiculo: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .password-section { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; }
        strong { color: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Relatório de Sinistro Finalizado</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${nomeCliente}</strong>,</p>
          
          <p>O sinistro referente ao veículo <strong>${placaVeiculo}</strong> foi finalizado com sucesso pela <strong>${nomeEmpresa}</strong>.</p>
          
          <p>Em anexo está o relatório completo com todas as informações do atendimento, incluindo fotos e assinatura.</p>
          
          <div class="password-section">
            <h3>🔐 Como abrir o documento PDF:</h3>
            <p>O arquivo PDF está protegido por senha de segurança.</p>
            <p><strong>Use a placa do veículo como senha:</strong></p>
            <p style="font-size: 18px; font-weight: bold; text-align: center; color: #d32f2f; background: white; padding: 10px; border-radius: 5px;">
              ${placaVeiculo}
            </p>
            <p><em>Dica: Digite a placa sem espaços ou caracteres especiais, como ela aparece acima.</em></p>
          </div>
          
          <div class="highlight">
            <strong>⚠️ Importante:</strong> Este é um documento confidencial. Utilize-o apenas para fins de conhecimento sobre o atendimento realizado.
          </div>
          
          <p>Se você tiver dúvidas ou problemas ao abrir o arquivo, entre em contato com a ${nomeEmpresa}.</p>
          
          <br>
          <p>Atenciosamente,<br><strong>Check Guincho - Sistema de Gestão de Sinistros</strong></p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Não responda.</p>
          <p>&copy; 2026 Check Guincho - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Enviar email com anexo
interface EmailComAnexo extends EmailOptions {
  attachments?: any[];
}

export const sendEmailComAnexo = async ({ to, subject, html, attachments }: EmailComAnexo): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      attachments
    });
    
    console.log(`✅ Email com anexo enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email com anexo:', error);
    return false;
  }
};
