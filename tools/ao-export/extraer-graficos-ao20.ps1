# Extrae PNG/BMP del archivo Graficos de Argentum 20 (Steam)
# Uso: clic derecho -> "Ejecutar con PowerShell" o:
#   powershell -ExecutionPolicy Bypass -File extraer-graficos-ao20.ps1

$ErrorActionPreference = "Stop"

$SteamGraficos = "C:\Program Files (x86)\Steam\steamapps\common\Argentum 20\Argentum20\Recursos\OUTPUT\Graficos"
$SteamAoBin    = "C:\Program Files (x86)\Steam\steamapps\common\Argentum 20\Argentum20\Recursos\OUTPUT\AO.bin"
$OutDir        = "C:\Users\imaga\Desktop\RecursosAO\Recursos\Graficos_extraido"
$ToolDir       = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExeDir        = Join-Path $ToolDir "compressor\Argentum_Compressor-x86-Release"
$Exe           = Join-Path $ExeDir "argentum_compressor.exe"
$Dll           = Join-Path $ExeDir "diCryptoSys.dll"
$DllUrl        = "https://raw.githubusercontent.com/ao-org/argentum_compressor/main/diCryptoSys.dll"

function Get-AoPasswordFromBin([string]$binPath) {
    $data = [System.IO.File]::ReadAllBytes($binPath)
    if ($data.Length -lt 200) { throw "AO.bin invalido" }
    $pwdLen = $data[198] * 256 + $data[199]
    if ($pwdLen -le 0 -or $pwdLen -gt 80) { throw "Longitud de password rara: $pwdLen" }
    $chars = New-Object System.Text.StringBuilder
    for ($i = 1; $i -le $pwdLen; $i++) {
        $idx = $i * 3 - 2
        [void]$chars.Append([char]($data[$idx] -bxor 37))
    }
    return $chars.ToString()
}

Write-Host "=== Extraer graficos AO 20 ===" -ForegroundColor Cyan

if (-not (Test-Path $SteamGraficos)) {
    Write-Host "ERROR: No existe el archivo Graficos de Steam:" -ForegroundColor Red
    Write-Host "  $SteamGraficos"
    exit 1
}

if (-not (Test-Path $Exe)) {
    Write-Host "ERROR: Falta argentum_compressor.exe en:" -ForegroundColor Red
    Write-Host "  $ExeDir"
    Write-Host "Descarga Argentum_Compressor-x86-Release.zip desde GitHub."
    exit 1
}

if (-not (Test-Path $Dll)) {
    Write-Host "Descargando diCryptoSys.dll (falta en el ZIP)..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $DllUrl -OutFile $Dll -UseBasicParsing
}

$password = Get-AoPasswordFromBin $SteamAoBin
Write-Host "Password leida de AO.bin (no la escribas a mano)." -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Push-Location $ExeDir
try {
    & $Exe extract -i $SteamGraficos -o $OutDir -p $password
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}

$count = (Get-ChildItem $OutDir -File).Count
Write-Host ""
Write-Host "Listo: $count archivos en" -ForegroundColor Green
Write-Host "  $OutDir"
Write-Host ""
Write-Host "Son PNG (y algunos BMP). Para AOWEB podes copiarlos a:"
Write-Host "  C:\Users\imaga\Desktop\AOWEB\public\assets\ao\png"
