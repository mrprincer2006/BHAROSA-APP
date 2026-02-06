import { getDb } from '../config/database.js';

// Get all orders
export async function getAllOrders(req, res) {
  try {
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
  } catch (error) {
    console.error('[Orders] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

// Get single order
export async function getOrder(req, res) {
  try {
    const db = getDb();
    const row = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = {
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
    
    res.json({ order });
  } catch (error) {
    console.error('[Orders] Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

// Create new order
export async function createOrder(req, res) {
  try {
    const {
      address,
      customer,
      paymentMethod,
      totals
    } = req.body;
    
    const id = `ord_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const now = new Date().toISOString();
    
    const db = getDb();
    await db.run(
      `INSERT INTO orders (
        id, user_id, status, payment_method, totals_json, 
        address_json, customer_json, payment_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        null,
        'PLACED',
        paymentMethod,
        JSON.stringify(totals),
        JSON.stringify(address),
        JSON.stringify(customer),
        JSON.stringify({}),
        now,
        now
      ]
    );
    
    const order = {
      id,
      status: 'PLACED',
      paymentMethod,
      totals,
      address,
      customer,
      payment: {},
      createdAt: now,
      updatedAt: now
    };
    
    res.json({ order });
  } catch (error) {
    console.error('[Orders] Create error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

// Update order status
export async function updateOrderStatus(req, res) {
  try {
    const { status, location } = req.body || {};
    if (!status) return res.status(400).json({ error: 'Status required' });
    
    const db = getDb();
    const row = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await db.run(
      `UPDATE orders SET status = ?, location = ?, updated_at = ? WHERE id = ?`,
      [status, location || null, new Date().toISOString(), req.params.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Orders] Update error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

// Create Razorpay order
export async function createRazorpayOrder(req, res) {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      amountPaise: order.amount,
      currency: order.currency,
      orderId: order.id,
      createdAt: order.created_at
    });
  } catch (error) {
    console.error('[Orders] Razorpay error:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
}

// Confirm payment
export async function confirmPayment(req, res) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    
    if (!razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing payment id' });
    }
    
    // Real signature verification
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = require('crypto')
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const db = getDb();
    await db.run(
      `UPDATE orders SET 
        status = ?, 
        payment_json = ?, 
        updated_at = ? 
       WHERE id = ?`,
      [
        'PAID',
        JSON.stringify({
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          paidAt: new Date().toISOString()
        }),
        new Date().toISOString(),
        req.params.id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Orders] Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
}
