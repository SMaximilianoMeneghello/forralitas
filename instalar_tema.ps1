$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cssSource = Join-Path $root "src\css\forralitas-modern.css"
$indexPath = Join-Path (Get-Location) "index.html"
$cssTargetDir = Join-Path (Get-Location) "src\css"
$cssTarget = Join-Path $cssTargetDir "forralitas-modern.css"

if (!(Test-Path $indexPath)) {
    Write-Host "ERROR: Ejecuta este script desde la carpeta raiz de FORRALITAS, donde esta index.html." -ForegroundColor Red
    exit 1
}

if (!(Test-Path $cssSource)) {
    Write-Host "ERROR: No se encontro el CSS del tema." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $cssTargetDir | Out-Null
Copy-Item $cssSource $cssTarget -Force

$backup = "$indexPath.backup-antes-modern-ui"
if (!(Test-Path $backup)) {
    Copy-Item $indexPath $backup
}

$content = Get-Content $indexPath -Raw
$link = '<link rel="stylesheet" href="./src/css/forralitas-modern.css">'

if ($content -notmatch [regex]::Escape($link)) {
    $loginLink = '<link rel="stylesheet" href="./src/css/login.css">'
    if ($content -match [regex]::Escape($loginLink)) {
        $content = $content.Replace($loginLink, "$loginLink`r`n$link")
    } else {
        $content = $content.Replace('</head>', "    $link`r`n</head>")
    }
    Set-Content -Path $indexPath -Value $content -Encoding UTF8
}

Write-Host "Tema FORRALITAS Modern UI instalado correctamente." -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor DarkGray
