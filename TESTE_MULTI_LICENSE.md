# 🧪 Guia de Testes - Sistema Multi-Licenças

## ✅ Backend Status

- ✅ TypeScript compilado sem erros
- ✅ Todas as mudanças implementadas
- ✅ Migrations criadas e prontas
- ✅ Novo endpoint criado
- ⏳ Migrations ainda não executadas no banco (Railway)

---

## 🚀 Testes Rápidos (cURL)

### Teste 1: Login Básico
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "EMP001",
    "senha": "senha123",
    "device_id": "iPhone-12-Pro"
  }'
```

**Esperado:**
```json
{
  "token": "eyJhbGc...",
  "empresa": {
    "id": 1,
    "nome": "Minha Empresa",
    "codigo": "EMP001",
    "email": "email@empresa.com",
    "ativo": true
  }
}
```

### Teste 2: Selecionar Licenças (Novo Endpoint!)
```bash
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 2}'
```

**Esperado:**
```json
{
  "preference_id": "123456789",
  "init_point": "https://www.mercadopago.com/checkout/...",
  "quantidade_licencas": 2,
  "valor_total": 10.00,
  "preco_por_licenca": 5.00
}
```

**Validações:**
- ❌ Sem token: 401 Unauthorized
- ❌ Quantidade < 1: 400 Bad Request
- ❌ Quantidade > 10: 400 Bad Request
- ✅ Quantidade = 1-10: 200 OK

### Teste 3: Login em 2 Dispositivos
```bash
# Device 1 - Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"codigo": "EMP001", "senha": "senha123", "device_id": "device-1"}'

# Salvar token1
TOKEN1="eyJhbGc..."

# Device 2 - Login (mesmo usuário, outro device)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"codigo": "EMP001", "senha": "senha123", "device_id": "device-2"}'

# Salvar token2
TOKEN2="eyJhbGc2..."

# Ambos devem funcionar:
curl -X GET http://localhost:3000/api/auth/empresa \
  -H "Authorization: Bearer $TOKEN1"
# ✅ 200 OK

curl -X GET http://localhost:3000/api/auth/empresa \
  -H "Authorization: Bearer $TOKEN2"
# ✅ 200 OK
```

### Teste 4: Limite de Dispositivos (Se empresa tem apenas 1 licença)
```bash
# Device 1 - Login
TOKEN1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"codigo": "EMP001", "senha": "senha123", "device_id": "device-1"}' \
  | jq -r '.token')

# Device 2 - Login (3º device, mas empresa só tem 1 licença)
TOKEN2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"codigo": "EMP001", "senha": "senha123", "device_id": "device-2"}' \
  | jq -r '.token')

# TOKEN1 agora está inválido (removido do array)
curl -X GET http://localhost:3000/api/auth/empresa \
  -H "Authorization: Bearer $TOKEN1"
# ❌ 401 SESSION_REPLACED
```

---

## 🔄 Fluxo Completo de Teste (Passo a Passo)

### Pré-requisitos
- [ ] Sistema rodando em http://localhost:3000
- [ ] PostgreSQL com migrations executadas
- [ ] Variáveis de ambiente configuradas (.env)

### 1. Criar Empresa de Teste
```bash
curl -X POST http://localhost:3000/api/auth/cadastrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Empresa Teste Licenças",
    "cnpj": "00.000.000/0001-91",
    "email": "teste@empresa.com",
    "senha": "senha123",
    "cpf_responsavel": "12345678900",
    "device_id": "test-device-1",
    "codigo": "TEST001"
  }'
```

### 2. Validar Conta (simular clique no email)
```bash
# Obter token do banco ou log
# POST /api/auth/validar-conta-browser?token=...
```

### 3. Fazer Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"codigo": "TEST001", "senha": "senha123", "device_id": "device-1"}' \
  | jq '.token' -r > token.txt

TOKEN=$(cat token.txt)
echo "Token salvo: $TOKEN"
```

### 4. Testar Novo Endpoint (Selecionar Licenças)
```bash
# Teste com 1 licença
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 1}'
# Esperado: valor_total = 5.00

# Teste com 3 licenças
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 3}'
# Esperado: valor_total = 15.00

# Teste com 10 licenças (máximo)
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 10}'
# Esperado: valor_total = 50.00

# Teste com 11 licenças (inválido)
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 11}'
# Esperado: 400 Bad Request
```

### 5. Simular Webhook de Pagamento Aprovado
```bash
curl -X POST http://localhost:3000/api/pagamentos/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "999999999999"
    }
  }'
```

**Verificar no banco:**
```sql
SELECT id, quantidade_licencas, quantidade_licencas, data_expiracao 
FROM empresas WHERE codigo = 'TEST001';
```

Esperado: `quantidade_licencas` = 3, `data_expiracao` = hoje + 30 dias

### 6. Testar Multi-Sessão
```bash
# Empresa tem 3 licenças, logar em 4 dispositivos

TOKEN1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"codigo": "TEST001", "senha": "senha123", "device_id": "device-1"}' \
  | jq -r '.token')

TOKEN2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"codigo": "TEST001", "senha": "senha123", "device_id": "device-2"}' \
  | jq -r '.token')

TOKEN3=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"codigo": "TEST001", "senha": "senha123", "device_id": "device-3"}' \
  | jq -r '.token')

TOKEN4=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"codigo": "TEST001", "senha": "senha123", "device_id": "device-4"}' \
  | jq -r '.token')

# Resultado esperado:
# TOKEN1: ❌ Removido (active_tokens.length = 3, ficaram [TOKEN2, TOKEN3, TOKEN4])
# TOKEN2: ✅ Válido
# TOKEN3: ✅ Válido
# TOKEN4: ✅ Válido

curl -X GET http://localhost:3000/api/auth/empresa \
  -H "Authorization: Bearer $TOKEN1"
# ❌ 401 SESSION_REPLACED

curl -X GET http://localhost:3000/api/auth/empresa \
  -H "Authorization: Bearer $TOKEN2"
# ✅ 200 OK
```

---

## 📋 Checklist de Validação

### Banco de Dados
- [ ] Campo `quantidade_licencas` existe em `empresas`
- [ ] Campo `active_tokens` existe em `empresas` (JSONB)
- [ ] Campo `quantidade_licencas_solicitadas` existe em `pagamentos`
- [ ] Índice em `quantidade_licencas` foi criado

### Modelos
- [ ] Empresa tem propriedades `active_tokens` e `quantidade_licencas`
- [ ] Pagamento tem propriedade `quantidade_licencas_solicitadas`
- [ ] TypeScript sem erros (`npm run build`)

### Controller
- [ ] Novo endpoint `/pagamentos/selecionar-licencas` existe
- [ ] Endpoint valida quantidade (1-10)
- [ ] Endpoint calcula preço corretamente
- [ ] Webhook extrai licenças do external_reference
- [ ] Webhook chama estenderAssinatura com quantidade

### Middleware
- [ ] authMiddleware verifica array `active_tokens`
- [ ] authMiddleware permite múltiplos tokens
- [ ] Rejeita token fora do array

### Login
- [ ] Login adiciona token ao array `active_tokens`
- [ ] Login remove tokens antigos quando limite é atingido
- [ ] Login mantém apenas os últimos N tokens (N = quantidade_licencas)

---

## 🐛 Possíveis Problemas e Soluções

### Erro: "quantidade_licencas is not defined"
**Solução**: Executar migrations
```bash
npm run migrate
```

### Erro: "active_tokens field doesn't exist"
**Solução**: Verificar coluna no banco
```sql
ALTER TABLE empresas ADD COLUMN active_tokens JSONB DEFAULT '[]'::jsonb;
```

### Erro: "Cannot read property 'includes' of null"
**Solução**: No authMiddleware, verificamos se array existe antes de usar
```typescript
if (empresa.active_tokens && empresa.active_tokens.length > 0) {
  // ... validação
}
```

### Webhook não atualiza licenças
**Solução**: Verificar formato do external_reference
```javascript
// Deve ser: empresa_1_1704067200000_3lic
// Pattern: empresa_ID_TIMESTAMP_Xlic
const licMatch = payment.external_reference.match(/_(\d+)lic/);
```

---

## 📊 Checklist Antes do Deployment

- [ ] Migrations criadas: ✅
- [ ] Backend compila: ✅
- [ ] Testes manuais passam
- [ ] Webhook testado
- [ ] Frontend preparado para Device ID
- [ ] Frontend preparado para License Selection Modal
- [ ] Frontend preparado para SESSION_REPLACED error
- [ ] .env atualizado com credenciais Mercado Pago
- [ ] Procfile configurado (já está)
- [ ] Migrations serão executadas no Railway

---

## 🎯 Próximas Ações (Frontend)

1. **Implementar Device ID Capture**
   - Usar `expo-device` ou similar
   - Enviar em cada requisição de login/cadastro

2. **Criar Modal de Seleção de Licenças**
   - Mostrar opções: 1-10
   - Mostrar preço dinâmico
   - Botão "Próximo" para ir ao Mercado Pago

3. **Tratar Erro SESSION_REPLACED**
   - Mostrar alert ao usuário
   - Oferecer opção de re-login
   - Salvar dados para facilitar re-entrada

4. **Testar Deep Links**
   - Implementar handlers para `checkguincho://pagamento/sucesso`
   - Implementar handlers para `checkguincho://pagamento/falha`

---

**Status**: ✅ Backend 100% Pronto  
**Data**: 2025-02-05  
**Próximo**: Frontend Implementation
