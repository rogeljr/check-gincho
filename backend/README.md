# Check Guincho - Backend

Backend da aplicação Check Guincho para gestão de sinistros de guincho.

## 🛠️ Tecnologias

- Node.js
- TypeScript
- Express
- PostgreSQL
- Sequelize (ORM)
- Cloudinary (armazenamento de imagens)
- Mercado Pago (pagamentos)
- JWT (autenticação)
- Nodemailer (envio de emails)

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado OU conta no Railway.app (recomendado)
- Conta no Cloudinary (gratuita)
- Conta no Mercado Pago

## 🚀 Setup Local

### 1. Instalar dependências

```bash
cd backend
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
copy .env.example .env
```

### 3. Configurar PostgreSQL

#### Opção A: PostgreSQL Local

Se você tem PostgreSQL instalado localmente:

1. Crie um banco de dados:
```sql
CREATE DATABASE check_guincho;
```

2. Edite o arquivo `.env`:
```env
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/check_guincho
DB_HOST=localhost
DB_PORT=5432
DB_NAME=check_guincho
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
```

#### Opção B: Railway.app (RECOMENDADO - Gratuito)

1. Acesse https://railway.app
2. Crie uma conta (pode usar GitHub)
3. Clique em "New Project" → "Provision PostgreSQL"
4. Copie a "Database URL" que o Railway fornece
5. Cole no arquivo `.env`:
```env
DATABASE_URL=postgresql://postgres:senha@servidor.railway.app:5432/railway
```

### 4. Configurar Cloudinary

1. Acesse https://cloudinary.com e crie uma conta gratuita
2. No Dashboard, copie:
   - Cloud Name
   - API Key
   - API Secret
3. Cole no arquivo `.env`:
```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
```

### 5. Configurar Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Suas aplicações" → "Criar aplicação"
3. Crie uma aplicação de teste
4. Copie:
   - Access Token
   - Public Key
5. Cole no arquivo `.env`:
```env
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui
```

### 6. Configurar Email (Gmail)

1. Acesse sua conta Gmail
2. Vá em "Gerenciar conta do Google" → "Segurança"
3. Ative "Verificação em duas etapas"
4. Crie uma "Senha de app"
5. Cole no arquivo `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=senha_de_app_aqui
EMAIL_FROM="Check Guincho <seu_email@gmail.com>"
```

### 7. Gerar JWT Secret

No PowerShell, execute:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no `.env`:

```env
JWT_SECRET=resultado_aqui
```

### 8. Criar tabelas do banco de dados

```bash
npm run migrate
```

### 9. Iniciar o servidor

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## 📡 Endpoints da API

### Autenticação

- `POST /api/auth/verificar-empresa` - Verificar se empresa existe
- `POST /api/auth/cadastrar` - Cadastrar nova empresa
- `POST /api/auth/definir-senha` - Definir senha (via email)
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/empresa` - Obter dados da empresa (autenticado)

### Sinistros

- `POST /api/sinistros` - Criar sinistro
- `GET /api/sinistros` - Listar sinistros
- `GET /api/sinistros/:id` - Obter sinistro específico
- `PUT /api/sinistros/:id` - Atualizar sinistro
- `DELETE /api/sinistros/:id` - Cancelar sinistro
- `POST /api/sinistros/:id/fotos` - Adicionar foto
- `DELETE /api/sinistros/:id/fotos/:fotoId` - Remover foto
- `POST /api/sinistros/:id/assinatura` - Adicionar assinatura
- `POST /api/sinistros/:id/finalizar` - Finalizar sinistro

## 🧪 Testar a API

### Usando Postman ou Insomnia

1. **Verificar se API está rodando:**
```
GET http://localhost:3000/api/health
```

2. **Cadastrar empresa:**
```
POST http://localhost:3000/api/auth/cadastrar
Content-Type: application/json

{
  "nome": "Empresa Teste",
  "cnpj": "12.345.678/0001-90",
  "codigo": "empresa-teste",
  "email": "teste@example.com"
}
```

3. **Verificar email** e clicar no link para definir senha

4. **Fazer login:**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "codigo": "empresa-teste",
  "senha": "sua_senha"
}
```

5. **Copiar o token** e usar nas próximas requisições:
```
Authorization: Bearer seu_token_aqui
```

## 📦 Deploy no Railway (Produção)

1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte seu repositório
5. Railway detectará automaticamente que é Node.js
6. Adicione as variáveis de ambiente no painel do Railway
7. Deploy automático!

## 🐛 Troubleshooting

### Erro ao conectar com PostgreSQL

Verifique se:
- PostgreSQL está rodando
- DATABASE_URL está correto
- Firewall não está bloqueando

### Erro ao enviar email

Verifique se:
- Ativou "Verificação em duas etapas" no Gmail
- Criou "Senha de app" (não é a senha normal do Gmail)
- EMAIL_USER e EMAIL_PASSWORD estão corretos

### Erro ao fazer upload de imagens

Verifique se:
- Credenciais do Cloudinary estão corretas
- Imagem está em base64
- Tamanho da imagem não excede 10MB

## 📄 Licença

Todos os direitos reservados - Check Guincho 2026
