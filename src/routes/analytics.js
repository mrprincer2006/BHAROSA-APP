import { getAnalytics, exportAnalytics, importAnalytics } from '../controllers/analyticsController.js';

export default function analyticsRoutes(app) {
  // Get analytics data
  app.get('/api/analytics', getAnalytics);
  
  // Export analytics data
  app.get('/api/analytics/export', exportAnalytics);
  
  // Import analytics data
  app.post('/api/analytics/import', importAnalytics);
}
