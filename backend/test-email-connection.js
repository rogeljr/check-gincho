#!/usr/bin/env node

/**
 * Script para testar conexão SMTP e diagnosticar problemas de envio de email
 * Uso: node test-email-connection.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const emailConfig = {
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

console.log('🔍 Testando configuração de email...\n');

// Verificar variáveis
console.log('📋 Configurações carregadas:');
Object.entries(emailConfig).forEach(([key, value]) => {
  if (key === 'EMAIL_PASSWORD') {
    console.log(`  ${key}: ${value ? '***' + value.slice(-3) : 'NÃO DEFINIDA'}`);
  } else {
    console.log(`  ${key}: ${value || '❌ NÃO DEFINIDA'}`);
  }
});

const missingConfig = Object.entries(emailConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length) {
  console.log(`\n❌ Variáveis faltando: ${missingConfig.join(', ')}`);
  process.exit(1);
}

console.log('\n✅ Todas as variáveis definidas\n');

// Testar conexão
const testSMTP = async () => {
  const ports = [process.env.EMAIL_PORT, 465, 587, 25, 2525];
  
  for (const port of ports) {
    try {
      console.log(`\n🔗 Testando conexão na porta ${port}...`);
      
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(port),
        secure: port === 465 || port === 2525,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 30000, // 30 segundos
        socketTimeout: 30000,
        greetingTimeout: 30000,
      });

      const verified = await transporter.verify();
      
      if (verified) {
        console.log(`✅ SUCESSO na porta ${port}!`);
        
        // Tentar enviar email de teste
        console.log('\n📧 Tentando enviar email de teste...');
        try {
          const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_USER, // Enviar para si mesmo
            subject: 'Check Guincho - Teste de Email',
            html: '<h1>Email de Teste</h1><p>Este é um email de teste para verificar se o serviço de email está funcionando.</p>'
          });
          console.log('✅ Email enviado com sucesso!');
          console.log('   Message ID:', info.messageId);
          return;
        } catch (sendError) {
          console.error('❌ Erro ao enviar email:', sendError.message);
        }
      }
    } catch (error) {
      console.log(`❌ Falha na porta ${port}: ${error.code || error.message}`);
      
      // Mostrar dica de resolução
      if (error.code === 'ETIMEDOUT') {
        console.log('   💡 Timeout - Verifique:');
        console.log('      - Firewall está bloqueando a porta');
        console.log('      - EMAIL_HOST está correto');
        console.log('      - Conexão com internet está OK');
      } else if (error.code === 'EAUTH') {
        console.log('   💡 Erro de autenticação - Verifique:');
        console.log('      - EMAIL_USER e EMAIL_PASSWORD estão corretos');
        console.log('      - Para Gmail: use Senha de Aplicativo (App Password)');
        console.log('      - Ative "Aplicativos menos seguros" se não estiver usando App Password');
      }
    }
  }
};

testSMTP().catch(console.error);
