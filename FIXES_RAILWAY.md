# Correções de Produção - Railway

## Problemas Identificados nos Logs

### 1. ❌ URLs muito longas (CRÍTICO)
**Erro:** `value too long for type character varying(500)`

**Causa:** URLs do Cloudinary excedem 500 caracteres

**Solução:** Aumentado limite de 500 para 2000 caracteres

### 2. ❌ Números de sinistro duplicados
**Erro:** `duplicate key value violates unique constraint "sinistros_numero_sinistro_key"`

**Causa:** Geração baseada apenas em timestamp (segundo), conflitos em criações simultâneas

**Solução:** Adicionado milissegundos + número aleatório (formato: SIN202602052022305612345)

### 3. ❌ Tipo de pagamento "test" inválido
**Erro:** `invalid input value for enum enum_pagamentos_tipo_pagamento: "test"`

**Causa:** Enum limitado (pix, credit_card, debit_card) não aceita valores do Mercado Pago (test, account_money, etc.)

**Solução:** Alterado de ENUM para VARCHAR(50) para aceitar qualquer tipo do Mercado Pago

---

## Arquivos Modificados

### Backend - Models
- `backend/src/models/Foto.ts` - url: VARCHAR(500) → VARCHAR(2000)
- `backend/src/models/Pagamento.ts` - tipo_pagamento: ENUM → STRING

### Backend - Controllers  
- `backend/src/controllers/sinistroController.ts` - gerarNumeroSinistro() agora inclui milissegundos + random

### Database - Migration
- `backend/database/migrations/20260205_fix_url_length.js` - Migration para aplicar mudanças no banco

---

## Como Aplicar as Correções no Railway

### Opção 1: Executar Migration via Railway CLI (RECOMENDADO)

1. **Fazer commit e push das mudanças:**
   ```bash
   # No GitHub Desktop:
   # 1. Commit com mensagem: "fix: corrigir problemas de produção (url, sinistro, pagamento)"
   # 2. Push para GitHub
   ```

2. **Aguardar deploy automático no Railway**

3. **Executar migration manualmente via Railway Dashboard:**
   - Ir para Railway → Projeto → Backend
   - Clicar em "Deployments" → Deploy ativo
   - Clicar nos 3 pontinhos → "Run Command"
   - Executar: `node database/run-migration.js 20260205_fix_url_length`

### Opção 2: Railway CLI Local (se tiver Railway CLI instalado)

```bash
# Fazer login
railway login

# Vincular ao projeto
railway link

# Executar migration
railway run node backend/database/run-migration.js 20260205_fix_url_length
```

### Opção 3: Via Script SQL Direto (alternativa)

Conectar ao PostgreSQL do Railway e executar:

```sql
-- 1. Aumentar campo url
ALTER TABLE fotos ALTER COLUMN url TYPE VARCHAR(2000);

-- 2. Alterar tipo_pagamento
ALTER TABLE pagamentos ALTER COLUMN tipo_pagamento TYPE VARCHAR(50);
```

---

## Verificação Pós-Migration

Após executar a migration, verificar nos logs do Railway:

✅ **Sucesso esperado:**
- Sem erros "value too long for type character varying(500)"
- Sem erros "invalid input value for enum"
- Sinistros criados sem duplicatas

❌ **Se ainda houver erros:**
- Verificar se migration foi executada: `SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'fotos' AND column_name = 'url';`
- Deve retornar: character_maximum_length = 2000

---

## Próximos Passos

1. ✅ Fazer commit e push das mudanças
2. ✅ Aguardar deploy no Railway
3. ✅ Executar migration no banco de produção
4. ✅ Testar app com amigo:
   - Criar sinistros simultâneos (testar duplicata)
   - Upload de fotos (testar URL longa)
   - Fazer pagamento teste (testar tipo_pagamento)

---

## Rollback (se necessário)

Para reverter as mudanças no banco:

```sql
-- CUIDADO: Só executar se precisar voltar atrás!
ALTER TABLE fotos ALTER COLUMN url TYPE VARCHAR(500);
ALTER TABLE pagamentos ALTER COLUMN tipo_pagamento TYPE VARCHAR(20);
-- Nota: Isso pode FALHAR se já houver dados com URLs > 500 chars
```
