# 📱 Guia de Uso - Modo Offline-First

## ✨ Novo Fluxo (Offline-First)

### 1️⃣ **Criar Novo Sinistro (Sem Internet)**
- Clique em "+ Novo Sinistro"
- Preencha os dados do cliente e veículo
- **NÃO precisa salvar para adicionar fotos**
- Clique em "Salvar" → Sinistro é salvo **LOCALMENTE** no dispositivo
- Mensagem: "Salvo Localmente"

### 2️⃣ **Adicionar Fotos (Sem Internet)**
- Clique em "Adicionar Fotos"
- Tire fotos com a câmera ou selecione da galeria
- Clique em "Continuar Preenchendo" → Fotos salvas **LOCALMENTE**
- Retorna ao formulário para continuar editando

### 3️⃣ **Assinar Documento (Sem Internet)**
- No formulário, clique em "Capturar Assinatura"
- Assine na tela
- Clique em "✓ Aceitar"
- PDF é gerado **LOCALMENTE** e armazenado no dispositivo

### 4️⃣ **Sincronizar (Com Internet)**
- Na tela HOME, clique em "🔄 Sincronizar"
- Abre tela com lista de sinistros pendentes
- Clique em "Sincronizar Tudo"
- Sistema envia:
  - ✅ Sinistro completo
  - ✅ Todas as fotos
  - ✅ Assinatura
  - ✅ PDF protegido
- Status de cada um é mostrado em tempo real

---

## 🔐 Segurança & Dados

- **Offline Storage**: SQLite local no dispositivo
- **Password Protection**: PDFs protegidos com placa do veículo
- **Sync Status**: Todos os dados mostram se foram sincronizados
- **Internet Detection**: Aplicativo detecta conexão automaticamente

---

## 🐛 Erros Corrigidos

✅ **Erro 400 ao enviar fotos**
- Causa: Tentava enviar fotos sem sinistro_id salvo no servidor
- Solução: Fotos agora são salvas localmente primeiro

✅ **Obrigação de salvar antes de adicionar fotos**
- Causa: Fluxo exigia POST ao backend
- Solução: Cria rascunho local automaticamente

✅ **Erro Base64 undefined**
- Causa: Encoding string incorreto
- Solução: Usar `FileSystem.EncodingType.Base64`

---

## 📋 Estrutura de Dados (Local)

```
SQLite (dispositivo):
- Sinistros (id, numero_sinistro, dados, status, sincronizado)
- Fotos (id, sinistro_id, uri, base64, descricao, sincronizado)
- Assinatura (base64, timestamp)
- PDF (uri_local)
```

---

## 🔄 Fluxo de Sincronização

1. Usuário clica "🔄 Sincronizar"
2. App carrega sinistros NÃO sincronizados do SQLite
3. Para cada sinistro:
   - Envia dados básicos → Recebe servidor_id
   - Envia fotos → Incrementa contador
   - Envia assinatura (se existir)
   - Marca como sincronizado no local
4. Mostra status de cada um com ✅ ou ❌

---

## 🧪 Como Testar

### Test Case 1: Criar sem Internet
1. Desative internet no dispositivo
2. Crie novo sinistro
3. Adicione fotos
4. Assine
5. Verifique mensagem "Salvo Localmente"

### Test Case 2: Sincronizar após
1. Reconecte à internet
2. Vá para tela "Sincronizar"
3. Clique "Sincronizar Tudo"
4. Veja cada sinistro sendo enviado
5. Após sucesso, lista fica vazia

### Test Case 3: Offline + Fotos + Assinatura
1. Sem internet, crie sinistro completo
2. Com internet, sincronize
3. Verifique no servidor que tudo chegou

---

## 📊 Status Badge (Home)

- 🟢 **● Online** - Internet disponível
- 🔴 **● Offline** - Sem internet (salva localmente)

---

## 🚀 Backend Endpoints (Sincronização)

- `POST /api/sinistros` - Criar sinistro
- `POST /api/sinistros/{id}/fotos` - Enviar fotos
- `POST /api/sinistros/{id}/assinatura` - Enviar assinatura
- `GET /api/sinistros` - Listar sinistros

---

**Versão**: 2.0 Offline-First  
**Data**: Fevereiro 2026
**Status**: ✅ Implementado e Testável
