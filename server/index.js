/**
 * Sproutlings Sanctuary – Express + sql.js Backend
 * Uses sql.js (pure JavaScript SQLite) — no native compilation needed.
 * Run: node server/index.js  |  Port: 3001
 */

const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const initSqlJs  = require('sql.js');

const app        = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sproutlings_sanctuary_secret_change_in_production';
const DB_PATH    = process.env.DB_PATH || path.join(__dirname, 'daycare.db');

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '5mb' }));

let db;

function saveToDisk() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  const row = dbGet('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: row ? row.id : null };
}

async function initDb() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, age INTEGER, initials TEXT,
      color TEXT DEFAULT '#4A90D9', parents TEXT,
      emergency_contact TEXT, notes TEXT, pin TEXT, photo TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL, date TEXT NOT NULL,
      check_in INTEGER, check_out INTEGER, who TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL, date TEXT NOT NULL,
      type TEXT NOT NULL, note TEXT, created_by TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  if (!dbGet('SELECT id FROM staff LIMIT 1')) {
    dbRun(`INSERT INTO staff (username,password_hash,role) VALUES (?,?,'admin')`,
      ['admin', bcrypt.hashSync('admin1234', 10)]);
    console.log('🔑 Default admin: admin / admin1234');
  }

  if (!dbGet('SELECT id FROM children LIMIT 1')) {
    [
      ['Emma Johnson',   4,'EJ','#FF6B6B','Sarah & Tom Johnson',  'Sarah Johnson – 555-0101','Peanut allergy. EpiPen in office.','4321'],
      ['Liam Chen',      3,'LC','#4A90D9','Wei & Lily Chen',       'Wei Chen – 555-0202',     'Lactose intolerant.','5678'],
      ['Sofia Martinez', 5,'SM','#9B8EC4','Carlos & Ana Martinez', 'Ana Martinez – 555-0303', '',''],
      ['Noah Williams',  4,'NW','#5BAD5B','James & Linda Williams','Linda Williams – 555-0404','Asthma inhaler in bag.','2222'],
      ['Aisha Patel',    3,'AP','#FFB800','Raj & Priya Patel',     'Priya Patel – 555-0505',  '',''],
    ].forEach(r => dbRun(
      `INSERT INTO children (name,age,initials,color,parents,emergency_contact,notes,pin) VALUES (?,?,?,?,?,?,?,?)`, r
    ));
    console.log('👶 Sample children added.');
  }

  saveToDisk();
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const s = dbGet('SELECT * FROM staff WHERE username=?', [username]);
  if (!s || !bcrypt.compareSync(password, s.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: s.id, username: s.username, role: s.role }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: s.id, username: s.username, role: s.role } });
});

// Children
app.get('/api/children', (_req, res) =>
  res.json(dbAll('SELECT id,name,age,initials,color,pin FROM children WHERE active=1')));

app.get('/api/children/full', auth, (_req, res) =>
  res.json(dbAll('SELECT * FROM children WHERE active=1')));

app.post('/api/children', auth, (req, res) => {
  const { name, age, initials, color, parents, emergency_contact, notes, pin, photo } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const ini = initials || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  const r = dbRun(
    `INSERT INTO children (name,age,initials,color,parents,emergency_contact,notes,pin,photo) VALUES (?,?,?,?,?,?,?,?,?)`,
    [name, age||null, ini, color||'#4A90D9', parents||'', emergency_contact||'', notes||'', pin||'', photo||null]
  );
  saveToDisk(); res.json({ id: r.lastInsertRowid });
});

app.put('/api/children/:id', auth, (req, res) => {
  const { name, age, initials, color, parents, emergency_contact, notes, pin, photo } = req.body;
  dbRun(
    `UPDATE children SET name=?,age=?,initials=?,color=?,parents=?,emergency_contact=?,notes=?,pin=?,photo=? WHERE id=?`,
    [name, age||null, initials, color, parents||'', emergency_contact||'', notes||'', pin||'', photo||null, req.params.id]
  );
  saveToDisk(); res.json({ ok: true });
});

app.delete('/api/children/:id', auth, adminOnly, (req, res) => {
  dbRun('UPDATE children SET active=0 WHERE id=?', [req.params.id]);
  saveToDisk(); res.json({ ok: true });
});

// PIN verify
app.post('/api/kiosk/verify-pin', (req, res) => {
  const { childId, pin } = req.body;
  const c = dbGet('SELECT pin FROM children WHERE id=?', [childId]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ valid: !c.pin || c.pin === pin });
});

// Attendance
app.post('/api/attendance/checkin', (req, res) => {
  const { childId, who } = req.body;
  const today = new Date().toISOString().slice(0,10);
  const now   = Date.now();
  const r = dbRun(`INSERT INTO attendance (child_id,date,check_in,who) VALUES (?,?,?,?)`,
    [childId, today, now, who||'']);
  saveToDisk(); res.json({ id: r.lastInsertRowid, checkIn: now });
});

app.post('/api/attendance/checkout', (req, res) => {
  const { childId, who } = req.body;
  const today = new Date().toISOString().slice(0,10);
  const now   = Date.now();
  const open  = dbGet(
    `SELECT id FROM attendance WHERE child_id=? AND date=? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1`,
    [childId, today]
  );
  if (!open) return res.status(400).json({ error: 'No open check-in' });
  dbRun(`UPDATE attendance SET check_out=?,who=? WHERE id=?`, [now, who||'', open.id]);
  saveToDisk(); res.json({ ok: true, checkOut: now });
});

app.get('/api/attendance/today', (_req, res) => {
  const today = new Date().toISOString().slice(0,10);
  res.json(dbAll(
    `SELECT a.*,c.name,c.initials,c.color,c.age FROM attendance a
     JOIN children c ON a.child_id=c.id WHERE a.date=? ORDER BY a.check_in DESC`, [today]
  ));
});

app.get('/api/attendance/history', auth, (req, res) => {
  const { child_id, date_from, date_to, limit=200 } = req.query;
  let q = `SELECT a.*,c.name,c.initials,c.color FROM attendance a JOIN children c ON a.child_id=c.id WHERE 1=1`;
  const p = [];
  if (child_id)  { q += ' AND a.child_id=?'; p.push(child_id); }
  if (date_from) { q += ' AND a.date>=?';    p.push(date_from); }
  if (date_to)   { q += ' AND a.date<=?';    p.push(date_to); }
  q += ` ORDER BY a.date DESC,a.check_in DESC LIMIT ?`; p.push(Number(limit));
  res.json(dbAll(q, p));
});

// Daily logs
app.get('/api/logs', auth, (req, res) => {
  const { date, child_id } = req.query;
  let q = `SELECT l.*,c.name,c.initials,c.color FROM daily_logs l JOIN children c ON l.child_id=c.id WHERE 1=1`;
  const p = [];
  if (date)     { q += ' AND l.date=?';     p.push(date); }
  if (child_id) { q += ' AND l.child_id=?'; p.push(child_id); }
  res.json(dbAll(q + ' ORDER BY l.created_at DESC', p));
});

app.post('/api/logs', auth, (req, res) => {
  const { childId, date, type, note } = req.body;
  if (!childId || !note) return res.status(400).json({ error: 'childId and note required' });
  const r = dbRun(
    `INSERT INTO daily_logs (child_id,date,type,note,created_by,created_at) VALUES (?,?,?,?,?,?)`,
    [childId, date||new Date().toISOString().slice(0,10), type||'note', note, req.user.username, Date.now()]
  );
  saveToDisk(); res.json({ id: r.lastInsertRowid });
});

app.delete('/api/logs/:id', auth, (req, res) => {
  dbRun('DELETE FROM daily_logs WHERE id=?', [req.params.id]);
  saveToDisk(); res.json({ ok: true });
});

// Staff
app.get('/api/staff', auth, adminOnly, (_req, res) =>
  res.json(dbAll('SELECT id,username,role,created_at FROM staff')));

app.post('/api/staff', auth, adminOnly, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const r = dbRun(`INSERT INTO staff (username,password_hash,role,created_at) VALUES (?,?,?,?)`,
      [username, bcrypt.hashSync(password, 10), role||'staff', Date.now()]);
    saveToDisk(); res.json({ id: r.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Username already exists' }); }
});

app.delete('/api/staff/:id', auth, adminOnly, (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  dbRun('DELETE FROM staff WHERE id=?', [req.params.id]);
  saveToDisk(); res.json({ ok: true });
});

// CSV export
app.get('/api/reports/attendance-csv', auth, (req, res) => {
  const { date_from, date_to, child_id } = req.query;
  let q = `SELECT a.date,c.name,c.age,a.check_in,a.check_out,a.who FROM attendance a JOIN children c ON a.child_id=c.id WHERE 1=1`;
  const p = [];
  if (child_id)  { q += ' AND a.child_id=?'; p.push(child_id); }
  if (date_from) { q += ' AND a.date>=?';    p.push(date_from); }
  if (date_to)   { q += ' AND a.date<=?';    p.push(date_to); }
  const rows = dbAll(q + ' ORDER BY a.date DESC,c.name', p);
  const ft   = ts => ts ? new Date(Number(ts)).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
  const fd   = (a,b) => a&&b ? Math.round((Number(b)-Number(a))/60000)+' min' : '';
  let csv = 'Date,Child,Age,Check In,Check Out,Duration,By\n';
  rows.forEach(r => { csv += `${r.date},"${r.name}",${r.age||''},${ft(r.check_in)},${ft(r.check_out)},${fd(r.check_in,r.check_out)},"${r.who||''}"\n`; });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🌱  Sproutlings Sanctuary running at http://localhost:${PORT}`);
    console.log(`   Login: admin / admin1234\n`);
  });
}).catch(err => { console.error(err); process.exit(1); });
