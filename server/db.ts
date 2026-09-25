import fs from 'fs';
import path from 'path';
import type {
  Product,
  Category,
  Order,
  StoreConfig,
  AuditLog,
  DashboardStats,
  StockStatus,
  Review,
  EmailLog,
} from '../src/types';

const DATA_DIR = process.env.FIREBASE_CONFIG ? '/tmp/ecommerce-data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STORE_CONFIG_FILE = path.join(process.cwd(), 'store.config.json');

// Ensure data directory exists in both local and serverless environments.
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function normalizeCategoryName(name: string): { id: string; displayName: string } {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const id = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'general';
  
  // Format title case for display
  const displayName = (cleaned || 'General')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return { id, displayName };
}

export function generateProductId(categoryName: string, existingIds: Set<string>): string {
  // Requirement: [first 3 category letters/normalized token]_[7 random digits]
  const cleanCat = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = (cleanCat.slice(0, 3) || 'prd').padEnd(3, 'x');

  let id = '';
  let attempts = 0;
  do {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7 digits
    id = `${prefix}_${randomDigits}`;
    attempts++;
  } while (existingIds.has(id) && attempts < 100);

  return id;
}

export function generateOrderNumber(existingNumbers: Set<string>): string {
  // Requirement: # + exactly 7 digits, sequential from #0000001 to #9999999.
  const MAX_ORDER_NUMBER = 9999999;
  const normalized = new Set(Array.from(existingNumbers).map((value) => value.replace(/\D/g, '')));

  for (let n = 1; n <= MAX_ORDER_NUMBER; n++) {
    const padded = String(n).padStart(7, '0');
    const candidate = `#${padded}`;
    if (!normalized.has(padded)) {
      return candidate;
    }
  }

  throw new Error('Order number range exhausted. Please reset or archive orders.');
}

export function normalizeWhatsAppNumber(num: string): string {
  if (!num) return '923115365367';
  let cleaned = num.replace(/\D/g, '');
  // If starts with 0 (e.g. 03115365367 for Pakistan), replace leading 0 with 92
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1);
  }
  return cleaned;
}

export function computeStockStatus(stock: number, lowThreshold = 5): StockStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= lowThreshold) return 'low_stock';
  return 'in_stock';
}

const DEFAULT_CONFIG: StoreConfig = {
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
    primaryColor: '#1e3a8a',
    secondaryColor: '#0f172a',
  },
  contact: {
    whatsappNumber: '03115365367',
    email: 'admin@ecommercesite.com',
    supportHours: '9:00 AM - 10:00 PM (PKT)',
  },
  announcement: {
    enabled: true,
    text: '✨ Free delivery on all orders above PKR 4,000 | Direct WhatsApp Ordering Available',
  },
  header: {
    showSearch: true,
    showCategories: true,
    showCart: true,
  },
  footer: {
    enabled: true,
    description: 'Your premier store for authentic lifestyle gadgets, footwear, and essentials. Order instantly via WhatsApp.',
    showSocialLinks: true,
    copyright: '© 2026 NovaMart PK. All rights reserved.',
  },
  theme: {
    default: 'light',
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

const INITIAL_CATEGORIES: Category[] = [
  { id: 'shoes', displayName: 'Shoes', description: 'Premium sneakers, athletic running shoes and leather formals', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80' },
  { id: 'electronics', displayName: 'Electronics', description: 'Smart audio, earbuds, smartwatches and high-end accessories', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
  { id: 'watches', displayName: 'Watches', description: 'Minimalist chronograph timepieces and fitness tracking bands', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
  { id: 'accessories', displayName: 'Accessories', description: 'Genuine leather wallets, messenger bags and travel gear', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80' },
  { id: 'apparel', displayName: 'Apparel', description: 'Comfortable oversized tees, hoodies, and lifestyle wear', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'sho_1245832',
    name: 'Velocity Pro Carbon Running Shoes',
    categoryId: 'shoes',
    categoryName: 'Shoes',
    description: 'Engineered with responsive nitrogen-infused foam and a lightweight carbon plate. Perfect for road running and marathon pacing. Breathable dual-layer mesh upper keeps your feet cool under extreme heat.',
    shortDescription: 'Ultra-responsive carbon plated road running shoes with nitrogen foam.',
    price: 6499,
    discountPrice: 5299,
    brand: 'NovaStride',
    sku: 'NV-SH-001',
    stock: 24,
    lowStockThreshold: 5,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Size', options: ['40 EUR', '41 EUR', '42 EUR', '43 EUR', '44 EUR'] },
      { name: 'Color', options: ['Crimson Red', 'Obsidian Black', 'Lunar White'] },
    ],
    tags: ['shoes', 'running', 'sport', 'carbon', 'velocity'],
    status: 'published',
    featured: true,
    newArrival: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ele_4839201',
    name: 'Acoustic Pulse ANC Wireless Earbuds',
    categoryId: 'electronics',
    categoryName: 'Electronics',
    description: 'Hybrid Active Noise Cancellation up to 42dB with transparency mode, quad-mic beamforming for crystal clear WhatsApp voice notes, and 36-hour battery endurance with Qi wireless fast charging.',
    shortDescription: 'Active noise cancelling wireless earbuds with 36hr battery & wireless case.',
    price: 4999,
    discountPrice: 3999,
    brand: 'AcousticLab',
    sku: 'NV-EL-002',
    stock: 18,
    lowStockThreshold: 4,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Color', options: ['Matte Black', 'Frost Silver', 'Midnight Blue'] },
    ],
    tags: ['earbuds', 'audio', 'wireless', 'anc', 'bluetooth'],
    status: 'published',
    featured: true,
    newArrival: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wat_9281743',
    name: 'Chronos Sapphire Minimalist Watch',
    categoryId: 'watches',
    categoryName: 'Watches',
    description: 'Hand-assembled 40mm 316L stainless steel casing paired with genuine Italian full-grain leather strap. Features a scratch-resistant sapphire crystal dome and precise Japanese Miyota quartz movement.',
    shortDescription: 'Sleek 40mm stainless steel timepiece with genuine Italian leather strap.',
    price: 7999,
    discountPrice: 6899,
    brand: 'Chronos Heritage',
    sku: 'NV-WT-003',
    stock: 8,
    lowStockThreshold: 5,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Strap', options: ['Tan Leather', 'Deep Black Leather', 'Milanese Mesh'] },
    ],
    tags: ['watch', 'luxury', 'minimalist', 'leather', 'chronograph'],
    status: 'published',
    featured: true,
    newArrival: false,
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_7391024',
    name: 'Heritage Full-Grain Leather Bi-Fold Wallet',
    categoryId: 'accessories',
    categoryName: 'Accessories',
    description: 'Handcrafted from vegetable-tanned full-grain cowhide leather that develops a rich, unique patina over time. Equipped with RFID blocking foil to shield credit cards from wireless skimmers.',
    shortDescription: 'Handcrafted RFID-blocking vegetable tanned leather bi-fold wallet.',
    price: 2499,
    discountPrice: 1999,
    brand: 'Craftsman Guild',
    sku: 'NV-AC-004',
    stock: 35,
    lowStockThreshold: 5,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Leather Tone', options: ['Vintage Brown', 'Midnight Charcoal', 'Cognac Tan'] },
    ],
    tags: ['wallet', 'leather', 'rfid', 'accessories'],
    status: 'published',
    featured: false,
    newArrival: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sho_8392109',
    name: 'Streetwear High-Top Suede Sneakers',
    categoryId: 'shoes',
    categoryName: 'Shoes',
    description: 'Iconic street silhouette crafted with water-repellent brushed suede and vulcanized gum rubber soles. Cushion padded collar provides all-day ankle support.',
    shortDescription: 'Brushed suede high-top sneaker with reinforced vulcanized gum sole.',
    price: 5899,
    discountPrice: 4799,
    brand: 'NovaStride',
    sku: 'NV-SH-005',
    stock: 4,
    lowStockThreshold: 5,
    stockStatus: 'low_stock',
    thumbnail: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Size', options: ['41 EUR', '42 EUR', '43 EUR'] },
      { name: 'Color', options: ['Sand Beige', 'Forest Olive'] },
    ],
    tags: ['shoes', 'sneakers', 'suede', 'streetwear'],
    status: 'published',
    featured: true,
    newArrival: false,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ele_1928374',
    name: 'MagCharge 3-in-1 Aluminum Stand',
    categoryId: 'electronics',
    categoryName: 'Electronics',
    description: 'CNC machined anodized aluminum charging station. Simultaneously fast-charges smartphone, smartwatch, and wireless earbuds with a single USB-C cable.',
    shortDescription: 'Sleek desktop aluminum wireless charging station for 3 devices.',
    price: 3499,
    discountPrice: 2899,
    brand: 'VoltDesk',
    sku: 'NV-EL-006',
    stock: 12,
    lowStockThreshold: 3,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Finish', options: ['Space Gray', 'Silver Metallic'] },
    ],
    tags: ['wireless charger', 'stand', 'aluminum', 'desk setup'],
    status: 'published',
    featured: false,
    newArrival: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'app_6584930',
    name: 'Heavyweight Loopback French Terry Hoodie',
    categoryId: 'apparel',
    categoryName: 'Apparel',
    description: 'Spun from 460 GSM 100% organic cotton. Features dropped shoulders, ribbed cuffs, and double-lined ergonomic hood without drawstrings for a modern, clean silhouette.',
    shortDescription: '460 GSM luxury organic heavyweight cotton hoodie with relaxed fit.',
    price: 3999,
    discountPrice: 3299,
    brand: 'NovaWear',
    sku: 'NV-AP-007',
    stock: 0,
    lowStockThreshold: 5,
    stockStatus: 'out_of_stock',
    thumbnail: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Size', options: ['S', 'M', 'L', 'XL'] },
      { name: 'Color', options: ['Oatmeal Heather', 'Washed Black', 'Pine Green'] },
    ],
    tags: ['hoodie', 'apparel', 'cotton', 'oversized'],
    status: 'published',
    featured: false,
    newArrival: false,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wat_3847291',
    name: 'AeroSmart GPS Fitness Smartwatch',
    categoryId: 'watches',
    categoryName: 'Watches',
    description: '1.43-inch AMOLED display with 1000 nits peak outdoor brightness. Built-in dual-band GNSS GPS, SpO2 blood oxygen tracking, 14-day battery life, and 5ATM waterproof rating.',
    shortDescription: 'AMOLED dual-band GPS smartwatch with 14-day battery life & 5ATM water resistance.',
    price: 6999,
    discountPrice: 5999,
    brand: 'Chronos Heritage',
    sku: 'NV-WT-008',
    stock: 15,
    lowStockThreshold: 4,
    stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { name: 'Band', options: ['Silicone Sport Black', 'Woven Nylon Green'] },
    ],
    tags: ['smartwatch', 'fitness', 'gps', 'amoled'],
    status: 'published',
    featured: true,
    newArrival: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'sho_8490165', name: 'AeroFlex Knit Everyday Sneakers', categoryId: 'shoes', categoryName: 'Shoes',
    description: 'Lightweight knit sneakers with a cushioned sole for everyday city walking and travel.', shortDescription: 'Breathable everyday sneakers with a soft cushioned sole.', price: 5499, discountPrice: 4499, brand: 'NovaStride', sku: 'NV-SH-009', stock: 16, lowStockThreshold: 5, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Size', options: ['40 EUR', '41 EUR', '42 EUR', '43 EUR'] }, { name: 'Color', options: ['Cloud White', 'Graphite'] }], tags: ['shoes', 'sneakers', 'casual'], status: 'published', featured: false, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'ele_9003186', name: 'StudioCore Bluetooth Desk Speaker', categoryId: 'electronics', categoryName: 'Electronics',
    description: 'Compact wireless speaker with balanced stereo sound, USB-C charging, and a warm studio finish.', shortDescription: 'Compact Bluetooth speaker for desks, bedrooms, and travel.', price: 6499, discountPrice: 5599, brand: 'AcousticLab', sku: 'NV-EL-010', stock: 12, lowStockThreshold: 4, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Color', options: ['Sandstone', 'Midnight Black'] }], tags: ['speaker', 'bluetooth', 'audio'], status: 'published', featured: true, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'wat_7540129', name: 'Meridian Steel Chronograph', categoryId: 'watches', categoryName: 'Watches',
    description: 'Polished stainless steel chronograph with a clean black dial and Japanese quartz movement.', shortDescription: 'Refined stainless steel chronograph with a black dial.', price: 8999, discountPrice: 7499, brand: 'Chronos Heritage', sku: 'NV-WT-011', stock: 7, lowStockThreshold: 3, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Strap', options: ['Steel Bracelet', 'Black Leather'] }], tags: ['watch', 'chronograph', 'steel'], status: 'published', featured: true, newArrival: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_8040295', name: 'Canvas Weekender Travel Bag', categoryId: 'accessories', categoryName: 'Accessories',
    description: 'Structured canvas weekender with leather carry handles, shoe compartment, and a padded shoulder strap.', shortDescription: 'Durable canvas travel bag with a separate shoe compartment.', price: 4299, discountPrice: 3599, brand: 'Craftsman Guild', sku: 'NV-AC-012', stock: 14, lowStockThreshold: 5, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Color', options: ['Olive Canvas', 'Charcoal Canvas'] }], tags: ['travel', 'bag', 'weekender'], status: 'published', featured: false, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_1828875', name: 'Minimal Card Holder Wallet', categoryId: 'accessories', categoryName: 'Accessories',
    description: 'Slim full-grain leather card holder with six card slots and a central cash sleeve.', shortDescription: 'Slim full-grain leather card holder with six practical slots.', price: 1799, discountPrice: 1399, brand: 'Craftsman Guild', sku: 'NV-AC-013', stock: 28, lowStockThreshold: 5, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Color', options: ['Cognac', 'Black'] }], tags: ['wallet', 'leather', 'minimal'], status: 'published', featured: false, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'app_3000845', name: 'Heavyweight Essential Overshirt', categoryId: 'apparel', categoryName: 'Apparel',
    description: 'Structured heavyweight cotton overshirt with a relaxed fit, utility pockets, and durable metal buttons.', shortDescription: 'Relaxed heavyweight cotton overshirt for layered everyday styling.', price: 3899, discountPrice: 3199, brand: 'NovaWear', sku: 'NV-AP-014', stock: 19, lowStockThreshold: 5, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['Stone', 'Deep Navy'] }], tags: ['apparel', 'overshirt', 'cotton'], status: 'published', featured: true, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'app_5033865', name: 'Performance Polo Shirt', categoryId: 'apparel', categoryName: 'Apparel',
    description: 'Moisture-wicking performance polo with stretch fabric, a structured collar, and quick-dry comfort.', shortDescription: 'Breathable quick-dry polo for workdays and weekends.', price: 2499, discountPrice: 1999, brand: 'NovaWear', sku: 'NV-AP-015', stock: 22, lowStockThreshold: 5, stockStatus: 'in_stock',
    thumbnail: 'https://images.unsplash.com/photo-1625910513413-5fc45e9e4a27?auto=format&fit=crop&w=800&q=80', images: ['https://images.unsplash.com/photo-1625910513413-5fc45e9e4a27?auto=format&fit=crop&w=800&q=80'], variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['White', 'Black', 'Sky Blue'] }], tags: ['apparel', 'polo', 'activewear'], status: 'published', featured: false, newArrival: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    orderId: 'ord_sample_001',
    orderNumber: '#3943222',
    status: 'confirmed',
    customer: {
      name: 'Usman Tariq',
      phone: '03124567890',
      address: 'House 42, Block B, DHA Phase 5',
      city: 'Lahore',
      notes: 'Please call before arrival.',
    },
    items: [
      {
        productId: 'sho_1245832',
        name: 'Velocity Pro Carbon Running Shoes',
        price: 5299,
        quantity: 1,
        selectedVariant: 'Size: 42 EUR | Color: Crimson Red',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80',
      },
      {
        productId: 'acc_7391024',
        name: 'Heritage Full-Grain Leather Bi-Fold Wallet',
        price: 1999,
        quantity: 1,
        selectedVariant: 'Leather Tone: Vintage Brown',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=200&q=80',
      },
    ],
    subtotal: 7298,
    shipping: 0,
    total: 7298,
    whatsapp: {
      number: '923115365367',
      messageGenerated: true,
      sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    token: 'tok_v81739281729',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    confirmedAt: new Date(Date.now() - 86400000 * 1.8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.8).toISOString(),
    notes: 'Verified via WhatsApp chat by admin.',
  },
  {
    orderId: 'ord_sample_002',
    orderNumber: null,
    status: 'under_verification',
    customer: {
      name: 'Ayesha Khan',
      phone: '03019876543',
      address: 'Apartment 5B, Clifton Block 4',
      city: 'Karachi',
      notes: 'Leave with concierge if not available.',
    },
    items: [
      {
        productId: 'ele_4839201',
        name: 'Acoustic Pulse ANC Wireless Earbuds',
        price: 3999,
        quantity: 2,
        selectedVariant: 'Color: Matte Black',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=200&q=80',
      },
    ],
    subtotal: 7998,
    shipping: 0,
    total: 7998,
    whatsapp: {
      number: '923115365367',
      messageGenerated: true,
      sentAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    token: 'tok_w92817364510',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    orderId: 'ord_sample_003',
    orderNumber: '#8192301',
    status: 'delivered',
    customer: {
      name: 'Hamza Malik',
      phone: '03001234567',
      email: 'hamza.malik@gmail.com',
      address: 'Street 14, Sector F-7/2',
      city: 'Islamabad',
      notes: 'Ring the doorbell upon delivery.',
    },
    items: [
      {
        productId: 'wat_9281743',
        name: 'Chronos Sapphire Minimalist Watch',
        price: 6899,
        quantity: 1,
        selectedVariant: 'Strap: Italian Brown Leather',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
      },
    ],
    subtotal: 6899,
    shipping: 0,
    total: 6899,
    whatsapp: {
      number: '923115365367',
      messageGenerated: true,
      sentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    token: 'tok_k82910492817',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    confirmedAt: new Date(Date.now() - 86400000 * 4.8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    notes: 'Delivered via Express Courier. Customer confirmed on WhatsApp.',
  },
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev_sample_001',
    orderId: 'ord_sample_001',
    orderNumber: '#3943222',
    customerName: 'Usman Tariq',
    customerPhone: '03124567890',
    customerEmail: 'usman.tariq@gmail.com',
    rating: 5,
    comment: 'The Velocity Pro running shoes are authentic and super comfortable! Fast delivery to Lahore within 2 days. WhatsApp coordination was very smooth.',
    productId: 'sho_1245832',
    productName: 'Velocity Pro Carbon Running Shoes',
    verifiedPurchase: true,
    tags: ['Super Comfortable', 'Fast Delivery', '100% Authentic'],
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    status: 'published',
  },
  {
    id: 'rev_sample_002',
    orderId: 'ord_sample_003',
    orderNumber: '#8192301',
    customerName: 'Hamza Malik',
    customerPhone: '03001234567',
    customerEmail: 'hamza.malik@gmail.com',
    rating: 5,
    comment: 'Exquisite build quality on the Chronos Sapphire watch! The genuine leather strap and scratch-proof sapphire crystal look even better in person.',
    productId: 'wat_9281743',
    productName: 'Chronos Sapphire Minimalist Watch',
    verifiedPurchase: true,
    tags: ['Premium Finish', 'True To Photos', 'Highly Recommended'],
    createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    status: 'published',
  },
];

const INITIAL_EMAIL_LOGS: EmailLog[] = [
  {
    id: 'eml_sample_001',
    to: 'usman.tariq@gmail.com',
    from: '"NovaMart PK Support" <orders@novamart.pk>',
    subject: 'Order Confirmation & Official Invoice - #3943222',
    type: 'order_confirmation',
    status: 'sent',
    sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    orderId: 'ord_sample_001',
    orderNumber: '#3943222',
    previewSnippet: 'Thank you for shopping with NovaMart PK. Your order #3943222 has been verified and registered for dispatch.',
  },
  {
    id: 'eml_sample_002',
    to: 'hamza.malik@gmail.com',
    from: '"NovaMart PK Support" <orders@novamart.pk>',
    subject: 'Thank you for your review! - Order #8192301',
    type: 'review_notification',
    status: 'sent',
    sentAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    orderId: 'ord_sample_003',
    orderNumber: '#8192301',
    previewSnippet: 'We genuinely appreciate you taking the time to share your feedback for Order #8192301! 5/5 Stars.',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_001',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    action: 'Order Confirmed',
    actor: 'admin@ecommercesite.com',
    details: 'Verified and confirmed WhatsApp order #3943222 for Usman Tariq (PKR 7,298)',
  },
  {
    id: 'log_002',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    action: 'Product Stock Updated',
    actor: 'admin@ecommercesite.com',
    details: 'Velocity Pro Carbon Running Shoes (sho_1245832) stock set to 24',
  },
  {
    id: 'log_003',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    action: 'Store Branding Initialized',
    actor: 'system',
    details: 'Configured WhatsApp business line 03115365367 with PKR currency',
  },
];

export interface DatabaseData {
  products: Product[];
  categories: Category[];
  orders: Order[];
  reviews: Review[];
  emails: EmailLog[];
  config: StoreConfig;
  auditLogs: AuditLog[];
}

class Database {
  private data: DatabaseData;

  constructor() {
    this.data = this.load();
  }

  private mergeConfig(baseConfig: StoreConfig, overrideConfig: Partial<StoreConfig>): StoreConfig {
    return {
      ...baseConfig,
      ...overrideConfig,
      store: { ...baseConfig.store, ...(overrideConfig.store || {}) },
      branding: { ...baseConfig.branding, ...(overrideConfig.branding || {}) },
      contact: { ...baseConfig.contact, ...(overrideConfig.contact || {}) },
      announcement: { ...(baseConfig.announcement || { enabled: false, text: '' }), ...(overrideConfig.announcement || {}) },
      header: { ...baseConfig.header, ...(overrideConfig.header || {}) },
      footer: { ...baseConfig.footer, ...(overrideConfig.footer || {}) },
      theme: { ...baseConfig.theme, ...(overrideConfig.theme || {}) },
      checkout: { ...baseConfig.checkout, ...(overrideConfig.checkout || {}) },
      features: { ...baseConfig.features, ...(overrideConfig.features || {}) },
      emailSettings: overrideConfig.emailSettings || baseConfig.emailSettings,
    };
  }

  private readStoreConfig(baseConfig: StoreConfig): StoreConfig {
    if (!fs.existsSync(STORE_CONFIG_FILE)) return baseConfig;

    try {
      const fileConfig = JSON.parse(fs.readFileSync(STORE_CONFIG_FILE, 'utf-8')) as Partial<StoreConfig>;
      return this.mergeConfig(baseConfig, fileConfig);
    } catch (err) {
      console.error('Error reading store.config.json:', err);
      return baseConfig;
    }
  }

  private load(): DatabaseData {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          products: parsed.products || [...INITIAL_PRODUCTS, ...INITIAL_DEMO_PRODUCTS],
          categories: parsed.categories || INITIAL_CATEGORIES,
          orders: parsed.orders || INITIAL_ORDERS,
          reviews: parsed.reviews || INITIAL_REVIEWS,
          emails: parsed.emails || INITIAL_EMAIL_LOGS,
          config: this.readStoreConfig(parsed.config || DEFAULT_CONFIG),
          auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
        };
      } catch (err) {
        console.error('Error loading db.json, initializing fresh data:', err);
      }
    }

    // Try reading store.config.json if available
    let config = DEFAULT_CONFIG;
    if (fs.existsSync(STORE_CONFIG_FILE)) {
      try {
        config = this.readStoreConfig(DEFAULT_CONFIG);
      } catch (e) {
        // ignore
      }
    }

    const initialData: DatabaseData = {
      products: [...INITIAL_PRODUCTS, ...INITIAL_DEMO_PRODUCTS],
      categories: INITIAL_CATEGORIES,
      orders: INITIAL_ORDERS,
      reviews: INITIAL_REVIEWS,
      emails: INITIAL_EMAIL_LOGS,
      config,
      auditLogs: INITIAL_AUDIT_LOGS,
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseData): void {
    const serialized = JSON.stringify(data, null, 2);
    const tmpFile = `${DB_FILE}.tmp`;
    try {
      fs.writeFileSync(tmpFile, serialized, 'utf-8');
      try {
        fs.renameSync(tmpFile, DB_FILE);
      } catch (renameError: any) {
        if (!['EPERM', 'EEXIST', 'ENOTEMPTY'].includes(renameError?.code)) throw renameError;
        fs.rmSync(DB_FILE, { force: true });
        fs.renameSync(tmpFile, DB_FILE);
      }
    } catch (err) {
      try {
        fs.writeFileSync(DB_FILE, serialized, 'utf-8');
      } catch (fallbackError) {
        console.error('Failed to write db.json:', fallbackError || err);
      }
    } finally {
      try {
        if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
      } catch {
        // Ignore cleanup errors after the database write has completed.
      }
    }
  }

  private commit(): void {
    this.saveData(this.data);
  }

  public logAction(action: string, actor: string, details: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.commit();
  }

  // CONFIG / BRANDING
  public getConfig(): StoreConfig {
    const fileConfig = this.readStoreConfig(this.data.config);
    if (JSON.stringify(fileConfig) !== JSON.stringify(this.data.config)) {
      this.data.config = fileConfig;
      this.commit();
    }
    return this.data.config;
  }

  public updateConfig(newConfig: Partial<StoreConfig>, actor = 'admin@ecommercesite.com'): StoreConfig {
    this.data.config = this.mergeConfig(this.data.config, newConfig);

    this.logAction('Store Settings Updated', actor, `Store config & branding updated (WhatsApp: ${this.data.config.contact.whatsappNumber})`);
    this.commit();
    try {
      fs.writeFileSync(STORE_CONFIG_FILE, JSON.stringify(this.data.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write store.config.json:', err);
    }
    return this.data.config;
  }

  // CATEGORIES
  public getCategories(): Category[] {
    // Count products per category
    const countMap: Record<string, number> = {};
    for (const p of this.data.products) {
      if (p.status === 'published') {
        countMap[p.categoryId] = (countMap[p.categoryId] || 0) + 1;
      }
    }
    return this.data.categories.map(cat => ({
      ...cat,
      productCount: countMap[cat.id] || 0,
    }));
  }

  public getOrCreateCategory(rawName: string): Category {
    const { id, displayName } = normalizeCategoryName(rawName);
    let cat = this.data.categories.find(c => c.id === id);
    if (!cat) {
      cat = {
        id,
        displayName,
        description: `All items in ${displayName}`,
      };
      this.data.categories.push(cat);
      this.commit();
    }
    return cat;
  }

  public addCategory(displayName: string, description?: string, image?: string, actor = 'admin@ecommercesite.com'): Category {
    const { id, displayName: formattedName } = normalizeCategoryName(displayName);
    const existing = this.data.categories.find(c => c.id === id);
    if (existing) {
      if (description) existing.description = description;
      if (image) existing.image = image;
      this.commit();
      return existing;
    }

    const newCat: Category = {
      id,
      displayName: formattedName,
      description,
      image,
    };
    this.data.categories.push(newCat);
    this.logAction('Category Created', actor, `Category added: ${formattedName} (${id})`);
    this.commit();
    return newCat;
  }

  // PRODUCTS
  public getProducts(options?: {
    category?: string;
    search?: string;
    sort?: string;
    featured?: boolean;
    status?: 'all' | 'published' | 'draft';
  }): Product[] {
    let result = [...this.data.products];

    if (options?.status && options.status !== 'all') {
      result = result.filter(p => p.status === options.status);
    }

    if (options?.category && options.category !== 'all') {
      const catNorm = options.category.toLowerCase().trim();
      result = result.filter(p => p.categoryId === catNorm);
    }

    if (options?.featured) {
      result = result.filter(p => p.featured);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (options?.sort) {
      switch (options.sort) {
        case 'price-asc':
          result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
          break;
        case 'price-desc':
          result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
          break;
        case 'newest':
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'popular':
        case 'featured':
          result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'auto':
        default:
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    } else {
      // Auto-sorted: Newest added products first so any admin added item is immediately at the top
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  public getProductById(id: string): Product | null {
    return this.data.products.find(p => p.id === id) || null;
  }

  public createProduct(payload: Partial<Product>, actor = 'admin@ecommercesite.com'): Product {
    const rawCategory = payload.categoryName || payload.categoryId || 'General';
    const category = this.getOrCreateCategory(rawCategory);

    const existingIds = new Set(this.data.products.map(p => p.id));
    const id = payload.id && !existingIds.has(payload.id)
      ? payload.id
      : generateProductId(category.displayName, existingIds);

    const stock = typeof payload.stock === 'number' ? payload.stock : 10;
    const lowThreshold = typeof payload.lowStockThreshold === 'number' ? payload.lowStockThreshold : 5;

    const newProduct: Product = {
      id,
      name: payload.name?.trim() || 'New Product',
      categoryId: category.id,
      categoryName: category.displayName,
      description: payload.description || '',
      shortDescription: payload.shortDescription || (payload.description?.slice(0, 100) || ''),
      price: Number(payload.price) || 0,
      discountPrice: payload.discountPrice ? Number(payload.discountPrice) : undefined,
      brand: payload.brand?.trim() || 'NovaMart',
      sku: payload.sku?.trim() || `NV-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock,
      lowStockThreshold: lowThreshold,
      stockStatus: computeStockStatus(stock, lowThreshold),
      thumbnail: payload.thumbnail || payload.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      images: payload.images && payload.images.length > 0 ? payload.images : [payload.thumbnail || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'],
      variants: payload.variants || [],
      tags: payload.tags || [category.id],
      status: payload.status || 'published',
      featured: Boolean(payload.featured),
      newArrival: payload.newArrival !== undefined ? Boolean(payload.newArrival) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.products.unshift(newProduct);
    this.data.products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.logAction('Product Created', actor, `Created product "${newProduct.name}" (ID: ${newProduct.id}, Price: PKR ${newProduct.price})`);
    this.commit();
    return newProduct;
  }

  public updateProduct(id: string, payload: Partial<Product>, actor = 'admin@ecommercesite.com'): Product | null {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = this.data.products[index];
    let category = { id: current.categoryId, displayName: current.categoryName };
    if (payload.categoryName && payload.categoryName !== current.categoryName) {
      category = this.getOrCreateCategory(payload.categoryName);
    }

    const stock = typeof payload.stock === 'number' ? payload.stock : current.stock;
    const lowThreshold = typeof payload.lowStockThreshold === 'number' ? payload.lowStockThreshold : current.lowStockThreshold;

    const updated: Product = {
      ...current,
      ...payload,
      id: current.id, // Immutable ID
      categoryId: category.id,
      categoryName: category.displayName,
      stock,
      lowStockThreshold: lowThreshold,
      stockStatus: computeStockStatus(stock, lowThreshold),
      updatedAt: new Date().toISOString(),
    };

    this.data.products[index] = updated;
    this.logAction('Product Updated', actor, `Updated product "${updated.name}" (${updated.id}) - Stock: ${updated.stock}, Status: ${updated.status}`);
    this.commit();
    return updated;
  }

  public deleteProduct(id: string, actor = 'admin@ecommercesite.com'): boolean {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return false;

    const removed = this.data.products.splice(index, 1)[0];
    this.logAction('Product Deleted', actor, `Deleted product "${removed.name}" (${removed.id})`);
    this.commit();
    return true;
  }

  // ORDERS
  public getOrders(options?: { status?: string; search?: string }): Order[] {
    let result = [...this.data.orders];

    if (options?.status && options.status !== 'all') {
      result = result.filter(o => o.status === options.status);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      const qDigits = q.replace(/\D/g, '');
      result = result.filter(o => {
        const orderPhoneDigits = (o.customer.phone || '').replace(/\D/g, '');
        const orderNumDigits = (o.orderNumber || '').replace(/\D/g, '');
        return (
          (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
          (qDigits && orderNumDigits.includes(qDigits)) ||
          o.orderId.toLowerCase().includes(q) ||
          o.token.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.includes(q) ||
          (qDigits.length >= 4 && orderPhoneDigits.includes(qDigits)) ||
          o.items.some(it => it.name.toLowerCase().includes(q) || it.productId.toLowerCase().includes(q))
        );
      });
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }

  public searchCustomerOrders(query: string): Order[] {
    const raw = query.trim();
    if (!raw) return [];
    const qLower = raw.toLowerCase();
    const queryDigits = raw.replace(/\D/g, '');

    const matches = this.data.orders.filter(o => {
      // 1. Direct Order Number (#3943222 or 3943222)
      if (o.orderNumber) {
        const numLower = o.orderNumber.toLowerCase();
        const numDigits = o.orderNumber.replace(/\D/g, '');
        if (numLower === qLower || numLower.includes(qLower)) return true;
        if (queryDigits && numDigits === queryDigits) return true;
      }

      // 2. Order ID or Token
      if (o.orderId.toLowerCase() === qLower || o.orderId.toLowerCase().includes(qLower)) return true;
      if (o.token.toLowerCase() === qLower || o.token.toLowerCase().includes(qLower)) return true;

      // 3. Customer Phone Number (normalized digits)
      if (queryDigits.length >= 7) {
        const orderPhoneDigits = (o.customer.phone || '').replace(/\D/g, '');
        if (orderPhoneDigits === queryDigits) return true;
        if (orderPhoneDigits.includes(queryDigits) || queryDigits.includes(orderPhoneDigits)) return true;
        // Check last 9 digits (handles 0300... vs 92300...)
        const qSuffix = queryDigits.slice(-9);
        const oSuffix = orderPhoneDigits.slice(-9);
        if (qSuffix.length >= 7 && qSuffix === oSuffix) return true;
      } else if (raw.length >= 4) {
        if (o.customer.phone && o.customer.phone.includes(raw)) return true;
      }

      return false;
    });

    matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return matches;
  }

  public getOrderByIdOrToken(identifier: string): Order | null {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    return (
      this.data.orders.find(o => {
        if (o.orderId.toLowerCase() === clean) return true;
        if (o.token.toLowerCase() === clean) return true;
        if (o.orderNumber) {
          if (o.orderNumber.toLowerCase() === clean) return true;
          const orderNumDigits = o.orderNumber.replace(/\D/g, '');
          if (cleanDigits && orderNumDigits === cleanDigits) return true;
        }
        return false;
      }) || null
    );
  }

  public createOrder(payload: {
    customer: { name: string; phone: string; address?: string; city?: string; notes?: string };
    items: { productId: string; name: string; price: number; quantity: number; selectedVariant?: string; image?: string }[];
    shipping?: number;
    token?: string;
  }): Order {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const token = payload.token || `tok_${Math.random().toString(36).substring(2, 12)}`;

    // Calculate subtotal
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = payload.shipping ?? (subtotal >= 4000 ? 0 : 250);
    const total = subtotal + shipping;

    const newOrder: Order = {
      orderId,
      orderNumber: null, // Assigned upon admin verification
      status: 'pending',
      customer: payload.customer,
      items: payload.items,
      subtotal,
      shipping,
      total,
      whatsapp: {
        number: normalizeWhatsAppNumber(this.data.config.contact.whatsappNumber),
        messageGenerated: true,
        sentAt: new Date().toISOString(),
      },
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.orders.unshift(newOrder);

    // Atomically adjust stock if possible
    for (const item of payload.items) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (prod && prod.stock > 0) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.stockStatus = computeStockStatus(prod.stock, prod.lowStockThreshold);
      }
    }

    this.commit();
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: Order['status'],
    actor = 'admin@ecommercesite.com',
    adminNotes?: string
  ): Order | null {
    const order = this.data.orders.find(o => o.orderId === orderId || o.orderNumber === orderId);
    if (!order) return null;

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (adminNotes) order.notes = adminNotes;

    // Requirement: When confirmed, generate unique # + 7 digits (e.g. #3943222) if not already assigned
    if (status === 'confirmed') {
      if (!order.orderNumber) {
        const existingOrderNumbers = new Set(
          this.data.orders.map(o => o.orderNumber).filter(Boolean) as string[]
        );
        order.orderNumber = generateOrderNumber(existingOrderNumbers);
        order.confirmedAt = new Date().toISOString();
      }
      this.logAction(
        'Order Confirmed',
        actor,
        `Order ${order.orderNumber} confirmed for ${order.customer.name} (PKR ${order.total.toLocaleString()})`
      );
    } else {
      this.logAction(
        'Order Status Changed',
        actor,
        `Order ${order.orderNumber || order.orderId} status changed from "${oldStatus}" to "${status}"`
      );
    }

    this.commit();
    return order;
  }

  // STATS
  public getDashboardStats(): DashboardStats {
    const orders = this.data.orders;
    const products = this.data.products;

    let totalSales = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    const productSalesMap: Record<string, { count: number; revenue: number; name: string }> = {};

    for (const o of orders) {
      if (o.status !== 'cancelled') {
        totalSales += o.total;
      }
      if (o.status === 'pending' || o.status === 'whatsapp_sent' || o.status === 'under_verification') {
        pendingCount++;
      } else if (o.status === 'confirmed' || o.status === 'processing') {
        confirmedCount++;
      } else if (o.status === 'delivered') {
        deliveredCount++;
      } else if (o.status === 'cancelled') {
        cancelledCount++;
      }

      for (const it of o.items) {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { count: 0, revenue: 0, name: it.name };
        }
        productSalesMap[it.productId].count += it.quantity;
        productSalesMap[it.productId].revenue += it.price * it.quantity;
      }
    }

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockCount = products.filter(p => p.stockStatus === 'low_stock').length;
    const outOfStockCount = products.filter(p => p.stockStatus === 'out_of_stock').length;

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: pendingCount,
      confirmedOrders: confirmedCount,
      deliveredOrders: deliveredCount,
      cancelledOrders: cancelledCount,
      lowStockCount,
      outOfStockCount,
      totalSales,
      recentOrders: orders.slice(0, 5),
      topProducts,
    };
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // REVIEWS
  public getReviews(filter?: { orderId?: string; productId?: string; status?: string }): Review[] {
    let reviews = [...(this.data.reviews || [])];

    if (filter?.orderId) {
      const cleanOrderId = filter.orderId.trim().toLowerCase();
      reviews = reviews.filter(
        r =>
          r.orderId.toLowerCase() === cleanOrderId ||
          (r.orderNumber && r.orderNumber.toLowerCase() === cleanOrderId)
      );
    }

    if (filter?.productId) {
      reviews = reviews.filter(r => r.productId === filter.productId);
    }

    if (filter?.status && filter.status !== 'all') {
      reviews = reviews.filter(r => r.status === filter.status);
    }

    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReviewById(id: string): Review | null {
    return (this.data.reviews || []).find(r => r.id === id) || null;
  }

  public getReviewByOrderId(orderId: string): Review | null {
    const clean = orderId.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    return (
      (this.data.reviews || []).find(r => {
        if (r.orderId.toLowerCase() === clean) return true;
        if (r.orderNumber) {
          if (r.orderNumber.toLowerCase() === clean) return true;
          const orderNumDigits = r.orderNumber.replace(/\D/g, '');
          if (cleanDigits && orderNumDigits === cleanDigits) return true;
        }
        return false;
      }) || null
    );
  }

  public createReview(payload: {
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
  }): Review {
    if (!this.data.reviews) {
      this.data.reviews = [];
    }

    // Check if order exists to verify purchase
    const matchingOrder = this.getOrderByIdOrToken(payload.orderId);
    const verifiedPurchase = Boolean(matchingOrder);

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReview: Review = {
      id: reviewId,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber || matchingOrder?.orderNumber || null,
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone?.trim() || matchingOrder?.customer.phone,
      customerEmail: payload.customerEmail?.trim() || matchingOrder?.customer.email,
      rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
      comment: payload.comment.trim(),
      productId: payload.productId,
      productName: payload.productName,
      verifiedPurchase,
      tags: payload.tags || ['Verified Purchase'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'published',
    };

    // If a review already exists for this order & product combination, update it
    const existingIndex = this.data.reviews.findIndex(
      r => r.orderId === payload.orderId && (!payload.productId || r.productId === payload.productId)
    );

    if (existingIndex >= 0) {
      this.data.reviews[existingIndex] = {
        ...this.data.reviews[existingIndex],
        ...newReview,
        id: this.data.reviews[existingIndex].id,
        updatedAt: new Date().toISOString(),
      };
      this.commit();
      this.logAction(
        'Review Updated',
        newReview.customerName,
        `Updated review for Order ${newReview.orderNumber || newReview.orderId} (${newReview.rating}★)`
      );
      return this.data.reviews[existingIndex];
    }

    this.data.reviews.unshift(newReview);
    this.commit();

    this.logAction(
      'Review Submitted',
      newReview.customerName,
      `New review submitted for Order ${newReview.orderNumber || newReview.orderId} (${newReview.rating}★)`
    );

    return newReview;
  }

  public updateReview(id: string, updates: Partial<Review>): Review | null {
    if (!this.data.reviews) return null;
    const review = this.data.reviews.find(r => r.id === id);
    if (!review) return null;

    Object.assign(review, updates, { updatedAt: new Date().toISOString() });
    this.commit();
    return review;
  }

  public deleteReview(id: string): boolean {
    if (!this.data.reviews) return false;
    const initialLen = this.data.reviews.length;
    this.data.reviews = this.data.reviews.filter(r => r.id !== id);
    if (this.data.reviews.length !== initialLen) {
      this.commit();
      this.logAction('Review Deleted', 'admin', `Review ${id} deleted`);
      return true;
    }
    return false;
  }

  // EMAILS
  public getEmailLogs(limit = 100): EmailLog[] {
    return (this.data.emails || [])
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  public addEmailLog(log: EmailLog): void {
    if (!this.data.emails) {
      this.data.emails = [];
    }
    this.data.emails.unshift(log);
    if (this.data.emails.length > 300) {
      this.data.emails = this.data.emails.slice(0, 300);
    }
    this.commit();
  }

  public getRawDatabase(): DatabaseData {
    return this.data;
  }
}

export const db = new Database();
