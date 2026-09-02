# Setting up a new laptop

This guide takes a brand-new Windows laptop to a working, production-ready installation of the procurement system, running on its own with no cloud services involved. It assumes no prior setup — if something is already installed, skip that step.

Budget about 45–60 minutes for a first-time setup.

## What you're installing

Two independent pieces run on this laptop:

1. **PostgreSQL** — the database. Installed once as a native Windows service; it starts itself every time the laptop boots and just sits in the background.
2. **The procurement app** — a Node.js server. Built once from the source code in this repository; started either manually or automatically (see [Step 10](#step-10-make-it-start-automatically)).

Nothing is containerized on this laptop. Docker was used only during development — it adds real overhead (we measured Docker Desktop's background VM alone using 1–2GB of idle RAM) that a dedicated laptop running one app doesn't need.

---

## Step 1 — Install Node.js

Node.js runs the application itself.

1. Go to **[nodejs.org](https://nodejs.org)**.
2. Download the button labeled **LTS** (not "Current").
3. Run the installer. Accept the defaults. On the "Tools for Native Modules" checkbox screen, leave it **unchecked**.
4. Open a new PowerShell window and verify:
   ```powershell
   node -v
   npm -v
   ```
   You should see version numbers (Node 20 or newer).

## Step 2 — Install Git

Git is how you'll get the code onto this laptop, and how you'll pull future updates.

1. Go to **[git-scm.com/download/win](https://git-scm.com/download/win)** and download the installer.
2. Run it, accepting all the defaults.
3. Verify in a new PowerShell window:
   ```powershell
   git --version
   ```

## Step 3 — Install PostgreSQL

1. Go to **[postgresql.org/download/windows](https://www.postgresql.org/download/windows/)**, click the link to the EnterpriseDB (EDB) installer, and download the latest PostgreSQL 16.x installer.
2. Run it.
3. When asked which components to install, the defaults are fine (PostgreSQL Server, pgAdmin 4, Command Line Tools). You can uncheck Stack Builder at the end — not needed.
4. **When it asks for a superuser (`postgres`) password**, set one and write it down somewhere safe. This is separate from the app's own database password below.
5. Keep the default port, **5432**.
6. Finish the install. PostgreSQL now runs as a Windows service (`postgresql-x64-16`) and starts automatically on boot — nothing further needed for that.

### Create the application's database and user

1. Open **SQL Shell (psql)** from the Start menu (installed alongside PostgreSQL).
2. Press Enter through the prompts (Server, Database, Port, Username) to accept the defaults, then enter the `postgres` superuser password you set above.
3. At the `postgres=#` prompt, run:
   ```sql
   CREATE USER procurement WITH PASSWORD 'choose-a-strong-password-here';
   CREATE DATABASE procurement OWNER procurement;
   ```
4. Type `\q` and press Enter to exit.

Keep that password — it goes into `.env` in Step 6.

## Step 4 — Get the code

1. Open PowerShell.
2. Choose where the app will live, e.g. `C:\Apps`, and clone the repository there:
   ```powershell
   cd C:\Apps
   git clone <the repository URL> procurement-system
   cd procurement-system
   ```

## Step 5 — Install dependencies

```powershell
npm install
npx prisma generate
```

> **Why the second command matters**: on some machines `npm install` doesn't automatically run Prisma's own setup step. If you ever see an error mentioning `Cannot read properties of undefined (reading 'findUnique')` or similar, this is the fix — run `npx prisma generate` again.

## Step 6 — Configure the environment

1. Copy `.env.example` to a new file named `.env` in the same folder.
2. Edit `.env` and set `DATABASE_URL` to the database you created in Step 3:
   ```
   DATABASE_URL="postgresql://procurement:choose-a-strong-password-here@localhost:5432/procurement"
   ```
   (Note: port **5432** here — that's native PostgreSQL's default port. This differs from the developer's machine, which runs Postgres in Docker on port 5434.)

## Step 7 — Create the database tables

```powershell
npx prisma migrate deploy
```

This applies the schema — every table the app needs — to the empty database. It's safe to run again later; it only applies migrations that haven't run yet.

## Step 8 — Create the first account

The database now has tables but no data at all — not even a login. Run:

```powershell
node prisma/bootstrap.mjs "Your Name" you@therestaurant.co.ke "a-strong-password"
```

Replace the three values with the real owner/manager's name, email, and a real password (8+ characters). This creates:
- The standard procurement categories (Vegetables, Alcoholic Beverages, Dry Goods, Cleaning Materials, Packaging Materials, Bakery & Pastry Ingredients, Beverages)
- One **Admin** account with those credentials

Everything else — suppliers, products, prices, other user accounts — gets entered through the app itself once it's running. See [docs/USER_GUIDE.md](USER_GUIDE.md).

> **Do not** run `node prisma/seed.mjs` on this laptop — that script fills the database with fake demo suppliers and orders for trying the app out during development. `bootstrap.mjs` is the one to use for a real installation.

## Step 9 — Build and do a first manual run

```powershell
npm run build
```

This compiles the app for production — a very different thing from development mode, and dramatically lighter: on the developer's machine, the dev server idled at roughly **410MB** of RAM; the production build idled at roughly **90MB**, about a quarter the memory, and started in under a second instead of several. This is the single biggest reason not to run `npm run dev` on this laptop.

Once the build finishes, start it once by hand to confirm everything works:

```powershell
.\start-production.bat
```

Open a browser to **http://localhost:3100** — you should see the login page. Sign in with the account from Step 8. Leave this window open for now; press `Ctrl+C` to stop it once you've confirmed it works, before moving to the next step.

## Step 10 — Make it start automatically

Since this laptop's job is to keep the app running, set it up so it starts on its own — no one should need to open PowerShell day to day.

1. Open **Task Scheduler** (search for it in the Start menu).
2. Click **Create Task…** (not "Create Basic Task" — the full dialog gives more control).
3. **General tab**: name it `Procurement System`. Select **"Run whether user is logged on or not"**. Check **"Run with highest privileges"**.
4. **Triggers tab** → **New…** → Begin the task **"At startup"**. Click OK.
5. **Actions tab** → **New…** → Action **"Start a program"**. Browse to `start-production.bat` inside the app folder (e.g. `C:\Apps\procurement-system\start-production.bat`). Set **"Start in"** to the same folder (`C:\Apps\procurement-system`) — this matters, otherwise the script can't find the app. Click OK.
6. **Conditions tab**: uncheck **"Start the task only if the computer is on AC power"** if this is a laptop that sometimes runs on battery.
7. **Settings tab**: check **"If the task fails, restart every"** and set it to **1 minute**, with a high restart count (e.g. 999) — this way, if the app ever crashes, it comes back on its own within a minute.
8. Click OK. Enter the Windows account password if prompted.

Restart the laptop once to confirm the task runs the app automatically — open a browser to http://localhost:3100 after it boots.

## Step 11 — Let other devices on-site reach it (optional)

By default `start-production.bat` binds to `0.0.0.0`, meaning it's reachable from other devices on the same network, not just this laptop — useful if a second till or a tablet should also see the dashboard.

1. Find this laptop's local IP address: `ipconfig` in PowerShell, look for `IPv4 Address` (something like `192.168.1.42`).
2. On other devices on the same Wi-Fi/network, browse to `http://192.168.1.42:3100` (using the real address).
3. If it doesn't connect, Windows Firewall is likely blocking it. Open **Windows Defender Firewall with Advanced Security** → **Inbound Rules** → **New Rule…** → **Port** → TCP, specific port **3100** → **Allow the connection** → apply to all profiles → name it `Procurement System`.

This address will change if the laptop's IP changes (e.g. after a router reset) — for a fixed address, ask whoever manages the network to reserve this laptop's IP (a "DHCP reservation").

---

## Updating the app later

From time to time there'll be improvements to pull in — a new feature, a fix, whatever's changed on GitHub since this laptop was set up. None of your data (suppliers, products, prices, LPOs) is affected by this — updating only replaces the app's own code, never the database.

Budget about 5 minutes. Do this at a quiet moment, not mid-service, since the app is briefly unavailable while it rebuilds.

1. Open **VS Code**. Open its terminal: menu **Terminal → New Terminal** (or `` Ctrl+` ``).
2. Make sure you're in the app's folder — the prompt should end in `...\procurement-system>`. If not:
   ```powershell
   cd C:\Apps\procurement-system
   ```
3. Pull the latest code:
   ```powershell
   git pull
   ```
   You should see a summary of files changed. If it says `Already up to date.`, there's nothing new — stop here.
4. Reinstall dependencies and rebuild — run each of these one at a time, waiting for each to finish before the next:
   ```powershell
   npm install
   ```
   ```powershell
   npx prisma generate
   ```
   ```powershell
   npx prisma migrate deploy
   ```
   ```powershell
   npm run build
   ```
   The last one (`npm run build`) takes the longest — a minute or two. It's done when you see the prompt return with no red error text.
5. Restart the app so it picks up the new build:
   - **If it's set up to start automatically** (Step 10 above): open **Task Scheduler**, find the **Procurement System** task, right-click it → **End** (this stops the currently-running old version), then right-click → **Run** (starts the new one). Or simplest — just restart the laptop.
   - **If you start it by hand**: close the window running `start-production.bat`, then run it again:
     ```powershell
     .\start-production.bat
     ```
6. Open **http://localhost:3100** in a browser and confirm it loads and you can log in. That's it — you're on the new version.

If anything goes wrong partway through (a red error message you don't understand), stop and don't keep guessing — send the exact error text to whoever maintains this system rather than trying more commands. The [Troubleshooting](#troubleshooting) table below covers the most common ones.

## Backing up the database

The database is the only thing that can't be recovered from GitHub — it's real business data, not code. Back it up regularly:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U procurement -d procurement -F c -f "C:\Backups\procurement-$(Get-Date -Format yyyy-MM-dd).backup"
```

Consider scheduling this as its own Task Scheduler task (e.g. daily, at night) and keeping backups on a USB drive or external location, not just the laptop's own disk.

To restore from a backup onto a fresh install (after Steps 1–7 above, before Step 8):
```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -U procurement -d procurement -c "C:\Backups\procurement-2026-01-01.backup"
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot read properties of undefined (reading 'findUnique')` or similar Prisma error | Run `npx prisma generate`, then restart the app. |
| Port 3100 already in use | Something else is already running on that port. Either stop it, or change `PORT` in `start-production.bat` and re-run `npm run build`. |
| Can't log in / forgot the admin password | Run `node prisma/bootstrap.mjs "Name" existing@email.co.ke "new-password"` again — it updates the password for an existing email rather than failing. |
| App won't start after a Windows update | Open PowerShell in the app folder and run `.\start-production.bat` directly to see the actual error message, rather than relying on the silent scheduled task. |
| Database connection errors | Check the PostgreSQL service is running: `Get-Service postgresql*` in PowerShell should show `Running`. Also double check the password in `.env` matches what you set in Step 3. |
