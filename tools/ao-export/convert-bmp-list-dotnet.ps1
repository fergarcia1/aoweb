param(
  [Parameter(Mandatory = $true)]
  [string]$IdsFile,
  [Parameter(Mandatory = $true)]
  [string]$BmpDir,
  [Parameter(Mandatory = $true)]
  [string]$OutDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $IdsFile)) {
  throw "No existe archivo de IDs: $IdsFile"
}
if (-not (Test-Path -LiteralPath $BmpDir)) {
  throw "No existe carpeta BMP: $BmpDir"
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

Add-Type -AssemblyName System.Drawing

$ids = Get-Content -LiteralPath $IdsFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -match "^\d+$" } | Sort-Object -Unique
$ok = 0
$missing = 0
foreach ($id in $ids) {
  $src = Join-Path $BmpDir ($id + ".bmp")
  $dst = Join-Path $OutDir ($id + ".png")
  if (-not (Test-Path -LiteralPath $src)) {
    $missing++
    continue
  }
  $img = [System.Drawing.Bitmap]::new($src)
  $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
  $ok++
}

Write-Output ("IDs leidos: {0}" -f $ids.Count)
Write-Output ("PNG exportados: {0}" -f $ok)
Write-Output ("BMP faltantes: {0}" -f $missing)
Write-Output ("Salida: {0}" -f $OutDir)
