import { getDb } from '../config/database.js';
import { sendOrderEmail, sendAdminOrderEmail } from '../utils/email.js';

// In-memory cart storage (for demo - in production, use Redis or database)
const CARTS = new Map();

// Get cart for user
export async function getCart(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const cart = CARTS.get(userId) || { items: [], totals: { items: 0, totalMrp: 0, discount: 0, payable: 0 } };
    res.json(cart);
  } catch (error) {
    console.error('[Cart] Get error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
}

// Add item to cart
export async function addToCart(req, res) {
  try {
    const { productId, qty = 1 } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    // Get product details (mock data - in production, fetch from database)
    const PRODUCTS = {
      'a1': { id: 'a1', name: 'Aashirvaad Atta 5kg', price: 255, mrp: 299 },
      'a2': { id: 'a2', name: 'Fortune Oil 1L', price: 145, mrp: 175 },
      'a3': { id: 'a3', name: 'Parle-G Family Pack', price: 72, mrp: 80 },
      'a4': { id: 'a4', name: 'Tata Salt 1kg', price: 20, mrp: 25 },
      'a5': { id: 'a5', name: 'Instant Noodles Pack', price: 120, mrp: 140 }
    };

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get or create cart
    let cart = CARTS.get(userId) || { items: [], totals: { items: 0, totalMrp: 0, discount: 0, payable: 0 } };

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(item => item.id === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].qty += qty;
    } else {
      // Add new item
      cart.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        qty: qty,
        linePrice: product.price * qty
      });
    }

    // Recalculate totals
    cart.totals = calculateTotals(cart.items);

    // Save cart
    CARTS.set(userId, cart);

    res.json({ message: 'Item added to cart', cart });
  } catch (error) {
    console.error('[Cart] Add error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
}

// Update cart quantity
export async function updateCart(req, res) {
  try {
    const { items } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array required' });
    }

    // Get products data
    const PRODUCTS = {
      'a1': { id: 'a1', name: 'Aashirvaad Atta 5kg', price: 255, mrp: 299 },
      'a2': { id: 'a2', name: 'Fortune Oil 1L', price: 145, mrp: 175 },
      'a3': { id: 'a3', name: 'Parle-G Family Pack', price: 72, mrp: 80 },
      'a4': { id: 'a4', name: 'Tata Salt 1kg', price: 20, mrp: 25 },
      'a5': { id: 'a5', name: 'Instant Noodles Pack', price: 120, mrp: 140 }
    };

    // Create new cart from items
    const cart = { items: [], totals: { items: 0, totalMrp: 0, discount: 0, payable: 0 } };

    items.forEach(item => {
      const product = PRODUCTS[item.id];
      if (product && item.qty > 0) {
        cart.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          mrp: product.mrp,
          qty: item.qty,
          linePrice: product.price * item.qty
        });
      }
    });

    // Recalculate totals
    cart.totals = calculateTotals(cart.items);

    // Save cart
    CARTS.set(userId, cart);

    res.json({ message: 'Cart updated', cart });
  } catch (error) {
    console.error('[Cart] Update error:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
}

// Clear cart
export async function clearCart(req, res) {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    CARTS.delete(userId);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('[Cart] Clear error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
}

// Checkout cart
export async function checkout(req, res) {
  try {
    const { address, customer, paymentMethod, cart } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    // Use cart from request or get from backend
    let cartData = cart;
    if (!cartData) {
      const userCart = CARTS.get(userId);
      if (!userCart || userCart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }
      cartData = userCart;
    }
    
    console.log('[Checkout] Cart data:', cartData);

    // Create order
    const orderId = `ord_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDb();
    await db.run(
      `INSERT INTO orders (
        id, user_id, status, payment_method, totals_json, 
        address_json, customer_json, payment_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        userId,
        'PLACED',
        paymentMethod,
        JSON.stringify(cartData.totals || {}),
        JSON.stringify(address),
        JSON.stringify(customer),
        JSON.stringify({}),
        now,
        now
      ]
    );

    // Clear cart after successful order
    CARTS.delete(userId);

    const order = {
      id: orderId,
      status: 'PLACED',
      paymentMethod,
      totals: cartData.totals || {},
      address,
      customer,
      payment: {},
      createdAt: now,
      updatedAt: now
    };

    console.log('[Checkout] Order created:', order);
    
    // Send email receipt
    try {
      await sendOrderEmail({
        to: customer.email,
        subject: `BHAROSA Order Confirmation: ${orderId}`,
        html: `
          <h2 style="font-family:Arial,sans-serif; color:#333;">Order Confirmation</h2>
          <p style="font-family:Arial,sans-serif;">Thank you for your order! Your order has been placed successfully.</p>
          <div style="font-family:Arial,sans-serif; border:1px solid #ddd; padding:20px; margin:20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Total Amount:</strong> ₹${order.totals.payable || 0}</p>
            <p><strong>Shipping Address:</strong></p>
            <p>${address.fullName}<br>
            ${address.addressLine}<br>
            ${address.city}, ${address.state} - ${address.pincode}</p>
          </div>
          <p style="font-family:Arial,sans-serif; color:#666;">We will notify you when your order ships.</p>
        `
      });
      console.log('[Checkout] Email sent to:', customer.email);
    } catch (emailError) {
      console.error('[Checkout] Email failed:', emailError);
    }
    
    // Send admin notification
    try {
      await sendAdminOrderEmail(order);
      console.log('[Checkout] Admin notification sent');
    } catch (adminError) {
      console.error('[Checkout] Admin notification failed:', adminError);
    }
    
    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('[Cart] Checkout error:', error);
    res.status(500).json({ error: 'Failed to checkout' });
  }
}

// Helper function to calculate totals
function calculateTotals(items) {
  const totals = {
    items: items.length,
    totalMrp: 0,
    discount: 0,
    payable: 0
  };

  items.forEach(item => {
    totals.totalMrp += item.mrp * item.qty;
    totals.payable += item.price * item.qty;
  });

  totals.discount = totals.totalMrp - totals.payable;

  return totals;
}
