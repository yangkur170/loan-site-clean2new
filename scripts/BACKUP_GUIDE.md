# Database Backup Guide — never lose live data again

Your live data lives inside a hosted Postgres. If the host suspends/bans the
account, that data is locked away. The fix is simple: **keep your own copy.**
These scripts download a full database backup to THIS PC (and you can copy it to
Google Drive / a USB / Cloudinary for a second copy).

---

## 0. One-time setup — install PostgreSQL client tools

The scripts need `pg_dump` / `pg_restore`. They are NOT installed yet.

1. Download the installer: https://www.postgresql.org/download/windows/
2. During install you only need **"Command Line Tools"** (you don't need the server).
3. Close and reopen your terminal, then verify:
   ```powershell
   pg_dump --version
   ```

---

## 1. Get your database connection string (DATABASE_URL)

A backup just needs the connection string. Where to find it:

- **Render:**  Dashboard → your Postgres → **"Connections"** → copy
  **"External Database URL"** (looks like `postgresql://user:pass@host/dbname`).
- **Railway (non-banned projects):**  open the project → Postgres service →
  **"Variables"** or **"Connect"** tab → copy `DATABASE_URL` (use the **public**
  one). Or via CLI: `railway login` → `railway link` → `railway variables`.

> Treat this string like a password. Never commit it to git.

---

## 2. Make a backup NOW

```powershell
cd c:\site_clean2
.\scripts\backup_db.ps1 -DatabaseUrl "postgresql://USER:PASS@HOST:PORT/DBNAME"
```

Result: a file like `backups\backup_2026-06-26_120000.dump`.
That file is your safety net — copy it to Google Drive / USB too.

---

## 3. Automate it (daily backup, Windows Task Scheduler)

So you never have to remember:

1. Open **Task Scheduler** → **Create Basic Task** → name it "DB Backup".
2. Trigger: **Daily** (e.g. 2:00 AM).
3. Action: **Start a program**
   - Program/script: `powershell.exe`
   - Add arguments:
     ```
     -ExecutionPolicy Bypass -File "c:\site_clean2\scripts\backup_db.ps1" -DatabaseUrl "postgresql://USER:PASS@HOST:PORT/DBNAME"
     ```
4. Finish. Backups now run every day and old ones (>30 days) auto-delete.

---

## 4. Restore a backup into a new database

When moving to Render (or recovering), restore into the TARGET Postgres:

```powershell
.\scripts\restore_db.ps1 -DumpFile ".\backups\backup_2026-06-26_120000.dump" `
                         -DatabaseUrl "postgresql://USER:PASS@RENDER-HOST/DBNAME"
```

---

## 5. IMPORTANT — back up your OTHER Railway projects today

Your other Railway accounts still work. Do this **before** anything happens to them:

```powershell
# For each project: grab its DATABASE_URL (step 1) then:
.\scripts\backup_db.ps1 -DatabaseUrl "postgresql://...project A..."
.\scripts\backup_db.ps1 -DatabaseUrl "postgresql://...project B..."
```

Store the `.dump` files somewhere safe. Now a ban/outage can never trap that data.

---

## 6. Render Postgres — avoid the same trap

- **Do NOT run production on Render's FREE Postgres** — free databases are
  **deleted after 30 days**. Use at least the paid **Basic** plan for live data.
- Render paid Postgres includes daily backups + point-in-time recovery, but keep
  your own `pg_dump` copies too (rule: never trust a single provider).
