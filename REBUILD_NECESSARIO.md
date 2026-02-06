# ⚠️ SEU APK ESTÁ COM IP ANTIGO - PRECISA REBUILDAR!

## 🔍 Problema Identificado

Seu APK foi compilado com IP **192.168.1.5**, mas seu IP atual é **192.168.1.17**.
Por isso o app não consegue se conectar ao backend.

---

## ✅ Correções Aplicadas

Atualizei os seguintes arquivos com o IP correto (**192.168.1.17**):

1. ✅ `config/api.ts`
2. ✅ `backend/.env`
3. ✅ `backend/src/index.ts` (CORS liberado)
4. ✅ `app/configuracoes.tsx`
5. ✅ `android/app/src/main/res/xml/network_security_config.xml`

---

## 🚀 Solução: Rebuildar o APK

### Opção 1: Build Automático (RECOMENDADO)

Execute o script que criei:

```powershell
.\rebuild-apk.ps1
```

### Opção 2: Build Manual

```powershell
# 1. Login no EAS
eas login

# 2. Gerar APK
eas build --platform android --profile preview

# 3. Aguarde 10-15 minutos
# 4. Baixe o APK em: https://expo.dev/builds
```

---

## 📱 Após o Build

1. **Desinstale** o app antigo do celular
2. **Instale** o novo APK
3. **Rode o backend**:
   ```powershell
   cd backend
   npm run dev
   ```
4. **Conecte** celular e PC na mesma rede WiFi
5. **Abra o app** e teste!

---

## 🧪 Testar SEM Rebuildar (Temporário)

Se quiser testar AGORA sem rebuildar o APK:

```powershell
# 1. Rode o backend com IP correto
cd backend
npm run dev

# 2. Em OUTRO terminal, rode o Expo Go
npm start

# 3. Escaneie o QR code no Expo Go
```

⚠️ **Limitação**: Deep links de email não funcionam no Expo Go.

---

## ❓ Dúvidas Frequentes

### Meu IP pode mudar?
Sim! Se você reiniciar o roteador ou reconectar ao WiFi, o IP pode mudar.

**Solução**: Configure IP fixo no roteador para seu PC.

### Preciso rebuildar sempre que o IP mudar?
Sim, se você usar APK standalone. Com Expo Go, basta atualizar `config/api.ts` e reiniciar.

### O backend está funcionando?
Teste abrindo no navegador do celular:
```
http://192.168.1.17:8080
```

Deve retornar:
```json
{
  "message": "Check Guincho API",
  "version": "1.0.0",
  ...
}
```

---

## 📋 Checklist Antes de Rebuildar

- [ ] Backend rodando (`cd backend; npm run dev`)
- [ ] Testado `http://192.168.1.17:8080` no navegador do celular
- [ ] Celular e PC na mesma rede WiFi
- [ ] `config/api.ts` com IP 192.168.1.17
- [ ] Conta Expo configurada (`eas login`)

---

**Agora você está pronto para rebuildar o APK! 🚀**
