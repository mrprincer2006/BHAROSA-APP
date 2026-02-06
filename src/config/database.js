import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export let db;

export async function initDb() {
  try {
    db = await open({
      filename: './bharosa.db',
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        status TEXT DEFAULT 'PLACED',
        payment_method TEXT,
        totals_json TEXT,
        address_json TEXT,
        customer_json TEXT,
        payment_json TEXT,
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

    console.log('[Database] Initialized successfully');
  } catch (error) {
    console.error('[Database] Initialization error:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function closeDb() {
  if (db) {
    await db.close();
    db = null;
  }
}
