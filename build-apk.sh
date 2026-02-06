#!/bin/bash

echo "🚀 Check Guincho - Build APK"
echo "================================"
echo ""

# Verificar se está na pasta certa
if [ ! -f "app.json" ]; then
  echo "❌ Erro: app.json não encontrado. Execute este script na raiz do projeto."
  exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo ""
echo "🔨 Compilando aplicativo..."
echo ""

# Executar build do EAS localmente (requer Docker)
# Se não tiver Docker, será feito no servidor do EAS (gratuito)
eas build --platform android --profile preview

echo ""
echo "✅ Build concluído!"
echo ""
echo "📥 APK disponível no dashboard: https://expo.dev/builds"
echo ""
echo "Para instalar no celular:"
echo "1. Baixe o APK do dashboard"
echo "2. Transfira para o celular"
echo "3. Abra o arquivo APK para instalar"
