import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDb } from './config/database.js';
import registerRoutes from './routes/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---- Data (demo) ----
const PRODUCTS = [
  {
    id: 'a1',
    name: 'Aashirvaad Atta 5kg',
    desc: 'Whole wheat flour for soft rotis.',
    category: 'Grocery',
    price: 255,
    mrp: 299,
    rating: 4.4,
    tag: 'Best Seller',
    img: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a2',
    name: 'Fortune Oil 1L',
    desc: 'Refined oil for daily cooking.',
    category: 'Grocery',
    price: 145,
    mrp: 175,
    rating: 4.2,
    tag: 'Popular',
    img: 'https://images.unsplash.com/photo-1586201375335-09d03078236e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a3',
    name: 'Parle-G Family Pack',
    desc: 'India\'s favorite glucose biscuit.',
    category: 'Snacks',
    price: 72,
    mrp: 80,
    rating: 4.6,
    tag: 'Classic',
    img: 'https://images.unsplash.com/photo-1613478288222-eb581b3d683a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a4',
    name: 'Tata Salt 1kg',
    desc: 'Pure refined free flow iodised salt.',
    category: 'Grocery',
    price: 20,
    mrp: 25,
    rating: 4.3,
    tag: 'Essential',
    img: 'https://images.unsplash.com/photo-1574376085037-f1c5265c8c0f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a5',
    name: 'Instant Noodles Pack',
    desc: 'Quick and tasty noodles for anytime hunger.',
    category: 'Snacks',
    price: 120,
    mrp: 140,
    rating: 4.1,
    tag: 'Quick Bite',
    img: 'https://images.unsplash.com/photo-1613478288222-eb581b3d683a?auto=format&fit=crop&w=1200&q=80'
  }
];

// ---- API Routes ----
registerRoutes(app);

// Products API
app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

// OTP APIs
const OTPS = new Map();

function newOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtp(identifier, otp, expires) {
  const db = await import('./config/database.js');
  await db.getDb().run(
    'INSERT OR REPLACE INTO otps (identifier, otp, expires_at) VALUES (?, ?, ?)',
    [identifier, otp, expires.toISOString()]
  );
}

async function getOtp(identifier) {
  const db = await import('./config/database.js');
  const row = await db.getDb().get(
    'SELECT otp FROM otps WHERE identifier = ? AND expires_at > ?',
    [identifier, new Date().toISOString()]
  );
  return row ? row.otp : null;
}

async function deleteOtp(identifier) {
  const db = await import('./config/database.js');
  await db.getDb().run('DELETE FROM otps WHERE identifier = ?', [identifier]);
}

app.post('/api/send-otp', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Identifier required' });

  const otp = newOtp();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await saveOtp(identifier, otp, expires);

  // Send OTP via email or SMS
  const isEmail = identifier.includes('@');
  if (isEmail) {
    // Email OTP (demo - would use email service)
    console.log('[Email] OTP sent to:', identifier, 'OTP:', otp);
  } else {
    // SMS OTP
    try {
      const { sendOtpSms, sendFast2Sms } = await import('./utils/sms.js');
      const smsResult = await sendOtpSms(identifier, otp);
      if (!smsResult.sent) {
        await sendFast2Sms(identifier, otp);
      }
    } catch (error) {
      console.log('[SMS] Service not configured, logging OTP instead');
      console.log('[SMS] OTP for', identifier, ':', otp);
    }
  }

  res.json({ message: 'OTP sent', expires });
});

app.post('/api/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: 'Identifier and OTP required' });

  const storedOtp = await getOtp(identifier);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  await deleteOtp(identifier);
  res.json({ message: 'OTP verified' });
});

// Serve static files for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  console.log('[Server] Starting...');
  console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Server] SMTP_HOST:', process.env.SMTP_HOST);
  console.log('[Server] SMTP_USER:', process.env.SMTP_USER);
  console.log('[Server] ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
  
  await initDb();
  app.listen(PORT, () => {
    console.log(`BHAROSA server running on http://localhost:${PORT}`);
    console.log(`🛍️  Shop: http://localhost:${PORT}/shop.html`);
    console.log(`📊 Analytics: http://localhost:${PORT}/analytics.html`);
  });
}

start();
