# =====================================================================
# RMS: start RMS automatically when you sign in to Windows (PROD-1, optional).
#
#   powershell -ExecutionPolicy Bypass -File scripts\windows\autostart-rms.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\windows\autostart-rms.ps1 -Remove
#
# Creates the scheduled task "RMS Server". When this Windows user signs in,
# it waits 2 minutes (time for Docker Desktop and the database to start),
# then opens scripts\windows\start-rms.cmd in a minimised window.
# Closing that window stops RMS; signing in again starts it again.
#
# Docker Desktop must also start at sign-in:
#   Docker Desktop > Settings > General > "Start Docker Desktop when you sign in".
# The database container already restarts by itself (restart: unless-stopped).
# =====================================================================
param(
  [switch]$Remove
)
$ErrorActionPreference = "Stop"
$TaskName = "RMS Server"

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Scheduled task '$TaskName' removed. RMS will no longer start by itself."
  exit 0
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Cmd = Join-Path $Root "scripts\windows\start-rms.cmd"
if (-not (Test-Path $Cmd)) { throw "Not found: $Cmd" }
if (-not (Test-Path (Join-Path $Root ".next\BUILD_ID"))) {
  Write-Warning "RMS is not built yet. Run 'npm run build' before the next sign-in."
}

$User      = "$env:USERDOMAIN\$env:USERNAME"
$Action    = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c start `"RMS Server`" /min `"$Cmd`"" -WorkingDirectory $Root
$Trigger   = New-ScheduledTaskTrigger -AtLogOn -User $User
$Trigger.Delay = "PT2M"
$Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
               -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
$Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings `
  -Principal $Principal -Description "Starts the RMS server (npm start) after sign-in." -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Host "Scheduled task '$TaskName' is ready: starts RMS 2 minutes after '$User' signs in (state: $($t.State))."
Write-Host "Start it now with:  schtasks /Run /TN `"$TaskName`""
Write-Host "Remove it with:     powershell -ExecutionPolicy Bypass -File scripts\windows\autostart-rms.ps1 -Remove"
