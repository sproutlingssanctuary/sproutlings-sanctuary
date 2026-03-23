# ☀️ Sunshine Daycare — Check-In System

A full-stack daycare kiosk app with React frontend + Node.js/Express backend + SQLite database.

---

## Features

- **Kiosk Mode** — Large touch-friendly UI for parents to check children in/out
- **PIN Security** — Optional per-child PIN for check-in/out
- **Child Profiles** — Name, age, parents, emergency contacts, medical notes
- **Daily Logs** — Staff notes: incidents, injuries, meals, naps, behavior
- **Dashboard** — Live attendance view (who's in, who's out, not arrived)
- **History** — Full attendance history with filters
- **CSV Export** — Download attendance reports
- **Staff Accounts** — Admin + Staff roles, JWT-secured API
- **SQLite Database** — Zero-config, file-based, no separate DB server needed

---

## Quick Start

### 1. Install dependencies
```bash
cd daycare-app
npm install
```

### 2. Start both servers (frontend + backend)
```bash
npm start
```

This runs:
- **Frontend** at http://localhost:5173
- **Backend API** at http://localhost:3001

### 3. Open the app
Visit **http://localhost:5173** in your browser or tablet.

---

## Default Login

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `admin1234` |

**Change the default password after first login** by deleting the old account and creating a new one in the Staff tab.

---

## Project Structure

```
daycare-app/
├── server/
│   └── index.js          # Express + SQLite backend (port 3001)
├── src/
│   ├── App.jsx            # Root — switches between Kiosk and Admin views
│   ├── main.jsx           # React entry point
│   ├── index.css          # Global styles + CSS variables
│   ├── utils/
│   │   └── api.js         # All API calls (fetch wrappers)
│   └── components/
│       ├── UI.jsx          # Shared: Avatar, Button, Modal, PinPad, etc.
│       ├── KioskView.jsx   # Parent-facing check-in/out screen
│       ├── AdminView.jsx   # Staff login shell + tab nav
│       ├── Dashboard.jsx   # Live attendance overview
│       ├── ChildrenManager.jsx  # Add/edit/remove child profiles
│       ├── DailyLogs.jsx   # Staff daily log entries
│       ├── AttendanceHistory.jsx # History table + CSV export
│       └── StaffManager.jsx # Admin: manage staff accounts
├── index.html             # Vite entry HTML
├── vite.config.js         # Vite config (proxies /api → :3001)
└── package.json
```

---

## Environment Variables

Create a `.env` file in the project root (optional):

```
PORT=3001
JWT_SECRET=your_very_long_random_secret_here
DB_PATH=./server/daycare.db
NODE_ENV=production
```

---

## Production Deployment

### Build the frontend
```bash
npm run build
```
This creates a `dist/` folder.

### Run in production
```bash
NODE_ENV=production node server/index.js
```
The Express server will serve the built React app at port 3001.

### Deploy to a VPS (e.g. Ubuntu + nginx)

1. Copy project to server
2. `npm install && npm run build`
3. Create a systemd service:

```ini
# /etc/systemd/system/daycare.service
[Unit]
Description=Sunshine Daycare App
After=network.target

[Service]
WorkingDirectory=/var/www/daycare-app
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=production
Environment=JWT_SECRET=your_secret_here

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable daycare
sudo systemctl start daycare
```

4. Set up nginx reverse proxy to port 3001.

### Deploy to Railway / Render / Fly.io

- Set `NODE_ENV=production`, `JWT_SECRET`, and `DB_PATH` environment variables
- Build command: `npm install && npm run build`
- Start command: `node server/index.js`

> **Note:** SQLite stores data in a single file. On platforms with ephemeral filesystems (Heroku free tier, some Railway plans), use a persistent volume or switch to PostgreSQL/Supabase.

---

## Kiosk Mode Tips

- Open in Chrome and press **F11** for full-screen kiosk mode
- On iPad: use **Guided Access** (Settings → Accessibility → Guided Access) to lock to one app
- On Android tablet: use **Screen Pinning** (Settings → Security)
- The kiosk view has no admin controls — parents can only check in/out

---

## Security Notes

- Admin panel requires username + password (JWT auth, 12h expiry)
- Kiosk view only exposes: child names, ages, initials, colors, and PIN (for verification)
- Sensitive fields (parents, emergency contacts, notes) are only returned to authenticated staff
- Change `JWT_SECRET` to a long random string in production
- Use HTTPS in production (nginx + Let's Encrypt)

---

## Database

SQLite file is created at `server/daycare.db` on first run. Back it up regularly:

```bash
cp server/daycare.db server/daycare.db.backup
```

To reset all data (keep structure):
```bash
rm server/daycare.db && node server/index.js
```
