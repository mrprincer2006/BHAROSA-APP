import { 
  getAllOrders, 
  getOrder, 
  createOrder, 
  updateOrderStatus, 
  createRazorpayOrder, 
  confirmPayment 
} from '../controllers/ordersController.js';

export default function ordersRoutes(app) {
  // Get all orders
  app.get('/api/orders', getAllOrders);
  
  // Get single order
  app.get('/api/orders/:id', getOrder);
  
  // Create new order
  app.post('/api/orders', createOrder);
  
  // Update order status
  app.patch('/api/orders/:id/status', updateOrderStatus);
  
  // Create Razorpay order
  app.post('/api/orders/:id/razorpay-order', createRazorpayOrder);
  
  // Confirm payment
  app.post('/api/orders/:id/confirm', confirmPayment);
}
