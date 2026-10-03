# RT/RW-SID CONNECT v2.0.1 — Windows Manual Acceptance Assistant
# Safety: this script records observations; it never converts missing evidence into PASS.
# Baseline: exact RC artifact from GitHub Actions Run #61 / commit c52cbf49fd42b99fb22cdd01ccd637ce1ef43988.
param(
  [Parameter(Mandatory=$false)][string]$InstallerPath,
  [Parameter(Mandatory=$false)][string]$EvidenceRoot = "$env:USERPROFILE\Desktop\RT-RW-SID-v2.0.1-acceptance",
  [Parameter(Mandatory=$false)][string]$ExpectedInstallerSha256 = "f0c1372c82ad9b5e97da8cca94b59f301e79c60c7cba24baecbc69d55de6ea67"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

function Stamp { return (Get-Date).ToString("o") }
function Ask-Gate([string]$Id,[string]$Action) {
  Write-Host ""
  Write-Host "[$Id] $Action" -ForegroundColor Cyan
  $result = Read-Host "Result (PASS/FAIL/SKIP)"
  $note = Read-Host "Evidence note/path"
  [pscustomobject]@{ gate=$Id; result=$result.ToUpper(); timestamp=(Stamp); evidence=$note }
}

if (-not $InstallerPath) {
  $InstallerPath = Read-Host "Full path to the exact Run #61 installer EXE (RT-RW-SID-CONNECT-v2.0-Setup-2.0.1.exe)"
}
if (-not (Test-Path $InstallerPath)) { throw "Installer not found: $InstallerPath" }

$hash = (Get-FileHash $InstallerPath -Algorithm SHA256).Hash.ToLower()
if ($hash -ne $ExpectedInstallerSha256.ToLower()) {
  throw "Installer SHA-256 mismatch. Expected Run #61 RC $ExpectedInstallerSha256 but found $hash. Do not continue acceptance with a different build."
}

$os = Get-CimInstance Win32_OperatingSystem
$identity = [pscustomobject]@{
  tester = $env:USERNAME
  computer = $env:COMPUTERNAME
  windows = "$($os.Caption) $($os.Version) build $($os.BuildNumber)"
  timestamp = (Stamp)
  installer = (Resolve-Path $InstallerPath).Path
  installer_baseline = "Run #61 / c52cbf49fd42b99fb22cdd01ccd637ce1ef43988"
  sha256 = $hash
  evidence_root = (Resolve-Path $EvidenceRoot).Path
}
$identity | ConvertTo-Json -Depth 5 | Set-Content "$EvidenceRoot\test-identity.json" -Encoding UTF8

Write-Host ""
Write-Host "=== RT/RW-SID CONNECT v2.0.1 MANUAL ACCEPTANCE ===" -ForegroundColor Green
Write-Host "Baseline: Run #61 / c52cbf49fd42b99fb22cdd01ccd637ce1ef43988"
Write-Host "Installer SHA-256: $hash"
Write-Host "Evidence root: $EvidenceRoot"
Write-Host "Use disposable test data only. Do not use community production data."
Write-Host "This assistant does not publish, merge, or unlock the release."

$results = @()
$results += Ask-Gate "A3" "Disconnect network. Launch/use the installed offline shell/runtime and verify required local dependencies are available."
$results += Ask-Gate "A4" "Verify the required offline shell/package payload is available locally without network access."
$results += Ask-Gate "A6" "Create/update one representative local test record; verify persistence."
$results += Ask-Gate "A7" "While offline, perform the operation and verify a pending queue item."
$results += Ask-Gate "A8" "Close and restart the application while still offline."
$results += Ask-Gate "A9" "Verify the same pending queue item remains after restart."
$results += Ask-Gate "A10" "Restore connectivity and verify the configured online path is reachable."
$results += Ask-Gate "A11" "Observe/trigger sync or replay of the same queue item and record the resulting state."
$results += Ask-Gate "A13" "Uninstall via Windows Apps/Programs; verify application binaries are removed."
$results += Ask-Gate "A14" "Inspect user-data location and record observed retention behavior."
$results += Ask-Gate "A15" "Reinstall the exact same Run #61 RC installer and verify launch."
$results += Ask-Gate "A16" "Use a fresh Windows/user/application profile and verify clean first-run state."

$record = [pscustomobject]@{
  run = "Windows Manual Acceptance"
  baseline = @{
    workflow_run = 61
    commit = "c52cbf49fd42b99fb22cdd01ccd637ce1ef43988"
    installer = "RT-RW-SID-CONNECT-v2.0-Setup-2.0.1.exe"
    sha256 = $ExpectedInstallerSha256.ToLower()
  }
  created_at = (Stamp)
  identity = $identity
  gates = $results
  release_decision = "LOCKED_UNTIL_ALL_REQUIRED_GATES_HAVE_TRACEABLE_PASS_EVIDENCE"
}
$record | ConvertTo-Json -Depth 10 | Set-Content "$EvidenceRoot\windows-manual-acceptance-record.json" -Encoding UTF8

Write-Host ""
Write-Host "Acceptance record written to:" -ForegroundColor Green
Write-Host "$EvidenceRoot\windows-manual-acceptance-record.json"
Write-Host "Release remains LOCKED until all required gates have traceable PASS evidence."
