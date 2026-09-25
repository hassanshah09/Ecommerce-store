import type {
  Product,
  Category,
  Order,
  StoreConfig,
  AuditLog,
  DashboardStats,
  Review,
  EmailLog,
} from '../types';
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, firestore } from '../firebase';

const API_BASE = '/api';
const STORE_CONFIG_REF = doc(firestore, 'settings', 'storeConfig');

function isHostedBuild(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.web.app');
}

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(removeUndefined) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)]),
    ) as T;
  }
  return value;
}

function mergeStoreConfig(current: StoreConfig, changes: Partial<StoreConfig>): StoreConfig {
  return {
    ...current,
    ...changes,
    store: { ...current.store, ...(changes.store || {}) },
    branding: { ...current.branding, ...(changes.branding || {}) },
    contact: { ...current.contact, ...(changes.contact || {}) },
    announcement: { ...current.announcement, ...(changes.announcement || {}) },
    header: { ...current.header, ...(changes.header || {}) },
    footer: { ...current.footer, ...(changes.footer || {}) },
    theme: { ...current.theme, ...(changes.theme || {}) },
    checkout: { ...current.checkout, ...(changes.checkout || {}) },
    features: { ...current.features, ...(changes.features || {}) },
    emailSettings: changes.emailSettings || current.emailSettings,
  };
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Request failed with ${res.status} ${res.statusText || 'error'}: ${text.slice(0, 160)}`);
  }
}

export function formatPKR(amount: number, currency = 'PKR'): string {
  return `${currency} ${amount.toLocaleString('en-PK')}`;
}

export function normalizeWhatsApp(phone: string): string {
  if (!phone) return '923115365367';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1);
  }
  return cleaned;
}

export function buildWhatsAppOrderLink(
  phone: string,
  data: {
    productName?: string;
    productId?: string;
    quantity?: number;
    price?: number;
    total: number;
    currency?: string;
    productUrl?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    orderToken?: string;
    items?: { name: string; productId: string; quantity: number; price: number; selectedVariant?: string }[];
  }
): string {
  const normalizedNumber = normalizeWhatsApp(phone);
  const currency = data.currency || 'PKR';

  let message = `*Assalam-o-Alaikum! I want to place an order.*\n\n`;

  if (data.items && data.items.length > 0) {
    message += `🛒 *Order Items:*\n`;
    data.items.forEach((item, idx) => {
      message += `${idx + 1}. *${item.name}* (ID: \`${item.productId}\`)\n`;
      if (item.selectedVariant) {
        message += `   Variant: ${item.selectedVariant}\n`;
      }
      message += `   Qty: ${item.quantity} × ${currency} ${item.price.toLocaleString()}\n`;
    });
  } else if (data.productName) {
    message += `📦 *Product:* ${data.productName}\n`;
    message += `🏷️ *Product ID:* \`${data.productId || 'N/A'}\`\n`;
    message += `🔢 *Quantity:* ${data.quantity || 1}\n`;
    message += `💰 *Unit Price:* ${currency} ${(data.price || 0).toLocaleString()}\n`;
    if (data.productUrl) {
      message += `🔗 *Product Link:* ${data.productUrl}\n`;
    }
  }

  message += `\n💵 *Order Total:* *${currency} ${data.total.toLocaleString()}*`;

  if (data.customerName) {
    message += `\n\n👤 *Customer Details:*`;
    message += `\n• Name: ${data.customerName}`;
    if (data.customerPhone) message += `\n• Phone: ${data.customerPhone}`;
    if (data.customerAddress) message += `\n• Address: ${data.customerAddress}`;
  }

  if (data.orderToken) {
    message += `\n\n🔐 *Order Verification Token:* \`${data.orderToken}\``;
  }

  message += `\n\nPlease confirm my order availability and dispatch details. Thank you!`;

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

export async function fetchStoreConfig(): Promise<StoreConfig> {
  if (isHostedBuild()) {
    try {
      const snapshot = await getDoc(STORE_CONFIG_REF);
      if (snapshot.exists()) return snapshot.data() as StoreConfig;
    } catch {
      // Fall back to the API or local defaults when Firestore is unavailable.
    }
  }

  try {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Config fetch failed');
    return await res.json();
  } catch (e) {
    // Fallback if offline
    return {
      store: {
        name: 'NovaMart PK',
        tagline: 'Quality Products At Best Prices',
        currency: 'PKR',
        country: 'Pakistan',
        language: 'en',
      },
      branding: {
        logo: '',
        favicon: '',
        primaryColor: '#0f3d56',
        secondaryColor: '#16805b',
      },
      contact: {
        whatsappNumber: '03115365367',
        email: 'admin@ecommercesite.com',
        supportHours: '9:00 AM - 10:00 PM (PKT)',
      },
      announcement: {
        enabled: true,
        text: '✨ Free delivery on all orders above PKR 4,000 | Fast WhatsApp Checkout',
      },
      header: {
        showSearch: true,
        showCategories: true,
        showCart: true,
      },
      footer: {
        enabled: true,
        description: 'Your premier store for authentic lifestyle gadgets, footwear, and essentials.',
        showSocialLinks: true,
        copyright: '© 2026 NovaMart PK. All rights reserved.',
      },
      theme: {
        default: 'system',
        allowDarkMode: true,
        allowLightMode: true,
      },
      checkout: {
        allowGuestCheckout: true,
        whatsappOrdering: true,
      },
      features: {
        whatsappOrders: true,
        darkMode: true,
        guestCheckout: true,
        invoiceGeneration: true,
        emailSystem: true,
      },
    };
  }
}

export async function updateStoreConfig(config: Partial<StoreConfig>, adminUser?: string): Promise<StoreConfig> {
  const currentUser = auth.currentUser;
  const actor = adminUser || currentUser?.email || 'admin@digitaizesolution.com';
  if (config.store?.name !== undefined && !config.store.name.trim()) {
    throw new Error('Store name cannot be empty.');
  }
  if (config.contact?.whatsappNumber !== undefined && config.contact.whatsappNumber.replace(/\D/g, '').length < 10) {
    throw new Error('Enter a valid WhatsApp number with at least 10 digits.');
  }

  if (isHostedBuild()) {
    const snapshot = await getDoc(STORE_CONFIG_REF);
    const current = snapshot.exists() ? (snapshot.data() as StoreConfig) : await fetchStoreConfig();
    const updated = {
      ...mergeStoreConfig(current, config),
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
    try {
      await setDoc(STORE_CONFIG_REF, removeUndefined(updated), { merge: true });
    } catch (error: any) {
      throw new Error(error?.code === 'permission-denied'
        ? 'Firebase rejected this save. Sign in again with the approved admin account.'
        : error?.message || 'Firebase could not save the store configuration.');
    }
    return updated as StoreConfig;
  }

  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-user': actor,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
}

export function subscribeStoreConfig(onConfig: (config: StoreConfig) => void): Unsubscribe | null {
  if (!isHostedBuild()) return null;
  return onSnapshot(STORE_CONFIG_REF, (snapshot) => {
    if (snapshot.exists()) onConfig(snapshot.data() as StoreConfig);
  });
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return await res.json();
  } catch {
    return [];
  }
}

export async function createCategory(displayName: string, description?: string, image?: string): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, description, image }),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
}

export async function fetchProducts(options?: {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  status?: 'all' | 'published' | 'draft';
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (options?.category && options.category !== 'all') params.set('category', options.category);
  if (options?.search) params.set('search', options.search);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.featured) params.set('featured', 'true');
  if (options?.status) params.set('status', options.status);

  try {
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await parseJsonResponse<{ error?: string } | Record<string, never>>(res).catch(() => ({} as { error?: string }));
    throw new Error(err.error || 'Failed to create product');
  }
  return parseJsonResponse<Product>(res);
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await parseJsonResponse<{ error?: string } | Record<string, never>>(res).catch(() => ({} as { error?: string }));
    throw new Error(err.error || 'Failed to update product');
  }
  return parseJsonResponse<Product>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete product');
}

export async function fetchOrders(options?: { status?: string; search?: string }): Promise<Order[]> {
  const params = new URLSearchParams();
  if (options?.status && options.status !== 'all') params.set('status', options.status);
  if (options?.search) params.set('search', options.search);

  const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function fetchOrderById(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

export async function searchCustomerOrders(query: string): Promise<Order[]> {
  const clean = query.trim();
  if (!clean) return [];
  const res = await fetch(`${API_BASE}/orders/lookup?q=${encodeURIComponent(clean)}`);
  if (!res.ok) {
    // Fallback: try direct ID lookup
    try {
      const single = await fetchOrderById(clean);
      return single ? [single] : [];
    } catch {
      throw new Error('No matching orders found');
    }
  }
  return res.json();
}

export async function createOrder(payload: {
  customer: { name: string; phone: string; address?: string; city?: string; notes?: string };
  items: { productId: string; name: string; price: number; quantity: number; selectedVariant?: string; image?: string }[];
  shipping?: number;
  token?: string;
}): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create order');
  }
  return res.json();
}

export async function updateOrderStatus(orderId: string, status: Order['status'], notes?: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update order status');
  }
  return res.json();
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchSchemaDocs(): Promise<any> {
  const res = await fetch(`${API_BASE}/schema-docs`);
  if (!res.ok) throw new Error('Failed to fetch schema docs');
  return res.json();
}

// ==========================================
// REVIEWS CLIENT API
// ==========================================

export async function fetchReviews(filter?: { orderId?: string; productId?: string; status?: string }): Promise<Review[]> {
  const params = new URLSearchParams();
  if (filter?.orderId) params.set('orderId', filter.orderId);
  if (filter?.productId) params.set('productId', filter.productId);
  if (filter?.status) params.set('status', filter.status);

  const res = await fetch(`${API_BASE}/reviews?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReviewForOrder(orderId: string): Promise<Review | null> {
  try {
    const res = await fetch(`${API_BASE}/reviews/order/${encodeURIComponent(orderId)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch order review');
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitOrderReview(payload: {
  orderId: string;
  orderNumber?: string | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  rating: number;
  comment: string;
  productId?: string;
  productName?: string;
  tags?: string[];
}): Promise<Review> {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit review');
  }
  return res.json();
}

export async function deleteReview(reviewId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ==========================================
// EMAIL CLIENT API
// ==========================================

export async function fetchEmailLogs(): Promise<EmailLog[]> {
  const res = await fetch(`${API_BASE}/emails`);
  if (!res.ok) throw new Error('Failed to fetch email logs');
  return res.json();
}

export async function sendOrderReceiptEmail(
  orderId: string,
  email?: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const res = await fetch(`${API_BASE}/email/send-order-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to dispatch order receipt email');
  }
  return data;
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/email/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to dispatch test email');
  }
  return data;
}

