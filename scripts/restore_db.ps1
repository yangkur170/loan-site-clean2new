<#
  restore_db.ps1  -  Restore a .dump file into a PostgreSQL database.

  USAGE:
    .\scripts\restore_db.ps1 -DumpFile ".\backups\backup_2026-06-26_120000.dump" `
                             -DatabaseUrl "postgresql://user:pass@host:port/dbname"

  WARNING: --clean drops existing objects first. Point -DatabaseUrl at the
  TARGET database (e.g. your new Render Postgres), not your source.
#>
param(
    [Parameter(Mandatory = $true)][string]$DumpFile,
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL is missing. Pass -DatabaseUrl '<target connection string>'."
    exit 1
}
if (-not (Test-Path $DumpFile)) {
    Write-Error "Dump file not found: $DumpFile"
    exit 1
}
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Error "pg_restore not found. Install PostgreSQL client tools first."
    exit 1
}

Write-Host "Restoring $DumpFile -> target database ..." -ForegroundColor Yellow
pg_restore --no-owner --clean --if-exists --no-acl -d $DatabaseUrl $DumpFile

if ($LASTEXITCODE -ne 0) {
    Write-Warning "pg_restore finished with exit code $LASTEXITCODE (some 'does not exist' notices are normal on a fresh DB)."
} else {
    Write-Host "OK - restore complete." -ForegroundColor Green
}
