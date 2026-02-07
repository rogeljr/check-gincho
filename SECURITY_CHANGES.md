# Mudanças Necessárias - Segurança (Sessão Única + Anti-Abuso Trial)

## ✅ Arquivos Criados:

1. **backend/database/migrations/20260205_add_security_fields.js** - Migration
2. **backend/src/models/TrialUsage.ts** - Model novo
3. **backend/src/models/Empresa.ts** - Atualizado com novos campos

---

## 🔧 Mudanças Manuais Necessárias:

### 1. **authController.ts - Função cadastrarEmpresa**

**Adicionar no início da função** (logo após pegar req.body):

```typescript
const { nome, cnpj, codigo, email, senha, cpf_responsavel, device_id } = req.body;

// Adicionar validação:
if (!cpf_responsavel || !device_id) {
  return res.status(400).json({ 
    error: 'CPF do responsável e identificação do dispositivo são obrigatórios' 
  });
}

// Validar CPF
const cpfLimpo = cpf_responsavel.replace(/\D/g, '');
if (cpfLimpo.length !== 11) {
  return res.status(400).json({ error: 'CPF inválido' });
}
```

**Adicionar ANTES de criar a empresa** (depois de validar CNPJ/email):

```typescript
// Verificação anti-abuso
const { default: TrialUsage } = await import('../models/TrialUsage');
const { Op } = await import('sequelize');

const trialJaUsado = await TrialUsage.findOne({
  where: {
    [Op.or]: [
      { cpf: cpfLimpo },
      { device_id: device_id }
    ]
  }
});

let temDireitoTrial = !trialJaUsado;
if (trialJaUsado) {
  console.log('⚠️ [CADASTRO] CPF ou dispositivo já utilizou trial');
}
```

**Ao criar empresa, adicionar:**

```typescript
const empresa = await Empresa.create({
  nome,
  cnpj: cnpjFormatado,
  codigo: codigoFinal,
  email,
  senha: senhaHash,
  cpf_responsavel: cpfLimpo,        // ← NOVO
  device_id: device_id,              // ← NOVO
  ativo: false
});

// Logo após criar, registrar trial usage:
if (temDireitoTrial) {
  await TrialUsage.create({
    cpf: cpfLimpo,
    device_id: device_id,
    empresa_id: empresa.id
  });
}
```

**No retorno final, adicionar:**

```typescript
return res.status(201).json({
  message: 'Empresa cadastrada com sucesso!',
  codigo: codigoFinal,
  email,
  tem_direito_trial: temDireitoTrial  // ← NOVO
});
```

---

### 2.  **authController.ts - Função login**

**Adicionar no início da função:**

```typescript
const { codigo, senha, device_id } = req.body;

if (!device_id) {
  return res.status(400).json({ error: 'Identificação do dispositivo é obrigatória' });  
}
```

**Após validar senha, ANTES do return final:**

```typescript
// Gerar novo token
const token = generateToken(empresa.id);

// 🔐 SESSÃO ÚNICA: Salvar token e invalidar sessões anteriores
empresa.active_token = token;
empresa.device_id = device_id;
empresa.ultimo_login = new Date();
await empresa.save();

console.log('🔐 [LOGIN] Sessão única ativada - tokens anteriores invalidados');
```

---

### 3. **middleware/auth.ts - Adicionar verificação de sessão única**

**No middleware de autenticação, APÓS decodificar o token:**

```typescript
// Verificar se é o token ativo (sessão única)
if (empresa.active_token && empresa.active_token !== token) {
  console.log('❌ [AUTH] Token inválido - sessão iniciada em outro dispositivo');
  return res.status(401).json({ 
    error: 'Sua sessão foi encerrada porque você fez login em outro dispositivo.',
    code: 'SESSION_REPLACED'
  });
}
```

---

### 4. **authController.ts - Função validarConta**

**Ao ativar a conta, verificar se tem direito a trial:**

```typescript
// Decodificar token
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
const { empresaId, temDireitoTrial } = decoded;

// Ao ativar:
empresa.ativo = true;

// Se tem direito a trial (7 dias), se não tem (1 dia apenas)
if (temDireitoTrial !== false) {
  empresa.data_inicio_trial = new Date();
  console.log('✅ Trial de 7 dias ativado');
} else {
  const dataLimitada = new Date();
  empresa.data_inicio_trial = new Date(dataLimitada.getTime() - (6 * 24 * 60 * 60 * 1000)); // 1 dia apenas
  console.log('⚠️ Trial já usado - apenas 1 dia de acesso');
}

await empresa.save();
```

---

## 📱 Mudanças no Frontend (App)

### **CompanyRegisterScreen.js ou cadastro-empresa.tsx**

Adicionar campos:

```typescript
const [cpfResponsavel, setCpfResponsavel] = useState('');
const [deviceId, setDeviceId] = useState('');

// No useEffect, obter device ID:
import * as Application from 'expo-application';
import * as Device from 'expo-device';

useEffect(() => {
  const getDeviceId = async () => {
    // Para Android
    const id = Application.androidId || 
               Device.osBuildId || 
               Device.osInternalBuildId ||
               Math.random().toString(36);
    setDeviceId(id);
  };
  getDeviceId();
}, []);

// Ao enviar cadastro:
const dadosCadastro = {
  nome,
  cnpj,
  email,
  senha,
  cpf_responsavel: cpfResponsavel,
  device_id: deviceId
};
```

### **LoginScreen.js ou login.tsx**

```typescript
// Obter device ID igual ao cadastro
const [deviceId, setDeviceId] = useState('');

// Enviar no login:
const dadosLogin = {
  codigo,
  senha,
  device_id: deviceId
};
```

---

## 🚀 Próximos Passos:

1. **Rodar migration:**
   ```bash
   node backend/database/run-migration.js 20260205_add_security_fields
   ```

2. **Compilar backend:**
   ```bash
   cd backend
   npm run build
   ```

3. **Testar!**

---

**Quer que eu faça essas mudanças agora ou você prefere revisar primeiro?**
