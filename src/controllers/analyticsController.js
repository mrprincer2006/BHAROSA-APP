import { getDb } from '../config/database.js';

// Analytics endpoints
export async function getAnalytics(req, res) {
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
}

export async function exportAnalytics(req, res) {
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
}

export async function importAnalytics(req, res) {
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
}

// Helper functions
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
