# 🎯 Sistema Multi-Licenças - Documentação de Implementação

## 📋 Resumo Executivo

Implementação completa do sistema multi-licenças que permite empresas comprarem múltiplas licenças (dispositivos simultâneos) com preço dinâmico: **R$5 por licença por mês**.

**Características:**
- ✅ Cada empresa pode comprar 1-10 licenças
- ✅ R$5 por licença/mês (dinâmico: 3 licenças = R$15)
- ✅ Cada licença permite 1 dispositivo simultâneo
- ✅ Suporta até quantidade_licencas dispositivos conectados ao mesmo tempo
- ✅ Webhook Mercado Pago atualiza quantidade_licencas ao confirmar pagamento

---

## 🗄️ Mudanças no Banco de Dados

### Migration 1: `20260205_add_licenses.js`
**Adiciona campos de suporte multi-licenças à tabela empresas**

```sql
ALTER TABLE empresas ADD COLUMN quantidade_licencas INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE empresas ADD COLUMN active_tokens JSONB DEFAULT '[]'::jsonb NOT NULL;
CREATE INDEX idx_empresas_quantidade_licencas ON empresas(quantidade_licencas);
```

### Migration 2: `20260205_add_licenses_to_payment.js`
**Adiciona rastreamento de quantidade de licenças em cada pagamento**

```sql
ALTER TABLE pagamentos ADD COLUMN quantidade_licencas_solicitadas INTEGER DEFAULT 1 NOT NULL;
```

---

## 📦 Modelos Atualizados

### Empresa.ts
```typescript
interface EmpresaAttributes {
  // ... campos existentes ...
  active_tokens?: string[];          // Array de tokens JWT ativos
  quantidade_licencas: number;       // Número de dispositivos simultâneos (default: 1)
}

// Campo no init():
active_tokens: {
  type: DataTypes.JSONB,
  defaultValue: [],
  allowNull: false
},
quantidade_licencas: {
  type: DataTypes.INTEGER,
  defaultValue: 1,
  allowNull: false
}
```

### Pagamento.ts
```typescript
interface PagamentoAttributes {
  // ... campos existentes ...
  quantidade_licencas_solicitadas?: number;  // Quantidade pedida neste pagamento
}

// Campo no init():
quantidade_licencas_solicitadas: {
  type: DataTypes.INTEGER,
  defaultValue: 1,
  allowNull: false
}
```

---

## 🔌 Novos Endpoints

### POST `/api/pagamentos/selecionar-licencas`
**Cria preferência de pagamento com quantidade dinâmica de licenças**

#### Request
```json
{
  "quantidade_licencas": 3
}
```

#### Validação
- Campo obrigatório: `quantidade_licencas` (number)
- Intervalo: 1-10 licenças

#### Response (200 OK)
```json
{
  "preference_id": "1234567890",
  "init_point": "https://www.mercadopago.com/checkout/v1/...",
  "sandbox_init_point": "https://sandbox.mercadopago.com/...",
  "quantidade_licencas": 3,
  "valor_total": 15.00,
  "preco_por_licenca": 5.00
}
```

#### Lógica
1. ✅ Valida quantidade_licencas (1-10)
2. ✅ Calcula valor: R$5 × quantidade_licencas
3. ✅ Cria item Mercado Pago com quantidade e preço unitário
4. ✅ Cria record Pagamento com `quantidade_licencas_solicitadas`
5. ✅ Retorna init_point para redirect ao Mercado Pago

---

## 🔐 Fluxo de Autenticação Multi-Sessão

### 1. Cadastro (authController.cadastrarEmpresa)
```typescript
// Novo empresário se registra
const empresa = await Empresa.create({
  // ... outros campos ...
  quantidade_licencas: 1,      // Começa com 1 licença
  active_tokens: [],           // Sem tokens ainda
});
```

### 2. Login (authController.login)
```typescript
// Quando usuario faz login
const token = generateToken(empresa.id, empresa.codigo);

// Adiciona token ao array
empresa.active_tokens.push(token);

// Se ultrapassar limite, remove tokens antigos
if (empresa.active_tokens.length > empresa.quantidade_licencas) {
  const excedentes = empresa.active_tokens.length - empresa.quantidade_licencas;
  empresa.active_tokens = empresa.active_tokens.slice(excedentes);
}

await empresa.save();
```

**Exemplo:**
- Empresa tem `quantidade_licencas = 2`
- 1º login: `active_tokens = [token1]` ✅
- 2º login (outro device): `active_tokens = [token1, token2]` ✅
- 3º login (3º device): `active_tokens = [token2, token3]` ⚠️ token1 removido

### 3. Validação (middleware/auth.ts)
```typescript
// Quando requisição chega com token
if (empresa.active_tokens && empresa.active_tokens.length > 0) {
  if (!empresa.active_tokens.includes(token)) {
    // Reject: token não está na lista de ativos
    return res.status(401).json({
      error: 'Sua sessão foi encerrada porque o limite de dispositivos foi atingido',
      code: 'SESSION_REPLACED'
    });
  }
}
```

---

## 💳 Fluxo de Pagamento com Update de Licenças

### 1. Webhook Recebe Confirmação
```typescript
// POST /api/pagamentos/webhook
const payment = await paymentClient.get({ id: paymentId });

if (payment.status === 'approved') {
  // Extrai quantidade do external_reference
  // Formato: empresa_1_3lic (3 licenças pedidas)
  const licMatch = external_reference.match(/_(\d+)lic/);
  const quantidadeLicencas = parseInt(licMatch[1]) || 1;
  
  // Chama estenderAssinatura com quantidade
  await estenderAssinatura(empresaId, quantidadeLicencas);
}
```

### 2. Atualiza Empresa
```typescript
const estenderAssinatura = async (empresaId, quantidadeLicencas) => {
  const empresa = await Empresa.findByPk(empresaId);
  
  // Atualiza quantidade de licenças
  if (quantidadeLicencas > 0) {
    empresa.quantidade_licencas = quantidadeLicencas;
  }
  
  // Estende data de expiração
  empresa.data_expiracao = new Date(hoje.getDate() + 30);
  empresa.ativo = true;
  await empresa.save();
};
```

**Exemplo:**
- Empresa paga por 3 licenças → `quantidade_licencas = 3`
- Assinatura estendida por 30 dias
- Pode logar em até 3 dispositivos simultaneamente

---

## 🧪 Exemplo de Fluxo Completo

### Cenário: Empresa comprando upgrade de 1 para 3 licenças

**1. Frontend faz requisição**
```bash
POST /api/pagamentos/selecionar-licencas
Authorization: Bearer {token}
{
  "quantidade_licencas": 3
}
```

**2. Backend retorna**
```json
{
  "preference_id": "123456",
  "init_point": "https://mercadopago.com/...",
  "valor_total": 15.00,
  "quantidade_licencas": 3
}
```

**3. Frontend redireciona para checkout Mercado Pago**
```javascript
window.location.href = response.init_point;
```

**4. Usuário paga (PIX)** ✅

**5. Mercado Pago envia webhook**
```
POST /api/pagamentos/webhook
{
  "type": "payment",
  "data": { "id": "payment_id" }
}
```

**6. Backend processa**
- ✅ Busca Pagamento com `mercadopago_id`
- ✅ Verifica `status === 'approved'`
- ✅ Extrai `quantidade_licencas_solicitadas` (3)
- ✅ Atualiza `empresa.quantidade_licencas = 3`
- ✅ Estende `data_expiracao` por 30 dias

**7. Usuário agora pode logar em 3 dispositivos!**
```
Device 1: token1 ✅
Device 2: token2 ✅
Device 3: token3 ✅
Device 4: Rejeitado (SESSION_REPLACED)
```

---

## 📱 Frontend - Implementação necessária

### 1. Capturar Device ID
```javascript
import * as Device from 'expo-device';

const deviceId = `${Device.manufacturer}-${Device.modelName}-${Device.osVersion}`;
```

### 2. Enviar device_id no login
```javascript
const response = await api.post('/auth/login', {
  codigo,
  senha,
  device_id: deviceId
});
```

### 3. Modal de Seleção de Licenças
```javascript
const [quantidadeSelecionada, setQuantidade] = useState(1);
const precoTotal = quantidadeSelecionada * 5.00;

<Picker
  selectedValue={quantidadeSelecionada}
  onValueChange={setQuantidade}
>
  {[1, 2, 3, 4, 5].map(n => (
    <Picker.Item
      key={n}
      label={`${n} ${n === 1 ? 'Licença' : 'Licenças'} - R$${(n * 5).toFixed(2)}`}
      value={n}
    />
  ))}
</Picker>
```

### 4. Chamar novo endpoint
```javascript
const response = await api.post('/pagamentos/selecionar-licencas', {
  quantidade_licencas: quantidadeSelecionada
});

window.location.href = response.init_point;
```

### 5. Tratar erro SESSION_REPLACED
```javascript
if (error.response?.data?.code === 'SESSION_REPLACED') {
  Alert.alert(
    'Limite de Dispositivos',
    'Você já está logado em outro dispositivo. Faça login neste device?'
  );
  // Oferecer opção de re-login ou sair
}
```

---

## 🔍 Testes Recomendados

### Teste 1: Selecionar Licenças
```bash
curl -X POST http://localhost:3000/api/pagamentos/selecionar-licencas \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"quantidade_licencas": 2}'
```

**Esperado:**
- ✅ Retorna preference_id com valor total R$10.00
- ✅ Cria Pagamento com quantidade_licencas_solicitadas=2

### Teste 2: Login em Múltiplos Dispositivos
```javascript
// Device 1: Login
const token1 = await login(codigo, senha, 'device-1');
// active_tokens = [token1]

// Device 2: Login
const token2 = await login(codigo, senha, 'device-2');
// active_tokens = [token1, token2] (empresa tem 2 licenças)

// Device 3: Login (sem 3ª licença)
const token3 = await login(codigo, senha, 'device-3');
// active_tokens = [token2, token3] (token1 removido!)

// Tentar usar token1
api.get('/auth/empresa', { headers: { Authorization: `Bearer ${token1}` } });
// ❌ Resposta: 401 SESSION_REPLACED
```

### Teste 3: Webhook Atualiza Licenças
```bash
# Simular aprovação de pagamento
curl -X POST http://localhost:3000/api/pagamentos/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "9999999999",
      "status": "approved",
      "transaction_amount": 15.00,
      "external_reference": "empresa_1_1704067200000_3lic",
      "payment_type_id": "pix"
    }
  }'
```

**Esperado:**
- ✅ empresa.quantidade_licencas atualizado para 3
- ✅ empresa.data_expiracao estendida 30 dias
- ✅ Log confirmando atualização

---

## ⚙️ Configuração/Deployment

### Migrations Necessárias (Railway)
1. `20260205_add_licenses.js` - Adiciona campos à tabela empresas
2. `20260205_add_licenses_to_payment.js` - Adiciona campo ao pagamentos

### Variáveis de Ambiente
```bash
# Existentes (sem mudanças)
DATABASE_URL=...
JWT_SECRET=...
MERCADO_PAGO_ACCESS_TOKEN=...
```

### Build e Deploy
```bash
# Build TypeScript
npm run build

# Deploy para Railway
# (Procfile já configurado)
git add .
git commit -m "feat: multi-license system implementation"
git push heroku main
```

---

## 📊 Modelo de Dados Final

```
EMPRESAS
├── id (PK)
├── nome
├── cnpj
├── email
├── senha
├── ativo
├── data_expiracao
├── data_inicio_trial
├── cpf_responsavel (trial-abuse prevention)
├── device_id
├── ultimo_login
├── quantidade_licencas ← NOVO (default: 1)
├── active_tokens ← NOVO (JSONB array)
└── timestamps

PAGAMENTOS
├── id (PK)
├── empresa_id (FK)
├── mercadopago_id
├── valor
├── status
├── tipo_pagamento
├── data_pagamento
├── data_expiracao
├── quantidade_licencas_solicitadas ← NOVO
├── metadata
└── timestamps
```

---

## 🚀 Próximos Passos

1. ✅ **Backend**: Implementação completa
2. ⏳ **Frontend**: 
   - Device ID capture
   - License selection modal
   - Handle SESSION_REPLACED error
   - Deep link handling
3. ⏳ **Testing**: Integração completa end-to-end
4. ⏳ **Deployment**: Push para Railway com migrations

---

## 📝 Notas Importantes

- **Retrocompatibilidade**: O sistema mantém compatibilidade com empresas antigas (single token)
- **Migrações**: Precisam ser executadas antes de ativar o recurso em produção
- **Mercado Pago Response**: O external_reference deve incluir formato `_Xlic` para extrair quantidade
- **Session Management**: Tokens novos removem tokens antigos quando ultrapassam o limite
- **Trial Abuse**: Sistema ainda funciona (CPF + device_id para prevenir múltiplos trials)

---

**Versão**: 1.0  
**Data**: 2025-02-05  
**Status**: ✅ Implementado e Compilado
