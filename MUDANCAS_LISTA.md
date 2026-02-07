# 📋 Arquivos Modificados - Sistema Multi-Licenças

## Resumo Visual das Mudanças

```
backend/
├── database/
│   └── migrations/
│       ├── 20260205_add_licenses.js (🆕 NOVO)
│       └── 20260205_add_licenses_to_payment.js (🆕 NOVO)
├── src/
│   ├── controllers/
│   │   ├── authController.ts (✏️ ATUALIZADO)
│   │   └── pagamentoController.ts (✏️ ATUALIZADO)
│   ├── middleware/
│   │   └── auth.ts (✏️ ATUALIZADO)
│   ├── models/
│   │   ├── Empresa.ts (✏️ ATUALIZADO)
│   │   └── Pagamento.ts (✏️ ATUALIZADO)
│   └── routes/
│       └── pagamentoRoutes.ts (✏️ ATUALIZADO)
├── dist/
│   └── [rebuilt from TypeScript]
└── app.json, package.json, etc. (unchanged)
```

---

## 📝 Detalhes das Mudanças

### 1. ✅ database/migrations/20260205_add_licenses.js (NOVO)
**Status**: ✏️ Criado
```javascript
// Adiciona 2 colunas à tabela empresas
// - quantidade_licencas INTEGER DEFAULT 1
// - active_tokens JSONB DEFAULT '[]'::jsonb
```

### 2. ✅ database/migrations/20260205_add_licenses_to_payment.js (NOVO)
**Status**: ✏️ Criado
```javascript
// Adiciona coluna à tabela pagamentos
// - quantidade_licencas_solicitadas INTEGER DEFAULT 1
```

### 3. ✅ backend/src/models/Empresa.ts
**Status**: ✏️ Atualizado (3 mudanças)

**Mudança 1: Interface**
```typescript
// Antes
interface EmpresaAttributes {
  // sem os campos abaixo
}

// Depois
interface EmpresaAttributes {
  active_tokens?: string[];
  quantidade_licencas: number;
}
```

**Mudança 2: Classe**
```typescript
// Adicionado à classe
public active_tokens?: string[];
public quantidade_licencas!: number;
```

**Mudança 3: Field Definition**
```typescript
// Adicionado ao init()
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

### 4. ✅ backend/src/models/Pagamento.ts
**Status**: ✏️ Atualizado (3 mudanças)

**Mudança 1: Interface**
```typescript
// Adicionado
quantidade_licencas_solicitadas?: number;
```

**Mudança 2: Classe**
```typescript
// Adicionado
public quantidade_licencas_solicitadas?: number;
```

**Mudança 3: Field Definition**
```typescript
// Adicionado ao init()
quantidade_licencas_solicitadas: {
  type: DataTypes.INTEGER,
  defaultValue: 1,
  allowNull: false
}
```

### 5. ✅ backend/src/controllers/authController.ts
**Status**: ✏️ Atualizado (2 mudanças)

**Mudança 1: Cadastro** (linha ~131)
```typescript
// Antes
const empresa = await Empresa.create({
  nome, cnpj, codigo, email, senha, cpf_responsavel, device_id,
  ativo: false
});

// Depois
const empresa = await Empresa.create({
  nome, cnpj, codigo, email, senha, cpf_responsavel, device_id,
  quantidade_licencas: 1,  // ← NOVO
  ativo: false
});
```

**Mudança 2: Login** (linha ~551)
```typescript
// Antes
empresa.active_token = token;
empresa.device_id = device_id;
empresa.ultimo_login = new Date();
await empresa.save();

// Depois
if (!empresa.active_tokens) {
  empresa.active_tokens = [];
}
empresa.active_tokens.push(token);

if (empresa.active_tokens.length > empresa.quantidade_licencas) {
  const tokensExcedentes = empresa.active_tokens.length - empresa.quantidade_licencas;
  empresa.active_tokens = empresa.active_tokens.slice(tokensExcedentes);
}

empresa.device_id = device_id;
empresa.ultimo_login = new Date();
await empresa.save();
```

### 6. ✅ backend/src/controllers/pagamentoController.ts
**Status**: ✏️ Atualizado (3 mudanças)

**Mudança 1: criarPreferencia()** (linha ~48)
```typescript
// Adicionado ao Pagamento.create()
quantidade_licencas_solicitadas: 1,
```

**Mudança 2: NOVO selecionarLicencas()** (após criarPreferencia)
```typescript
// 🆕 Nova função completa
export const selecionarLicencas = async (req: Request, res: Response) => {
  // Valida quantidade (1-10)
  // Calcula preço: R$5 × quantidade
  // Cria preferência com item para cada licença
  // Retorna init_point para checkout
};
```

**Mudança 3: estenderAssinatura()** (linha ~170)
```typescript
// Antes
const estenderAssinatura = async (empresaId: number): Promise<void> => {
  // ... sem atualizar quantidade_licencas
};

// Depois
const estenderAssinatura = async (empresaId: number, quantidadeLicencas?: number): Promise<void> => {
  // ... NOVO parâmetro
  if (quantidadeLicencas && quantidadeLicencas > 0) {
    empresa.quantidade_licencas = quantidadeLicencas;  // ← NOVO
  }
  // ... resto igual
};
```

**Mudança 4: webhookMercadoPago()** (linha ~218)
```typescript
// Adicionado: extração de licenças do external_reference
const licMatch = external_reference?.match(/_(\d+)lic/);
const quantidadeLicencas = licMatch ? parseInt(licMatch[1]) : 1;

// Adicionado ao Pagamento.create()
quantidade_licencas_solicitadas: quantidadeLicencas,

// Mudado na chamada estenderAssinatura
await estenderAssinatura(empresaId, quantidadeLicencas);  // ← NOVO parâmetro
```

### 7. ✅ backend/src/middleware/auth.ts
**Status**: ✏️ Atualizado (1 mudança)

**Mudança: authMiddleware()** (linha ~32)
```typescript
// Antes
if (empresa.active_token && empresa.active_token !== token) {
  return res.status(401).json({ ... });
}

// Depois
if (empresa.active_tokens && empresa.active_tokens.length > 0) {
  if (!empresa.active_tokens.includes(token)) {
    return res.status(401).json({ ... });
  }
}
```

### 8. ✅ backend/src/routes/pagamentoRoutes.ts
**Status**: ✏️ Atualizado (1 mudança)

**Mudança: Adicionar rota novo endpoint** (linha ~15)
```typescript
// Adicionado
router.post('/selecionar-licencas', authMiddlewareSemAssinatura, pagamentoController.selecionarLicencas);
```

---

## 🔍 Checklist de Validação

- [x] TypeScript compila sem erros
- [x] Todas as interfaces atualizadas
- [x] Todas as classes com novos campos
- [x] Migrations gerando SQL correto
- [x] Endpoint novo em rota
- [x] Middleware verificando array de tokens
- [x] Webhook extrai e salva quantidade
- [x] Webhook chama estenderAssinatura com novo parâmetro
- [x] Login adiciona tokens e respeita limite

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Arquivos Criados | 2 migrations |
| Arquivos Modificados | 6 arquivos |
| Linhas Adicionadas | ~300 linhas |
| Novos Endpoints | 1 (`POST /pagamentos/selecionar-licencas`) |
| Novos Modelos | 0 (atualizados 2) |
| Funções Novas | 1 (`selecionarLicencas`) |
| Funções Modificadas | 4 |

---

## 🚀 Próximo Passo

Executar as migrations no banco de dados da Railway:

```bash
# Local (com DATABASE_URL configurada)
npm run migrate

# Ou no Railway dashboard:
# Railway > Logs > Executar migrations manualmente
```

---

**Última atualização**: 2025-02-05  
**Compilação**: ✅ Success (npm run build)
