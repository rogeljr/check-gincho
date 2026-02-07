# 🚀 Script para Rebuildar o APK do Check Guincho
# Certifique-se de que o IP está correto em config/api.ts antes de executar

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Check Guincho - Rebuild APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se EAS CLI está instalado
Write-Host "1. Verificando EAS CLI..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-not $easInstalled) {
    Write-Host "   ❌ EAS CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g eas-cli
} else {
    Write-Host "   ✅ EAS CLI instalado" -ForegroundColor Green
}

# Verificar IP atual
Write-Host ""
Write-Host "2. Verificando IP da máquina..." -ForegroundColor Yellow
$ipv4 = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" }).IPAddress
Write-Host "   📍 IP detectado: $ipv4" -ForegroundColor Cyan

# Ler o IP configurado em config/api.ts
$apiConfig = Get-Content "config\api.ts" -Raw
if ($apiConfig -match "http://(\d+\.\d+\.\d+\.\d+):") {
    $configuredIP = $matches[1]
    Write-Host "   📝 IP configurado: $configuredIP" -ForegroundColor Cyan
    
    if ($ipv4 -ne $configuredIP) {
        Write-Host ""
        Write-Host "   ⚠️  ATENÇÃO: IP divergente!" -ForegroundColor Red
        Write-Host "   O IP do seu computador mudou. Atualize config/api.ts" -ForegroundColor Red
        Write-Host "   IP Atual:      $ipv4" -ForegroundColor Yellow
        Write-Host "   IP Configurado: $configuredIP" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "   Deseja continuar mesmo assim? (s/n)"
        if ($continue -ne "s") {
            Write-Host "   Build cancelado." -ForegroundColor Yellow
            exit
        }
    } else {
        Write-Host "   ✅ IP configurado está correto" -ForegroundColor Green
    }
}

# Login no EAS
Write-Host ""
Write-Host "3. Fazendo login no EAS Build..." -ForegroundColor Yellow
eas login

# Gerar APK
Write-Host ""
Write-Host "4. Iniciando build do APK..." -ForegroundColor Yellow
Write-Host "   (Isso pode levar 10-15 minutos)" -ForegroundColor Cyan
Write-Host ""

eas build --platform android --profile preview

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Build concluído!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Baixe o APK em: https://expo.dev/builds" -ForegroundColor White
Write-Host "2. Desinstale o app antigo do celular" -ForegroundColor White
Write-Host "3. Instale o novo APK" -ForegroundColor White
Write-Host "4. Rode o backend: cd backend; npm run dev" -ForegroundColor White
Write-Host ""
