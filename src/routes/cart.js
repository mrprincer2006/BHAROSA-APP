import { 
  getCart, 
  addToCart, 
  updateCart, 
  clearCart, 
  checkout 
} from '../controllers/cartController.js';

export default function cartRoutes(app) {
  // Get cart
  app.get('/api/cart', getCart);
  
  // Add item to cart
  app.post('/api/cart/add', addToCart);
  
  // Update cart quantity
  app.post('/api/cart/update', updateCart);
  
  // Clear cart
  app.delete('/api/cart', clearCart);
  
  // Checkout cart
  app.post('/api/checkout', checkout);
}
