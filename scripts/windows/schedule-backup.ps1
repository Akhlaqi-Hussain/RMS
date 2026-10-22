# =====================================================================
# RMS: create (or update) the Windows scheduled task "RMS Backup".
#
#   powershell -ExecutionPolicy Bypass -File scripts\windows\schedule-backup.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\windows\schedule-backup.ps1 -Time 22:00
#   powershell -ExecutionPolicy Bypass -File scripts\windows\schedule-backup.ps1 -Remove
#
# Runs "node scripts\backup.mjs --auto" every day at -Time (default 23:30).
# - The first backup of a month is kept as "monthly", the first of a week
#   (Saturday) as "weekly", the rest as "daily" (see scripts\backup-lib.mjs).
# - If the PC was off at that time, it runs as soon as possible afterwards.
# - If Docker is not ready yet, it tries again 3 times, 10 minutes apart.
# It runs as the current Windows user, only while that user is logged in
# (Docker Desktop needs a logged-in user).
# =====================================================================
param(
  [string]$Time = "23:30",
  [switch]$Remove
)
$ErrorActionPreference = "Stop"
$TaskName = "RMS Backup"

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Scheduled task '$TaskName' removed (existing backups are kept)."
  exit 0
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Node = (Get-Command node -ErrorAction Stop).Source
$Script = Join-Path $Root "scripts\backup.mjs"
if (-not (Test-Path $Script)) { throw "Not found: $Script" }

$Action   = New-ScheduledTaskAction -Execute $Node -Argument "`"$Script`" --auto" -WorkingDirectory $Root
$Trigger  = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
              -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
              -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings `
  -Principal $Principal -Description "RMS database + menu pictures backup (daily/weekly/monthly)." -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Host "Scheduled task '$TaskName' is ready: every day at $Time (state: $($t.State))."
Write-Host "Program : $Node `"$Script`" --auto"
Write-Host "Folder  : $Root"
Write-Host "Test it now with:  schtasks /Run /TN `"$TaskName`""
