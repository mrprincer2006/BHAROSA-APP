import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export async function initDb() {
  db = await open({
    filename: path.join(__dirname, 'bharosa.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      mobile TEXT UNIQUE,
      name TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      status TEXT DEFAULT 'PLACED',
      paymentMethod TEXT,
      totals TEXT,
      address TEXT,
      customer TEXT,
      payment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS otps (
      identifier TEXT PRIMARY KEY,
      otp TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add location column if it doesn't exist (for existing databases)
  try {
    await db.run(`ALTER TABLE orders ADD COLUMN location TEXT`);
  } catch (e) {
    // Column already exists
  }
  try {
    await db.run(`ALTER TABLE orders ADD COLUMN updated_at TEXT`);
  } catch (e) {
    // Column already exists
  }
}

export function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}
