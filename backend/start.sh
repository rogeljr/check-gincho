#!/bin/bash
# Script para executar migrações e iniciar o app

cd /app

# Executar migrations
echo "🔄 Executando migrações..."
node database/run-migration.js || true

# Iniciar o app
echo "🚀 Iniciando aplicação..."
npm run start
