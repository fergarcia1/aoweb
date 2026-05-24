param(
  [string]$NpcDat = "C:\Users\imaga\Desktop\AOWEB\tools\imperium-clasico-ref\Server\Dat\NPCs.dat",
  [string]$BmpDir = "C:\Users\imaga\Desktop\AOWEB\tools\imperium-clasico-ref\Cliente\Recursos\Graficos",
  [string]$OutDir = "C:\Users\imaga\Desktop\AOWEB\public\assets\ao\imperium\mobs"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $NpcDat)) {
  throw "No existe NPCs.dat: $NpcDat"
}
if (-not (Test-Path -LiteralPath $BmpDir)) {
  throw "No existe carpeta de BMP: $BmpDir"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$lines = Get-Content -LiteralPath $NpcDat
$inCriaturas = $false
$currentNpc = $null
$mobs = New-Object System.Collections.Generic.List[object]

function Flush-Npc {
  param([hashtable]$npc)
  if ($null -eq $npc) { return }
  if (-not $npc.ContainsKey("Body")) { return }
  if (-not $npc.ContainsKey("Name")) { return }
  if (-not $npc.ContainsKey("Attackable")) { return }

  $attackable = [string]$npc["Attackable"]
  $body = 0
  if (-not ([string]$npc["Body"] -match "^\s*(\d+)")) { return }
  $body = [int]$Matches[1]
  if ($body -le 0) { return }

  # Criterio:
  # - todos los de la seccion "Criaturas" atacables
  # - y adicionalmente atacables con exp > 0 y sin NpcType especial
  $isCreatureBySection = $npc.ContainsKey("__inCriaturas") -and [bool]$npc["__inCriaturas"]
  $exp = 0
  if ($npc.ContainsKey("GiveEXP")) {
    $expRaw = [string]$npc["GiveEXP"]
    if ($expRaw -match "^\s*(\d+)") {
      $exp = [int]$Matches[1]
    }
  }
  $npcType = ""
  if ($npc.ContainsKey("NpcType")) {
    $npcType = [string]$npc["NpcType"]
  }
  $isMobLike = $isCreatureBySection -or (($exp -gt 0) -and ($npcType -eq "" -or $npcType -eq "0"))
  if ($attackable -ne "1" -or -not $isMobLike) { return }

  $mobs.Add([pscustomobject]@{
    NpcId = [string]$npc["NpcId"]
    Name = [string]$npc["Name"]
    Body = $body
    Attackable = $attackable
    GiveEXP = $exp
    InCriaturas = $isCreatureBySection
  }) | Out-Null
}

foreach ($lineRaw in $lines) {
  $line = $lineRaw.Trim()

  if ($line -match "^'\-+>\s*Criaturas\s*<\-+") {
    $inCriaturas = $true
    continue
  }
  if ($inCriaturas -and $line -match "^'\*{6,}") {
    $inCriaturas = $false
  }

  if ($line -match "^\[NPC(\d+)\]") {
    Flush-Npc -npc $currentNpc
    $currentNpc = @{}
    $currentNpc["NpcId"] = $Matches[1]
    $currentNpc["__inCriaturas"] = $inCriaturas
    continue
  }

  if ($null -eq $currentNpc) { continue }
  if ($line -match "^([A-Za-z0-9_]+)\s*=\s*(.*)$") {
    $key = $Matches[1]
    $val = $Matches[2]
    $currentNpc[$key] = $val
  }
}
Flush-Npc -npc $currentNpc

$uniqueBodies = $mobs | Select-Object -ExpandProperty Body -Unique | Sort-Object

Add-Type -AssemblyName System.Drawing

$copied = 0
$missing = New-Object System.Collections.Generic.List[int]
foreach ($body in $uniqueBodies) {
  $src = Join-Path $BmpDir ("{0}.bmp" -f $body)
  $dst = Join-Path $OutDir ("{0}.png" -f $body)
  if (Test-Path -LiteralPath $src) {
    $img = [System.Drawing.Bitmap]::new($src)
    $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    $copied++
  } else {
    $missing.Add($body) | Out-Null
  }
}

$manifest = Join-Path $OutDir "mobs_manifest.csv"
$mobs | Sort-Object Body, Name, NpcId | Export-Csv -Path $manifest -NoTypeInformation -Encoding UTF8

$missingFile = Join-Path $OutDir "missing_bodies.txt"
if ($missing.Count -gt 0) {
  ($missing | Sort-Object | ForEach-Object { $_.ToString() }) | Set-Content -Path $missingFile -Encoding UTF8
} else {
  "none" | Set-Content -Path $missingFile -Encoding UTF8
}

Write-Output ("Mobs detectados (NPC): {0}" -f $mobs.Count)
Write-Output ("Bodies unicos: {0}" -f $uniqueBodies.Count)
Write-Output ("PNG exportados: {0}" -f $copied)
Write-Output ("Bodies faltantes: {0}" -f $missing.Count)
Write-Output ("Salida: {0}" -f $OutDir)
