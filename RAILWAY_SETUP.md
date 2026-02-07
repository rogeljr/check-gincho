# Configuração Railway - Deploy em Produção

## Credenciais Mercado Pago (PRODUÇÃO)

Adicione as seguintes variáveis de ambiente no Railway:

```
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-4654079719127145-020217-31d200dd429dbb51982609f8bf5217a7-39570033
MERCADO_PAGO_PUBLIC_KEY=APP_USR-bd1bb91b-51c6-4dbc-920d-d8a4bfle8c8e
```

## Como adicionar variáveis de ambiente no Railway

1. Acesse o project no Railway
2. Clique em "Variables" (ou configuração)
3. Adicione cada variável:
   - Nome: `MERCADO_PAGO_ACCESS_TOKEN`
   - Valor: `APP_USR-4654079719127145-020217-31d200dd429dbb51982609f8bf5217a7-39570033`
   
   - Nome: `MERCADO_PAGO_PUBLIC_KEY`
   - Valor: `APP_USR-bd1bb91b-51c6-4dbc-920d-d8a4bfle8c8e`
4. Clique em "Deploy" para ativar as mudanças

## Outras variáveis necessárias

Verifique se já tem configurados:

```bash
# Database (Railway cria automaticamente)
DATABASE_URL=...

# JWT Secret (gere uma chave aleatória)
JWT_SECRET=sua_chave_super_secreta_minimo_32_caracteres

# Cloudinary (se usar upload de fotos)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# URLs de redirect (para webhooks)
FRONTEND_URL=https://seu-frontend.vercel.app
BACKEND_URL=https://seu-backend.railway.app
```

## Teste de Pagamento

- Valor: **R$5,00** (teste - depois aumentar para R$35)
- Tipo: PIX, Boleto ou Cartão
- Webhook: Mercado Pago enviará confirmação automaticamente

## Próximos passos

1. ✅ Deploy no Railway
2. Testar pagamento com R$5,00
3. Emitir certificado SSL (Railway faz automático)
4. Configurar domínio personalizado (opcional)
5. Aumentar valor para R$35,00 após validação
