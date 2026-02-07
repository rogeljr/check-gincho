# 🔧 Script de Diagnóstico do Backend Check Guincho

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico do Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar IP da máquina
Write-Host "1. IP da sua máquina:" -ForegroundColor Yellow
$ipv4 = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" }).IPAddress
if ($ipv4) {
    Write-Host "   📍 IP: $ipv4" -ForegroundColor Green
} else {
    Write-Host "   ❌ Nenhum IP 192.168.* encontrado!" -ForegroundColor Red
    Write-Host "   Conecte-se a uma rede WiFi local." -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar se o backend está rodando
Write-Host "2. Testando conexão com backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.5:8080" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Backend respondendo!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Cyan
    $content = $response.Content | ConvertFrom-Json
    Write-Host "   Versão: $($content.version)" -ForegroundColor Cyan
    Write-Host "   Mensagem: $($content.message)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Backend NÃO está respondendo!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Rode o backend com:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
}

Write-Host ""

# 3. Testar rota de verificação de empresa
Write-Host "3. Testando rota de verificação de empresa..." -ForegroundColor Yellow
try {
    $body = @{ codigo = "TESTE" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "http://192.168.1.5:8080/api/auth/verificar-empresa" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
    Write-Host "   ✅ Rota funcionando!" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Erro na rota!" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar porta 8080
Write-Host "4. Verificando se a porta 8080 está em uso..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "   ✅ Porta 8080 está em uso (backend rodando)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Porta 8080 NÃO está em uso!" -ForegroundColor Red
    Write-Host "   Inicie o backend primeiro." -ForegroundColor Yellow
}

Write-Host ""

# 5. Verificar firewall
Write-Host "5. Verificando firewall do Windows..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Node*" -or $_.DisplayName -like "*8080*" }
if ($firewallRule) {
    Write-Host "   ✅ Regras de firewall encontradas" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Nenhuma regra específica encontrada" -ForegroundColor Yellow
    Write-Host "   Se houver problemas, libere a porta 8080 no firewall." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Se o backend NÃO está respondendo:" -ForegroundColor White
Write-Host "   → Rode: cd backend; npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Teste do CELULAR (navegador):" -ForegroundColor White
Write-Host "   → Abra: http://192.168.1.5:8080" -ForegroundColor Cyan
Write-Host "   → Deve retornar JSON com 'Check Guincho API'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Se funcionar no navegador mas NÃO no app:" -ForegroundColor White
Write-Host "   → Problema pode ser CORS ou Android Network Security" -ForegroundColor Cyan
Write-Host "   → Verifique os logs do backend ao testar no app" -ForegroundColor Cyan
Write-Host ""
