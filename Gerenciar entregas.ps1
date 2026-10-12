$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $runtime)) { $runtime = (Get-Command node -ErrorAction Stop).Source }
$taskPort = Get-NetTCPConnection -LocalPort 4197 -State Listen -ErrorAction SilentlyContinue
if (-not $taskPort) {
    Start-Process -FilePath $runtime -ArgumentList @('--use-system-ca', '--experimental-strip-types', 'tools/manage-deliveries.mjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Start-Process 'http://127.0.0.1:4197'
