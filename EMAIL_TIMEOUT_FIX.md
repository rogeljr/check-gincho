# 🔧 Solução: Email Timeout no Cadastro

## Problema Identificado

O email de validação não foi enviado durante o cadastro porque:
- **Erro**: Connection timeout na porta 587
- **Causa**: Servidor SMTP não respondeu no tempo limite
- **Resultado**: Como `EMAIL_REQUIRED=false`, a empresa foi ativada mesmo assim

```
email_error: "Connection timeout"
email_code: "ETIMEDOUT"
email_port: 587
```

## O que foi Corrigido

### 1. **Timeouts Aumentados** ⏱️
- Antes: 10 segundos
- Agora: 30 segundos
- Razão: Conexões SMTP em Railway podem ser lentas

### 2. **Fallback Automático de Portas** 🔄
Se a porta 587 falhar, tenta automaticamente:
- Porta 465 (SMTPS)
- Porta 2525 (alternativa)
- Porta 25 (última opção)

### 3. **Melhor Diagnóstico** 🔍
- Logs mais claros de cada tentativa
- Diferencia entre erro de conexão (timeout) e erro de autenticação
- Retorna informações detalhadas para debug

## 🚀 Próximas Ações

### Opção A: Testar e Diagnosticar (Recomendado)

```bash
cd backend
npm install  # Se nodemailer não estiver instalado
node test-email-connection.js
```

Este script vai:
1. Verificar variáveis de ambiente
2. Tentar conexão em múltiplas portas
3. Enviar email de teste
4. Mostrar erro específico se falhar

### Opção B: Usar Provedor de Email Profissional (Melhor para Produção)

Gmail e outros provedores pessoais têm limitações em produção.
Considere SendGrid, Mailgun, ou AWS SES:

```env
# Exemplo com SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Check Guincho <noreply@checkguincho.com>"
```

## 📋 Verificação da Configuração

Para que o email funcione, confirme no `.env`:

```env
# SMTP Configuration
EMAIL_HOST=smtp.gmail.com          # Ou seu provedor
EMAIL_PORT=587                      # Ou 465
EMAIL_USER=seu_email@gmail.com      # Email correto
EMAIL_PASSWORD=app_password_aqui    # ⚠️ IMPORTANTE: App Password, não senha da conta!
EMAIL_FROM="Check Guincho <seu_email@gmail.com>"

# Para testes
EMAIL_REQUIRED=false                # Permite teste mesmo com falha de email

# Para produção
EMAIL_REQUIRED=true                 # Bloqueia cadastro se email falhar
```

## ⚠️ Problema Comum com Gmail

Se estiver usando Gmail, **é obrigatório usar "Senha de Aplicativo"**, não a senha da sua conta:

1. Ativar 2FA em https://myaccount.google.com/security
2. Gerar App Password: https://myaccount.google.com/apppasswords
3. Usar a senha gerada no `EMAIL_PASSWORD`

Alternativa: Ativar "Aplicativos menos seguros" (menos seguro)

## 🔐 Em Produção (Railway)

1. Adicionar variáveis de ambiente no Railway Dashboard
2. Redeploy a aplicação
3. Testar com `node test-email-connection.js` antes de ativar `EMAIL_REQUIRED=true`

## 📊 Logs Úteis para Diagnosticar

Ao enviar email, procure por:

```
🔗 [EMAIL] Tentando porta 587...
✅ [EMAIL] Email enviado com sucesso para ...
```

Ou se falhar:

```
⚠️ [EMAIL] Falha na porta 587: ETIMEDOUT - connect ETIMEDOUT
🔗 [EMAIL] Tentando porta 465...
✅ [EMAIL] Email enviado com sucesso para ... na porta 465
```

## 📞 Suporte

Se ainda assim não funcionar:
1. Verificar logs de erro no Railway Dashboard
2. Confirmar que EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD estão corretos
3. Testar com provedor de email diferente (SendGrid recomendado)
4. Verificar se firewall/Railway está bloqueando SMTP

---

**Arquivos modificados:**
- `backend/src/services/emailService.ts` - Melhorado com retry e fallback
- `backend/test-email-connection.js` - Novo script de diagnóstico
