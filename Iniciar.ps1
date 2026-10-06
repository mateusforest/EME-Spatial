$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$spatialNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $spatialNode) {
  $spatialNode = 'C:\Users\EME\Documents\Codex\MSelect-web47-local\runtime\node-v22.16.0-win-x64\node.exe'
}
if (-not (Test-Path -LiteralPath $spatialNode)) { throw 'Instale o Node.js 18 ou superior para iniciar o site.' }
Write-Host 'EME Spatial: http://127.0.0.1:4195'
& $spatialNode node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4195
