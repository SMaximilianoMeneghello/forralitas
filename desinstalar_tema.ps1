$ErrorActionPreference = "Stop"
$indexPath = Join-Path (Get-Location) "index.html"

if (!(Test-Path $indexPath)) {
    Write-Host "ERROR: Ejecuta este script desde la carpeta raiz de FORRALITAS." -ForegroundColor Red
    exit 1
}

$link = '<link rel="stylesheet" href="./src/css/forralitas-modern.css">'
$content = Get-Content $indexPath -Raw
$content = $content.Replace("$link`r`n", "").Replace("$link`n", "").Replace($link, "")
Set-Content -Path $indexPath -Value $content -Encoding UTF8
Write-Host "Tema desactivado. El CSS queda guardado pero ya no se carga." -ForegroundColor Green
