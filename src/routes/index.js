import analyticsRoutes from './analytics.js';
import ordersRoutes from './orders.js';
import cartRoutes from './cart.js';

export default function registerRoutes(app) {
  analyticsRoutes(app);
  ordersRoutes(app);
  cartRoutes(app);
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
