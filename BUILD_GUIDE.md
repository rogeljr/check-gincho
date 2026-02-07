# 🚀 Check Guincho - Guia de Build e Deploy

## Status Atual ✅
- ✅ Backend funcionando (porta 8080)
- ✅ Frontend em desenvolvimento (Expo)
- ✅ Novo fluxo de validação de conta via email implementado
- ✅ Logo configurada
- ✅ APK pronto para ser gerado

---

## 📱 Opção 1: Gerar APK (RECOMENDADO)

### Pré-requisitos:
1. **Node.js** (v16+) e npm
2. **Conta Expo** (gratuita): https://expo.dev
3. **EAS CLI** (já instalado): `npm install -g eas-cli`

### Passos:

#### 1️⃣ Login na Expo
```bash
eas login
```
(Use suas credenciais Expo)

#### 2️⃣ Gerar o APK
```bash
cd c:\Users\ROGE_JR\Desktop\check-guincho

# Build remoto (gratuito, mas mais lento)
eas build --platform android --profile preview

# OU build local (requer Docker, mais rápido)
eas build --platform android --profile preview --local
```

#### 3️⃣ Baixar o APK
- O build será feito na nuvem do EAS
- Você receberá um link para download do APK
- Ou acesse: https://expo.dev/builds

#### 4️⃣ Instalar no celular
```bash
# Via USB (ADB)
adb install check-guincho.apk

# OU manualmente:
# 1. Transfira o APK para o celular via WhatsApp/Google Drive
# 2. Abra o arquivo no celular
# 3. Instale normalmente
```

---

## 💻 Opção 2: Testar com Expo Go (TEMPORÁRIO)

Se não quiser instalar APK ainda, pode testar pelo Expo Go:

1. **Abra o Expo Go no celular**
2. **Escaneie o QR Code** que aparece ao rodar:
```bash
npx expo start
```

⚠️ **Limitação**: Deep links de email não funcionam bem em Expo Go. Use o APK para experiência completa.

---

## 🔧 Configuração do Backend

Certifique-se de que `backend/.env` tem a configuração correta:

```env
BACKEND_URL=http://192.168.1.5:8080
FRONTEND_URL=http://192.168.1.5:8081
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

---

## 📧 Fluxo de Validação de Conta

1. **Usuário cadastra** → Envia email com link HTTP
2. **Clica no email** → Abre browser → Valida conta → Tenta abrir app (deep link)
3. **Com APK**: Deep link abre o app automaticamente
4. **Após validação**: Login funciona normalmente

---

## 🎨 Ícones e Logo

- **Ícone do app**: `assets/images/logo.png`
- **Splash screen**: `assets/images/logo.png`
- **Na tela de login**: Logo aparece entre "Check Guincho" e "Sistema de Gestão de Sinistros"

---

## 📦 Release Build (Para App Store/Google Play)

Depois que testar e validar, para fazer release:

```bash
eas build --platform android --profile production
```

Isso gera um APK pronto para upload no Google Play.

---

## 🆘 Troubleshooting

### APK não instala
- Certifique-se de ter Android 8+ (API 26+)
- Ative "Instalar de fontes desconhecidas" nas configurações

### Deep link não funciona
- Verifique se o app está instalado (não Expo Go)
- Verifique `app.json` tem `"scheme": "checkguincho"`

### Backend não conecta
- Verifique IP em `config/api.ts`
- Certifique-se que celular está na mesma rede que PC

### Email não recebe validação
- Verifique `backend/.env` BACKEND_URL
- Teste: `curl http://192.168.1.5:8080/health`

---

## 📚 Recursos

- [Expo Build Docs](https://docs.expo.dev/build/introduction/)
- [React Native Deep Linking](https://reactnative.dev/docs/deep-linking)
- [EAS CLI Docs](https://docs.expo.dev/eas-cli/introduction/)

---

**Última atualização**: 3 de Fevereiro de 2026

Qualquer dúvida, verifique os logs do backend:
```bash
cd backend
npm run dev
```
