<#
  backup_db.ps1  -  Provider-independent PostgreSQL backup.

  Dumps a full copy of your live database to a timestamped file on THIS PC.
  Works for ANY Postgres (Render, Railway, Supabase, ...) - all you need is
  the database connection string (DATABASE_URL).

  USAGE (one-off):
    .\scripts\backup_db.ps1 -DatabaseUrl "postgresql://user:pass@host:port/dbname"

  Or set it once in your session, then just run the script:
    $env:DATABASE_URL = "postgresql://user:pass@host:port/dbname"
    .\scripts\backup_db.ps1

  The .dump file can be restored later with restore_db.ps1.
#>
param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$OutDir      = "$PSScriptRoot\..\backups",
    [int]$KeepDays       = 30          # auto-delete dumps older than this
)

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL is missing. Pass -DatabaseUrl '<connection string>' or set `$env:DATABASE_URL."
    exit 1
}

# Make sure pg_dump is available. Try PATH first, then the standard install
# location (so this works inside Task Scheduler even if PATH isn't refreshed).
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    $bin = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
           Sort-Object FullName -Descending | Select-Object -First 1
    if ($bin) {
        $env:Path = (Split-Path $bin.FullName) + ";" + $env:Path
    } else {
        Write-Error "pg_dump not found. Install PostgreSQL client tools: https://www.postgresql.org/download/windows/"
        exit 1
    }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$file  = Join-Path $OutDir "backup_$stamp.dump"

Write-Host "Backing up database -> $file"
# -Fc = custom compressed format (best for restore). --no-owner keeps it portable.
pg_dump $DatabaseUrl -Fc --no-owner -f $file

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file)) {
    Write-Error "Backup FAILED (pg_dump exit $LASTEXITCODE)."
    exit 1
}

$sizeMB = [math]::Round((Get-Item $file).Length / 1MB, 2)
Write-Host "OK - backup complete: $file  ($sizeMB MB)" -ForegroundColor Green

# Prune old backups.
Get-ChildItem $OutDir -Filter "backup_*.dump" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object { Write-Host "Pruning old backup: $($_.Name)"; Remove-Item $_.FullName -Force }
