# 🚀 Quick Start - Teste Offline-First

## Status dos Serviços

✅ **Expo**: Rodando em `exp://192.168.1.5:8082`
✅ **Backend**: Rodando em `http://localhost:8080`
✅ **Banco de Dados**: PostgreSQL conectado

---

## 📱 Como Testar no Expo Go

### Passo 1: Escanear QR Code
```
Abra Expo Go no Android/iPhone
Escanear o QR code do Metro Bundler
Aguarde o app carregar
```

### Passo 2: Login
```
Email: (seu email de teste)
Senha: (sua senha)
```

### Passo 3: Home Screen
```
Você verá:
- "● Online" (status badge verde)
- "+ Novo Sinistro"
- "🔄 Sincronizar" (novo botão)
```

---

## 🧪 Teste Rápido #1: Criar Offline

### Sem Internet (Simular)

1. **Desativar WiFi no celular**
   - Status muda para "● Offline" (vermelho)

2. **Clicar "+ Novo Sinistro"**

3. **Preencher Dados**
   - Nome: João Silva
   - CPF: 123.456.789-00
   - Telefone: (11) 98765-4321
   - Placa: ABC-1234
   - Modelo: Toyota Corolla
   - Cor: Preto

4. **Clicar "Adicionar Fotos"**
   - Abre câmera automaticamente
   - Tire 2-3 fotos (ou selecione da galeria)
   - Clique "Continuar Preenchendo"

5. **Clicar "Salvar"**
   - Mensagem: "Salvo Localmente"
   - Opções: "Continuar Preenchendo" ou "Voltar"
   - **✅ Nenhum erro 400**

6. **Voltar para Home**
   - Status: "● Offline" (ainda)

---

## 🔄 Teste Rápido #2: Sincronizar Online

### Com Internet (Reconectar)

1. **Ativar WiFi no celular**
   - Status muda para "● Online" (verde)

2. **Clicar "🔄 Sincronizar"**
   - Abre tela `sinistros-offline.tsx`

3. **Visualizar Lista**
   ```
   📱 1 sinistro(s) aguardando sincronização
   
   ┌─ Sinistro #[NUMERO] ──────────┐
   │ João Silva                    │
   │ Status: ⏳ Pendente           │
   └───────────────────────────────┘
   ```

4. **Clicar "Sincronizar Tudo"**
   - Botão fica cinza
   - Spinner de carregamento
   - Status muda para "⏳ Sincronizando..."

5. **Aguardar Conclusão**
   - Se sucesso: ✅ Sincronizado com sucesso
   - Se erro: ❌ Erro ao sincronizar (detalhes)

6. **Após Sucesso**
   - Lista fica vazia: "Tudo Sincronizado!"
   - Alert: "✅ 1 sincronizado, ❌ 0 erro(s)"

---

## ❌ Erros que NÃO Devem Aparecer Mais

### ❌ Erro: "Request failed with status code 400"
- **Antes**: Ao clicar "Adicionar Fotos" sem salvar
- **Agora**: ✅ Fotos salvas localmente sem erro

### ❌ Erro: "Cannot read property 'Base64' of undefined"
- **Antes**: Ao converter imagem
- **Agora**: ✅ Encoding correto `FileSystem.EncodingType.Base64`

### ❌ Obrigação: "Salve o sinistro antes de adicionar fotos"
- **Antes**: Mensagem de alerta
- **Agora**: ✅ Cria rascunho automaticamente

---

## 🔐 Recurso Bônus: PDF com Assinatura

### Se quiser testar signature:

1. **No formulário Novo Sinistro**, desça até "Assinatura"
2. **Clique "Capturar Assinatura"**
3. **Assine na tela**
4. **Clique "✓ Aceitar"**
5. **PDF gerado localmente** com:
   - Logo da empresa
   - Dados do prestador
   - Fotos do sinistro
   - Assinatura capturada

---

## 📊 Verificar no Backend (Opcional)

### Listar sinistros sincronizados:
```bash
# Em outro terminal
curl http://localhost:8080/api/sinistros
```

### Logs do backend:
```
🚀 Servidor rodando na porta 8080
📍 URL: http://0.0.0.0:8080

[Quando sincronizar]
✅ POST /api/sinistros
✅ POST /api/sinistros/{id}/fotos (x3)
✅ PUT SQLite sincronizado=true
```

---

## 🎯 Checklist de Validação

- [ ] App inicia sem erros
- [ ] Status "● Offline" / "● Online" funciona
- [ ] "+ Novo Sinistro" abre formulário
- [ ] "Adicionar Fotos" funciona sem salvar
- [ ] "Salvar" não envia ao servidor (localmente)
- [ ] "🔄 Sincronizar" mostra lista pendente
- [ ] Sincronização envia tudo com sucesso
- [ ] Nenhum erro 400, Base64, ou obrigação de salvar

---

## 🆘 Se algo der errado

### Problema: "Expo won't start"
```bash
cd C:\Users\ROGE_JR\Desktop\check-guincho
rm -r .expo node_modules/.cache
npx expo start --lan --clear
```

### Problema: "Backend not running"
```bash
cd C:\Users\ROGE_JR\Desktop\check-guincho\backend
npm run build
node dist/index.js
```

### Problema: "Database error"
```bash
# Reiniciar PostgreSQL ou executar migração
node dist/runMigration.js
```

---

## 📞 Resumo Final

**Antes v1.0:**
- ❌ Erro 400 ao enviar fotos
- ❌ Obrigado salvar antes de adicionar fotos
- ❌ Erro Base64 undefined
- ❌ Sem sincronização offline

**Depois v2.0:**
- ✅ Fotos salvas localmente
- ✅ Adiciona fotos sem salvar
- ✅ Encoding Base64 correto
- ✅ Tela de sincronização completa
- ✅ Offline-first funcionando

**Pronto para usar!** 🎉
