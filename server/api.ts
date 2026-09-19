import { Router, Request, Response } from 'express';
import { db, normalizeWhatsAppNumber } from './db';
import {
  sendEmail,
  generateOrderReceiptEmailHtml,
  generateReviewThankYouEmailHtml,
  generateOrderStatusUpdateEmailHtml,
} from './email';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'connected (persistent atomic JSON store)',
  });
});

// Store Configuration & Branding
apiRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = db.getConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get config' });
  }
});

apiRouter.put('/config', (req: Request, res: Response) => {
  try {
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const updated = db.updateConfig(req.body, actor);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update config' });
  }
});

// Categories
apiRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories' });
  }
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const { displayName, description, image } = req.body;
    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Category displayName is required' });
    }
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const category = db.addCategory(displayName, description, image, actor);
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create category' });
  }
});

// Products
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category, search, sort, featured, status } = req.query;
    const products = db.getProducts({
      category: category as string,
      search: search as string,
      sort: sort as string,
      featured: featured === 'true',
      status: (status as any) || 'published',
    });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: `Product with ID '${req.params.id}' not found` });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get product' });
  }
});

apiRouter.post('/products', (req: Request, res: Response) => {
  try {
    const { name, price } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid product price is required' });
    }
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const product = db.createProduct(req.body, actor);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  try {
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const updated = db.updateProduct(req.params.id, req.body, actor);
    if (!updated) {
      return res.status(404).json({ error: `Product with ID '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const success = db.deleteProduct(req.params.id, actor);
    if (!success) {
      return res.status(404).json({ error: `Product with ID '${req.params.id}' not found` });
    }
    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// Orders
apiRouter.get('/orders', (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const orders = db.getOrders({
      status: status as string,
      search: search as string,
    });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

// Customer order lookup by phone or unique ID
apiRouter.get('/orders/lookup', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const orders = db.searchCustomerOrders(query);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lookup customer orders' });
  }
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  try {
    const order = db.getOrderByIdOrToken(req.params.id);
    if (!order) {
      return res.status(404).json({ error: `Order '${req.params.id}' not found` });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch order' });
  }
});

apiRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const { customer, items, shipping, token } = req.body;
    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const order = db.createOrder({
      customer,
      items,
      shipping,
      token,
    });

    // If customer provided email and email system is enabled, dispatch order confirmation receipt
    if (customer.email && customer.email.includes('@')) {
      const config = db.getConfig();
      if (config.features.emailSystem) {
        sendEmail({
          to: customer.email,
          subject: `Order Registered - ${order.orderNumber || order.orderId} (${config.store.name})`,
          html: generateOrderReceiptEmailHtml(order, config),
          type: 'order_confirmation',
          orderId: order.orderId,
          orderNumber: order.orderNumber || undefined,
          config,
        }).catch(e => console.error('Background order email failed:', e));
      }
    }

    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

apiRouter.put('/orders/:id/status', (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const actor = (req.headers['x-admin-user'] as string) || 'admin@ecommercesite.com';
    const order = db.updateOrderStatus(req.params.id, status, actor, notes);
    if (!order) {
      return res.status(404).json({ error: `Order '${req.params.id}' not found` });
    }

    // If customer has email, send status update
    if (order.customer.email && order.customer.email.includes('@')) {
      const config = db.getConfig();
      if (config.features.emailSystem) {
        sendEmail({
          to: order.customer.email,
          subject: `Order Update: #${order.orderNumber || order.orderId} is ${status.toUpperCase()} (${config.store.name})`,
          html: generateOrderStatusUpdateEmailHtml(order, config),
          type: 'order_status_update',
          orderId: order.orderId,
          orderNumber: order.orderNumber || undefined,
          config,
        }).catch(e => console.error('Background status email failed:', e));
      }
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order status' });
  }
});

// ==========================================
// REVIEWS API (NEW TABLE)
// ==========================================

// Get reviews (filter by orderId, productId, status)
apiRouter.get('/reviews', (req: Request, res: Response) => {
  try {
    const { orderId, productId, status } = req.query;
    const reviews = db.getReviews({
      orderId: orderId as string,
      productId: productId as string,
      status: status as string,
    });
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
});

// Get single review by reviewId or by orderId
apiRouter.get('/reviews/order/:orderId', (req: Request, res: Response) => {
  try {
    const review = db.getReviewByOrderId(req.params.orderId);
    if (!review) {
      return res.status(404).json({ error: 'No review found for this order' });
    }
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch review' });
  }
});

apiRouter.get('/reviews/:id', (req: Request, res: Response) => {
  try {
    const review = db.getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch review' });
  }
});

// Create a review for an order
apiRouter.post('/reviews', (req: Request, res: Response) => {
  try {
    const {
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      rating,
      comment,
      productId,
      productName,
      tags,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required to leave a review' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Review comment is required' });
    }

    const review = db.createReview({
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      rating: Number(rating),
      comment,
      productId,
      productName,
      tags,
    });

    // Send Thank You email if email provided and email system enabled
    if (review.customerEmail && review.customerEmail.includes('@')) {
      const config = db.getConfig();
      if (config.features.emailSystem) {
        sendEmail({
          to: review.customerEmail,
          subject: `Thank you for reviewing Order ${review.orderNumber || review.orderId}! - ${config.store.name}`,
          html: generateReviewThankYouEmailHtml(review, config),
          type: 'review_notification',
          orderId: review.orderId,
          orderNumber: review.orderNumber || undefined,
          config,
        }).catch(e => console.error('Background review email failed:', e));
      }
    }

    res.status(201).json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit review' });
  }
});

// Update review (or add admin reply)
apiRouter.put('/reviews/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateReview(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update review' });
  }
});

// Delete review
apiRouter.delete('/reviews/:id', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteReview(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ success: true, message: `Review ${req.params.id} deleted` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete review' });
  }
});

// ==========================================
// EMAIL SYSTEM API
// ==========================================

// Get sent email logs
apiRouter.get('/emails', (req: Request, res: Response) => {
  try {
    const emails = db.getEmailLogs();
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch email logs' });
  }
});

// Send Order Receipt / Invoice to customer email
apiRouter.post('/email/send-order-receipt', async (req: Request, res: Response) => {
  try {
    const { orderId, email } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const order = db.getOrderByIdOrToken(orderId);
    if (!order) {
      return res.status(404).json({ error: `Order '${orderId}' not found` });
    }

    const targetEmail = email || order.customer.email;
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid customer email address is required' });
    }

    // Save email to order if it wasn't there
    if (!order.customer.email) {
      order.customer.email = targetEmail;
      db.updateOrderStatus(order.orderId, order.status, 'system', 'Email updated for invoice receipt dispatch');
    }

    const config = db.getConfig();
    const result = await sendEmail({
      to: targetEmail,
      subject: `Official Order Invoice & Receipt - #${order.orderNumber || order.orderId} (${config.store.name})`,
      html: generateOrderReceiptEmailHtml(order, config),
      type: 'invoice_receipt',
      orderId: order.orderId,
      orderNumber: order.orderNumber || undefined,
      config,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send email' });
    }

    res.json({
      success: true,
      message: `Invoice receipt dispatched successfully to ${targetEmail}`,
      messageId: result.messageId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error sending order invoice email' });
  }
});

// Send a test email
apiRouter.post('/email/test', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid recipient email address is required' });
    }

    const config = db.getConfig();
    const testHtml = `<div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: auto; border: 1px solid #e7e5e4; border-radius: 12px;">
      <h2 style="color: #059669; margin-top:0;">Email System Operational</h2>
      <p>This is a verification test email from <strong>${config.store.name}</strong>.</p>
      <div style="background: #f5f5f4; padding: 12px; border-radius: 8px; font-size: 13px; font-family: monospace;">
        Timestamp: ${new Date().toISOString()}<br>
        Store: ${config.store.name}<br>
        WhatsApp: ${config.contact.whatsappNumber}
      </div>
      <p style="color: #78716c; font-size: 12px; margin-top: 16px;">The automated email notification engine is active and functioning properly.</p>
    </div>`;

    const result = await sendEmail({
      to,
      subject: `Test Verification - ${config.store.name} Email System`,
      html: testHtml,
      type: 'test_email',
      config,
    });

    res.json({
      success: result.success,
      message: result.success ? `Test email dispatched to ${to}` : result.error,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch test email' });
  }
});

// Database raw dump
apiRouter.get('/database/dump', (req: Request, res: Response) => {
  try {
    res.json(db.getRawDatabase());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Stats
apiRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard stats' });
  }
});

// Audit Logs
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = db.getAuditLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

// Documentation of API Endpoints for the user
apiRouter.get('/schema-docs', (req: Request, res: Response) => {
  res.json({
    description: 'WhatsApp Ecommerce Platform REST API Documentation',
    baseUrl: '/api',
    endpoints: [
      { method: 'GET', path: '/api/health', summary: 'Health check & database status' },
      { method: 'GET', path: '/api/config', summary: 'Get current store branding & configuration' },
      { method: 'PUT', path: '/api/config', summary: 'Update store branding, WhatsApp number, colors, headers' },
      { method: 'GET', path: '/api/categories', summary: 'Get normalized categories with product count' },
      { method: 'POST', path: '/api/categories', summary: 'Add a new category (auto-normalized)' },
      { method: 'GET', path: '/api/products', summary: 'Query products (?category=&search=&sort=&status=)' },
      { method: 'GET', path: '/api/products/:id', summary: 'Get single product by deterministic ID (e.g. sho_1245832)' },
      { method: 'POST', path: '/api/products', summary: 'Create product (generates [cat]_[7digits] format)' },
      { method: 'PUT', path: '/api/products/:id', summary: 'Update product properties, pricing & stock' },
      { method: 'DELETE', path: '/api/products/:id', summary: 'Delete product by ID' },
      { method: 'GET', path: '/api/orders', summary: 'Get orders list with filter by status or search' },
      { method: 'GET', path: '/api/orders/lookup?q=', summary: 'Lookup customer orders by phone, order #, or token' },
      { method: 'GET', path: '/api/orders/:id', summary: 'Get order by orderId, orderNumber (#3943222), or token' },
      { method: 'POST', path: '/api/orders', summary: 'Create pending order from WhatsApp guest checkout' },
      { method: 'PUT', path: '/api/orders/:id/status', summary: 'Update status (auto generates #3943222 on confirm)' },
      { method: 'GET', path: '/api/reviews', summary: 'Fetch customer reviews (?orderId=&productId=&status=)' },
      { method: 'GET', path: '/api/reviews/:id', summary: 'Get single review by reviewId' },
      { method: 'GET', path: '/api/reviews/order/:orderId', summary: 'Get customer review for a specific order' },
      { method: 'POST', path: '/api/reviews', summary: 'Leave/Submit a review for completed order (stored in reviews table)' },
      { method: 'PUT', path: '/api/reviews/:id', summary: 'Update review rating, comment or add admin reply' },
      { method: 'DELETE', path: '/api/reviews/:id', summary: 'Delete review by ID' },
      { method: 'GET', path: '/api/emails', summary: 'Get recent sent transactional email logs' },
      { method: 'POST', path: '/api/email/send-order-receipt', summary: 'Dispatches full HTML invoice receipt to email' },
      { method: 'POST', path: '/api/email/test', summary: 'Dispatches test verification email to recipient' },
      { method: 'GET', path: '/api/database/dump', summary: 'Complete JSON database dump (products, orders, reviews, emails)' },
      { method: 'GET', path: '/api/stats', summary: 'Analytics, revenue, order totals, and low stock count' },
      { method: 'GET', path: '/api/audit-logs', summary: 'Traceable administrative audit activity logs' },
    ],
  });
});
