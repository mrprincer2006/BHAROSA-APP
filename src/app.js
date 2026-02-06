import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import twilio from 'twilio';
import crypto from 'crypto';
import { initDb, getDb } from './db.js';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Static site
app.use(express.static(__dirname));

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
    tag: 'Value',
    img: 'https://images.unsplash.com/photo-1604908176997-125f25cc500f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a3',
    name: 'Parle-G Family Pack',
    desc: 'Classic glucose biscuits.',
    category: 'Snacks',
    price: 72,
    mrp: 80,
    rating: 4.6,
    tag: 'Top Rated',
    img: 'https://images.unsplash.com/photo-1612198790700-0ff8b12b6d0f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a4',
    name: 'Tata Salt 1kg',
    desc: 'Iodized salt for balanced taste.',
    category: 'Grocery',
    price: 28,
    mrp: 32,
    rating: 4.5,
    tag: 'Essentials',
    img: 'https://images.unsplash.com/photo-1621939514649-280e2b0b5f24?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a5',
    name: 'Instant Noodles Pack',
    desc: 'Quick snack for any time.',
    category: 'Snacks',
    price: 120,
    mrp: 140,
    rating: 4.3,
    tag: 'Hot Deal',
    img: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a6',
    name: 'Milk Chocolate 50g',
    desc: 'Smooth chocolate for every mood.',
    category: 'Snacks',
    price: 50,
    mrp: 55,
    rating: 4.4,
    tag: 'Treat',
    img: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a7',
    name: 'Detergent Powder 1kg',
    desc: 'Strong stain removal formula.',
    category: 'Home',
    price: 215,
    mrp: 260,
    rating: 4.1,
    tag: 'New',
    img: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a8',
    name: 'Toilet Cleaner',
    desc: 'Germ protection and shine.',
    category: 'Home',
    price: 98,
    mrp: 120,
    rating: 4.0,
    tag: 'Popular',
    img: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a9',
    name: 'Shampoo 180ml',
    desc: 'Daily care, smooth and clean.',
    category: 'Personal Care',
    price: 155,
    mrp: 199,
    rating: 4.2,
    tag: 'Combo',
    img: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a10',
    name: 'Face Wash 100ml',
    desc: 'Fresh look and deep clean.',
    category: 'Personal Care',
    price: 135,
    mrp: 170,
    rating: 4.0,
    tag: 'Trending',
    img: 'https://images.unsplash.com/photo-1629198735660-e39ea7a6f048?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a11',
    name: 'Green Tea 100g',
    desc: 'Light and refreshing wellness.',
    category: 'Beverages',
    price: 189,
    mrp: 220,
    rating: 4.1,
    tag: 'Wellness',
    img: 'https://images.unsplash.com/photo-1542444459-db47a36b7fdf?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'a12',
    name: 'Masala Tea 250g',
    desc: 'Strong kadak chai blend.',
    category: 'Beverages',
    price: 165,
    mrp: 199,
    rating: 4.5,
    tag: 'Best Value',
    img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80'
  }
];

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function calcTotals(cart) {
  // cart: { [productId]: qty }
  const items = [];
  let totalMrp = 0;
  let totalPrice = 0;

  for (const [id, qtyRaw] of Object.entries(cart || {})) {
    const qty = Math.max(0, Number(qtyRaw || 0));
    if (!qty) continue;
    const p = findProduct(id);
    if (!p) continue;

    const lineMrp = p.mrp * qty;
    const linePrice = p.price * qty;

    items.push({
      id: p.id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      qty,
      lineMrp,
      linePrice
    });

    totalMrp += lineMrp;
    totalPrice += linePrice;
  }

  const discount = Math.max(0, totalMrp - totalPrice);
  return { items, totalMrp, totalPrice, discount, payable: totalPrice };
}

// ---- OTP (SQLite) ----
async function saveOtp(identifier, otp, expires) {
  const db = getDb();
  await db.run(
    'INSERT OR REPLACE INTO otps (identifier, otp, expires_at) VALUES (?, ?, ?)',
    [identifier, otp, expires.toISOString()]
  );
}

async function getOtp(identifier) {
  const db = getDb();
  const row = await db.get('SELECT otp, expires_at FROM otps WHERE identifier = ?', [identifier]);
  if (!row) return null;
  if (Date.now() > new Date(row.expires_at).getTime()) {
    await db.run('DELETE FROM otps WHERE identifier = ?', [identifier]);
    return null;
  }
  return row.otp;
}

async function deleteOtp(identifier) {
  const db = getDb();
  await db.run('DELETE FROM otps WHERE identifier = ?', [identifier]);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpSms(to, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  console.log('[Twilio] Config check:', {
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasMessagingServiceSid: !!messagingServiceSid,
    to
  });

  if (!accountSid || !authToken || !messagingServiceSid || !to) {
    console.error('[Twilio] Missing config');
    return { sent: false };
  }

  const client = twilio(accountSid, authToken);
  try {
    const message = await client.messages.create({
      body: `Your BHAROSA OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
      messagingServiceSid,
      to: '+91' + to // assumes India numbers; adjust as needed
    });
    console.log('[Twilio] SMS sent. SID:', message.sid);
    return { sent: true };
  } catch (e) {
    console.error('[Twilio] Send error:', e);
    return { sent: false, error: e.message };
  }
}

async function sendOtpSmsFallback(to, otp) {
  // Fast2SMS example (requires API key and sender ID)
  const apiKey = process.env.FAST2SMS_API_KEY;
  const senderId = process.env.FAST2SMS_SENDER_ID;
  if (!apiKey || !senderId) return { sent: false, reason: 'Missing Fast2SMS config' };

  try {
    const res = await fetch('https://www.fast2sms.com/shop/api/bulk-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: senderId,
        message: `Your BHAROSA OTP is: ${otp}. Valid for 10 minutes.`,
        route: 'dlt_manual',
        language: 'english',
        numbers: '+91' + to
      })
    });
    const data = await res.json();
    console.log('[Fast2SMS] Response:', data);
    return { sent: true };
  } catch (e) {
    console.error('[Fast2SMS] Send error:', e);
    return { sent: false, error: e.message };
  }
}

async function sendOtpEmail(to, otp) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass || !to) return { sent: false };

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject: 'BHAROSA OTP',
    html: `
      <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">Your OTP</h2>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Use this One Time Password to verify your account:</p>
      <div style="font-family:Inter,sans-serif; font-size:32px; font-weight:950; color:#2874f0; background:#f0f9ff; padding:12px 16px; border-radius:12px; display:inline-block; letter-spacing:4px;">${otp}</div>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-top:16px;">This OTP is valid for 10 minutes. Do not share it.</p>
    `
  });

  return { sent: true };
}

// ---- Orders (SQLite) ----
async function createOrder(orderData) {
  const db = getDb();
  const { id, userId, status, paymentMethod, totals, address, customer, payment } = orderData;
  await db.run(
    `INSERT INTO orders (id, user_id, status, payment_method, totals_json, address_json, customer_json, payment_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, status, paymentMethod, JSON.stringify(totals), JSON.stringify(address), JSON.stringify(customer), JSON.stringify(payment)]
  );
  return orderData;
}

async function getOrder(id) {
  const db = getDb();
  const row = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    paymentMethod: row.payment_method,
    totals: JSON.parse(row.totals_json),
    address: JSON.parse(row.address_json),
    customer: JSON.parse(row.customer_json),
    payment: JSON.parse(row.payment_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

async function updateOrder(id, updates) {
  const db = getDb();
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  values.push(id);
  await db.run(`UPDATE orders SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
}

function newId(prefix = 'ord') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

async function sendOrderEmail({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('[Email] Sending to:', to);
  console.log('[Email] SMTP config:', { host, port, user, hasPass: !!pass });

  if (!host || !port || !user || !pass || !to) return { sent: false };

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    html
  });

  console.log('[Email] Sent successfully to:', to);
  return { sent: true };
}

// Fallback: EmailJS (client-side) if SMTP not configured
async function sendOrderEmailFallback({ to, subject, html }) {
  console.log('[Email] SMTP not configured; skipping email send');
  return { sent: false, fallback: 'EmailJS' };
}

async function sendAdminOrderEmail(order) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { sent: false };

  const itemsHtml = order.totals.items.map(it => `
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px; font-weight:950;">${escapeHtml(it.name)}</td>
      <td style="padding:8px; text-align:center;">${it.qty}</td>
      <td style="padding:8px; text-align:right;">₹${it.price}</td>
      <td style="padding:8px; text-align:right;">₹${it.linePrice}</td>
    </tr>
  `).join('');

  const html = `
    <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">New Order: ${order.id}</h2>
    <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Payment: ${order.paymentMethod} | Status: ${order.status}</p>
    <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Customer: ${escapeHtml(order.customer?.name || '')} | ${escapeHtml(order.customer?.email || '')} | ${escapeHtml(order.address?.mobile || '')}</p>
    <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Address: ${escapeHtml([order.address?.addressLine, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', '))}</p>
    <table style="width:100%; border-collapse:collapse; font-family:Inter,sans-serif; font-size:13px;">
      <thead>
        <tr style="border-bottom:2px solid #0f172a;">
          <th style="padding:8px; text-align:left; font-weight:950;">Item</th>
          <th style="padding:8px; text-align:center; font-weight:950;">Qty</th>
          <th style="padding:8px; text-align:right; font-weight:950;">Price</th>
          <th style="padding:8px; text-align:right; font-weight:950;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #0f172a;">
          <td colspan="3" style="padding:8px; text-align:right; font-weight:950;">Total MRP</td>
          <td style="padding:8px; text-align:right; font-weight:950;">₹${order.totals.totalMrp}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:8px; text-align:right; font-weight:950;">Discount</td>
          <td style="padding:8px; text-align:right; font-weight:950; color:#059669;">− ₹${order.totals.discount}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:8px; text-align:right; font-weight:950; font-size:16px;">Payable</td>
          <td style="padding:8px; text-align:right; font-weight:950; font-size:16px; color:#2874f0;">₹${order.totals.payable}</td>
        </tr>
      </tfoot>
    </table>
  `;

  return await sendOrderEmail({ to: adminEmail, subject: `BHAROSA New Order: ${order.id}`, html });
}

function escapeHtml(str){
  return String(str || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

// ---- APIs ----
app.post('/api/send-otp', async (req, res) => {
  const { identifier } = req.body || {};
  if (!identifier) return res.status(400).json({ error: 'Identifier required' });

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isMobile = /^\d{10}$/.test(identifier);
  if (!isEmail && !isMobile) return res.status(400).json({ error: 'Invalid identifier' });

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await saveOtp(identifier, otp, expires);

  let sent = false;
  let note = '';
  if (isEmail) {
    const result = await sendOtpEmail(identifier, otp);
    sent = result.sent;
    note = result.sent ? 'Email sent' : 'Email failed';
  } else {
    const result = await sendOtpSms(identifier, otp);
    if (result.sent) {
      sent = true;
      note = 'SMS sent';
    } else {
      const fallback = await sendOtpSmsFallback(identifier, otp);
      sent = fallback.sent;
      note = fallback.sent ? 'SMS sent (Fast2SMS)' : 'SMS failed';
      if (!fallback.sent && fallback.error) console.error('[Fast2SMS] error:', fallback.error);
    }
    if (!sent && result.error) console.error('[Twilio] error:', result.error);
  }

  res.json({ sent, expires: expires.toISOString(), note });
});

app.post('/api/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body || {};
  if (!identifier || !otp) return res.status(400).json({ error: 'Identifier and OTP required' });

  const storedOtp = await getOtp(identifier);
  if (!storedOtp) return res.status(400).json({ error: 'OTP not found or expired' });

  if (storedOtp !== otp) return res.status(400).json({ error: 'Incorrect OTP' });

  await deleteOtp(identifier);
  res.json({ verified: true });
});

app.get('/api/products', (req, res) => {
  res.json({ products: PRODUCTS });
});

app.get('/api/products/:id', (req, res) => {
  const p = findProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ product: p });
});

app.post('/api/orders', async (req, res) => {
  const { cart, address, customer, paymentMethod } = req.body || {};
  const totals = calcTotals(cart);

  if (!totals.items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  if (!address || !address.fullName || !address.mobile || !address.addressLine || !address.pincode) {
    return res.status(400).json({ error: 'Missing address fields' });
  }

  if (!paymentMethod || !['COD', 'ONLINE'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  const id = newId('order');
  const order = {
    id,
    userId: customer?.id || null,
    status: paymentMethod === 'COD' ? 'PLACED' : 'PENDING_PAYMENT',
    paymentMethod,
    totals,
    address,
    customer: customer || {},
    payment: {}
  };

  await createOrder(order);

  // Email admin on every order
  try {
    await sendAdminOrderEmail(order);
  } catch (e) {}

  // Email user on COD placement
  if (paymentMethod === 'COD') {
    try {
      await sendOrderEmail({
        to: order.customer?.email || '',
        subject: `BHAROSA Order Placed: ${id}`,
        html: `
          <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">Order Placed: ${id}</h2>
          <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Thank you! Your order is placed (Cash on Delivery).</p>
          <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Payable: <b style="color:#2874f0;">₹${totals.payable}</b></p>
          <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Delivery Address:</p>
          <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#0f172a;">${escapeHtml([address.addressLine, address.city, address.state, address.pincode].filter(Boolean).join(', '))}</p>
          <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-top:16px;">We’ll notify you when your order is shipped.</p>
        `
      });
    } catch (e) {
      console.error('[Order] COD email failed:', e);
    }
  }

  res.json({ order });
});

app.get('/api/orders', async (req, res) => {
  const db = getDb();
  const rows = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
  const orders = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    paymentMethod: row.payment_method,
    totals: JSON.parse(row.totals_json),
    address: JSON.parse(row.address_json),
    customer: JSON.parse(row.customer_json),
    payment: JSON.parse(row.payment_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  }));
  res.json({ orders });
});

app.get('/api/orders/:id', async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json({ order });
});

app.post('/api/orders/:id/razorpay-order', async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.paymentMethod !== 'ONLINE') return res.status(400).json({ error: 'Not an ONLINE order' });

  const client = razorpayClient();
  if (!client) {
    return res.status(400).json({
      error: 'Razorpay keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars.'
    });
  }

  try {
    const rzpOrder = await client.orders.create({
      amount: Math.round(order.totals.payable * 100),
      currency: 'INR',
      receipt: order.id,
      notes: { orderId: order.id }
    });

    await updateOrder(order.id, {
      payment_json: JSON.stringify({ ...order.payment, razorpayOrderId: rzpOrder.id })
    });

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amountPaise: Math.round(order.totals.payable * 100),
      currency: 'INR'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

app.post('/api/orders/:id/confirm', async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
  if (!razorpay_payment_id) return res.status(400).json({ error: 'Missing payment id' });

  // Real signature verification
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  await updateOrder(order.id, {
    status: 'PAID',
    payment_json: JSON.stringify({
      ...order.payment,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    })
  });

  // Email admin on payment success
  try {
    await sendAdminOrderEmail(order);
  } catch (e) {}

  // Email user on payment success
  try {
    await sendOrderEmail({
      to: order.customer?.email || '',
      subject: `BHAROSA Payment Success: ${order.id}`,
      html: `
        <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">Payment Received: ${order.id}</h2>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Thank you! Your payment was successful.</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Amount Paid: <b style="color:#059669;">₹${order.totals.payable}</b></p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Payment ID: ${escapeHtml(razorpay_payment_id || '')}</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Delivery Address:</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#0f172a;">${escapeHtml([order.address?.addressLine, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', '))}</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-top:16px;">We’ll notify you when your order is shipped.</p>
      `
    });
  } catch (e) {
    console.error('[Order] Payment email failed:', e);
  }

  res.json({ order });
});

// Update order status/location (admin)
app.patch('/api/orders/:id/status', async (req, res) => {
  const { status, location } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status required' });
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  
  await updateOrder(req.params.id, {
    status,
    ...(location && { location }),
    updated_at: new Date().toISOString()
  });
  
  // Send status update email to user
  try {
    await sendOrderEmail({
      to: order.customer?.email || '',
      subject: `BHAROSA Order Update: ${order.id}`,
      html: `
        <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">Order Status Updated</h2>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Your order status has been updated.</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Order ID: <b>${order.id}</b></p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Status: <b style="color:#2874f0;">${status}</b></p>
        ${location ? `<p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Current Location: <b>${escapeHtml(location)}</b></p>` : ''}
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-top:16px;">Track your order on our website.</p>
      `
    });
  } catch (e) {
    console.error('[Order] Status update email failed:', e);
  }
  
  res.json({ success: true });
});

// Analytics endpoints
app.get('/api/analytics', async (req, res) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    const db = getDb();
    
    // Calculate date range
    const now = new Date();
    let dateFrom, dateTo;
    
    if (period === 'custom' && startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      const days = parseInt(period);
      dateFrom = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      dateTo = now;
    }

    // Get orders in date range
    const orders = await db.all(
      `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at`,
      [dateFrom.toISOString(), dateTo.toISOString()]
    );

    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => {
      try {
        const totals = JSON.parse(o.totals_json || '{}');
        return sum + (totals.payable || 0);
      } catch {
        return sum;
      }
    }, 0);

    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get previous period for comparison
    const prevDays = parseInt(period);
    const prevDateFrom = new Date(dateFrom.getTime() - (prevDays * 24 * 60 * 60 * 1000));
    const prevDateTo = dateFrom;
    
    const prevOrders = await db.all(
      `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ?`,
      [prevDateFrom.toISOString(), prevDateTo.toISOString()]
    );

    const prevRevenue = prevOrders.reduce((sum, o) => {
      try {
        const totals = JSON.parse(o.totals_json || '{}');
        return sum + (totals.payable || 0);
      } catch {
        return sum;
      }
    }, 0);

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : '0';
    const ordersGrowth = prevOrders.length > 0 ? ((totalOrders - prevOrders.length) / prevOrders.length * 100).toFixed(1) : '0';

    // Sales data for chart
    const salesData = generateSalesData(orders, period);
    
    // Product analytics
    const productStats = await getProductStats(db, dateFrom, dateTo);
    
    // Customer analytics
    const customerStats = await getCustomerStats(db, orders, dateFrom, dateTo);
    
    // Payment methods
    const paymentStats = getPaymentStats(orders);

    res.json({
      stats: {
        totalRevenue: `₹${totalRevenue.toFixed(0)}`,
        totalOrders,
        avgOrderValue: `₹${avgOrderValue.toFixed(0)}`,
        conversionRate: '2.3%', // Mock data
        revenueGrowth: `${revenueGrowth}%`,
        ordersGrowth: `${ordersGrowth}%`,
        aovGrowth: '5.2%', // Mock data
        conversionGrowth: '0.8%' // Mock data
      },
      sales: salesData,
      products: productStats,
      customers: customerStats,
      payments: paymentStats
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

function generateSalesData(orders, period) {
  const labels = [];
  const revenue = [];
  const ordersCount = [];
  
  // Group by day/week/month based on period
  const grouped = {};
  
  orders.forEach(order => {
    const date = new Date(order.created_at);
    let key;
    
    if (period === '7' || period === '30') {
      key = date.toISOString().split('T')[0]; // Daily
    } else if (period === '90') {
      // Weekly
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = date.toISOString().substring(0, 7); // Monthly
    }
    
    if (!grouped[key]) {
      grouped[key] = { revenue: 0, orders: 0 };
    }
    
    try {
      const totals = JSON.parse(order.totals_json || '{}');
      grouped[key].revenue += totals.payable || 0;
      grouped[key].orders += 1;
    } catch (e) {}
  });
  
  // Sort and format
  Object.keys(grouped).sort().forEach(key => {
    labels.push(key);
    revenue.push(grouped[key].revenue);
    ordersCount.push(grouped[key].orders);
  });
  
  return { labels, revenue, orders: ordersCount };
}

async function getProductStats(db, dateFrom, dateTo) {
  const orders = await db.all(
    `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ?`,
    [dateFrom.toISOString(), dateTo.toISOString()]
  );
  
  const productMap = new Map();
  
  orders.forEach(order => {
    try {
      const totals = JSON.parse(order.totals_json || '{}');
      if (totals.items) {
        totals.items.forEach(item => {
          if (!productMap.has(item.id)) {
            productMap.set(item.id, {
              id: item.id,
              name: item.name,
              unitsSold: 0,
              revenue: 0
            });
          }
          const product = productMap.get(item.id);
          product.unitsSold += item.qty || 0;
          product.revenue += (item.price || 0) * (item.qty || 0);
        });
      }
    } catch (e) {}
  });
  
  // Convert to array and sort by units sold
  const products = Array.from(productMap.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10)
    .map(p => ({
      ...p,
      revenue: p.revenue.toFixed(0),
      growth: Math.floor(Math.random() * 40) - 10 // Mock growth data
    }));
  
  return products;
}

async function getCustomerStats(db, orders, dateFrom, dateTo) {
  // Get unique customers
  const customers = new Set();
  orders.forEach(order => {
    try {
      const customer = JSON.parse(order.customer_json || '{}');
      if (customer.email) customers.add(customer.email);
    } catch (e) {}
  });
  
  // Get previous period customers for growth calculation
  const prevDateFrom = new Date(dateFrom.getTime() - (30 * 24 * 60 * 60 * 1000));
  const prevDateTo = dateFrom;
  
  const prevOrders = await db.all(
    `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ?`,
    [prevDateFrom.toISOString(), prevDateTo.toISOString()]
  );
  
  const prevCustomers = new Set();
  prevOrders.forEach(order => {
    try {
      const customer = JSON.parse(order.customer_json || '{}');
      if (customer.email) prevCustomers.add(customer.email);
    } catch (e) {}
  });
  
  const growth = prevCustomers.size > 0 ? 
    ((customers.size - prevCustomers.size) / prevCustomers.size * 100).toFixed(1) : '0';
  
  // Mock repeat customers and AOV
  const repeatCustomers = Math.floor(customers.size * 0.3);
  const repeatRate = customers.size > 0 ? (repeatCustomers / customers.size * 100).toFixed(1) : '0';
  const avgOrderValue = orders.length > 0 ? 
    orders.reduce((sum, o) => {
      try {
        const totals = JSON.parse(o.totals_json || '{}');
        return sum + (totals.payable || 0);
      } catch {
        return sum;
      }
    }, 0) / orders.length : 0;
  
  return {
    total: customers.size,
    growth: `${growth}%`,
    repeat: repeatCustomers,
    repeatRate,
    avgOrderValue: avgOrderValue.toFixed(0),
    aovGrowth: '5.2%', // Mock data
    newCustomers: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      data: [12, 19, 15, 25] // Mock data
    }
  };
}

function getPaymentStats(orders) {
  const paymentMap = new Map();
  
  orders.forEach(order => {
    const method = order.payment_method || 'Unknown';
    paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
  });
  
  return Array.from(paymentMap.entries()).map(([method, count]) => ({
    method: method === 'COD' ? 'Cash on Delivery' : method === 'ONLINE' ? 'Online Payment' : method,
    count
  }));
}

// Analytics export endpoint
app.get('/api/analytics/export', async (req, res) => {
  try {
    const { type = 'orders', period = '30', format = 'csv' } = req.query;
    const db = getDb();
    
    // Calculate date range
    const now = new Date();
    const days = period === 'all' ? 3650 : parseInt(period);
    const dateFrom = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    let data = [];
    let filename = `bharosa-${type}-${period}`;
    
    switch (type) {
      case 'orders':
        data = await db.all(
          `SELECT * FROM orders WHERE created_at >= ? ORDER BY created_at DESC`,
          [dateFrom.toISOString()]
        );
        filename += '-orders';
        break;
        
      case 'products':
        const orders = await db.all(
          `SELECT * FROM orders WHERE created_at >= ?`,
          [dateFrom.toISOString()]
        );
        
        const productMap = new Map();
        orders.forEach(order => {
          try {
            const totals = JSON.parse(order.totals_json || '{}');
            if (totals.items) {
              totals.items.forEach(item => {
                if (!productMap.has(item.id)) {
                  productMap.set(item.id, {
                    id: item.id,
                    name: item.name,
                    mrp: item.mrp,
                    price: item.price,
                    unitsSold: 0,
                    revenue: 0
                  });
                }
                const product = productMap.get(item.id);
                product.unitsSold += item.qty || 0;
                product.revenue += (item.price || 0) * (item.qty || 0);
              });
            }
          } catch (e) {}
        });
        
        data = Array.from(productMap.values());
        filename += '-products';
        break;
        
      case 'customers':
        const customerOrders = await db.all(
          `SELECT * FROM orders WHERE created_at >= ?`,
          [dateFrom.toISOString()]
        );
        
        const customerSet = new Set();
        const customers = [];
        
        customerOrders.forEach(order => {
          try {
            const customer = JSON.parse(order.customer_json || '{}');
            if (customer.email && !customerSet.has(customer.email)) {
              customerSet.add(customer.email);
              customers.push({
                name: customer.name || '',
                email: customer.email,
                phone: customer.contact || '',
                firstOrder: order.created_at,
                totalOrders: 1,
                totalSpent: JSON.parse(order.totals_json || '{}').payable || 0
              });
            }
          } catch (e) {}
        });
        
        data = customers;
        filename += '-customers';
        break;
        
      case 'sales':
        // Generate sales summary
        const salesOrders = await db.all(
          `SELECT * FROM orders WHERE created_at >= ?`,
          [dateFrom.toISOString()]
        );
        
        const totalRevenue = salesOrders.reduce((sum, o) => {
          try {
            const totals = JSON.parse(o.totals_json || '{}');
            return sum + (totals.payable || 0);
          } catch {
            return sum;
          }
        }, 0);
        
        data = [{
          period: period,
          totalOrders: salesOrders.length,
          totalRevenue,
          avgOrderValue: salesOrders.length > 0 ? totalRevenue / salesOrders.length : 0,
          dateFrom: dateFrom.toISOString(),
          dateTo: now.toISOString()
        }];
        
        filename += '-sales-summary';
        break;
        
      case 'analytics':
        // Full analytics data
        const analyticsResponse = await fetchAnalyticsData(req.query);
        data = [analyticsResponse];
        filename += '-full-analytics';
        break;
    }
    
    // Convert to requested format
    let output;
    let contentType;
    
    switch (format) {
      case 'json':
        output = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        filename += '.json';
        break;
        
      case 'xlsx':
        // Simple XLSX conversion (would need xlsx library in production)
        output = JSON.stringify(data, null, 2); // Fallback to JSON
        contentType = 'application/json';
        filename += '.json';
        break;
        
      case 'csv':
      default:
        output = convertToCSV(data);
        contentType = 'text/csv';
        filename += '.csv';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(output);
    
  } catch (error) {
    console.error('[Analytics Export] Error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Analytics import endpoint
app.post('/api/analytics/import', async (req, res) => {
  try {
    // This would handle file upload and parsing
    // For now, return a mock response
    res.json({
      imported: 0,
      errors: ['Import functionality not yet implemented'],
      message: 'Import feature coming soon'
    });
  } catch (error) {
    console.error('[Analytics Import] Error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      // Escape quotes and commas
      const strValue = String(value || '');
      if (strValue.includes(',') || strValue.includes('"')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

async function fetchAnalyticsData(query) {
  // Reuse the analytics logic from the main endpoint
  const { period = '30' } = query;
  const db = getDb();
  
  const now = new Date();
  const days = parseInt(period);
  const dateFrom = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const orders = await db.all(
    `SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at`,
    [dateFrom.toISOString(), now.toISOString()]
  );
  
  const totalRevenue = orders.reduce((sum, o) => {
    try {
      const totals = JSON.parse(o.totals_json || '{}');
      return sum + (totals.payable || 0);
    } catch {
      return sum;
    }
  }, 0);
  
  return {
    period,
    dateRange: {
      from: dateFrom.toISOString(),
      to: now.toISOString()
    },
    summary: {
      totalOrders: orders.length,
      totalRevenue,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
    },
    orders: orders.slice(0, 10) // First 10 orders as sample
  };
}

// Optional: send status update email to user (demo)
app.post('/api/orders/:id/send-status-email', async (req, res) => {
  const order = ORDERS.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  try {
    await sendOrderEmail({
      to: order.customer?.email || '',
      subject: `BHAROSA Order Update: ${order.id}`,
      html: `
        <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">Order Update: ${order.id}</h2>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Your order status is now: <b>${order.status}</b></p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Payable: <b style="color:#2874f0;">₹${order.totals.payable}</b></p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Delivery Address:</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#0f172a;">${escapeHtml([order.address?.addressLine, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', '))}</p>
        <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-top:16px;">We’ll notify you when your order is shipped.</p>
      `
    });
    res.json({ sent: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
  });
}

start();
