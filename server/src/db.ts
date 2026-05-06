import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL || './data.db';
const db = new Database(path.resolve(__dirname, dbPath));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tags TEXT,
    impact_score INTEGER DEFAULT 3,
    urgency_score INTEGER DEFAULT 3,
    learning_score INTEGER DEFAULT 3,
    risk_score INTEGER DEFAULT 3,
    energy_score INTEGER DEFAULT 3,
    snoozed_until DATETIME,
    first_step TEXT,
    status TEXT DEFAULT 'active',
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    impact_weight INTEGER DEFAULT 30,
    urgency_weight INTEGER DEFAULT 20,
    learning_weight INTEGER DEFAULT 15,
    risk_weight INTEGER DEFAULT 15,
    energy_weight INTEGER DEFAULT 20,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

export default db;