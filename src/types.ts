export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type ProductStatus = 'published' | 'draft';

export interface ProductVariant {
  name: string; // e.g. "Color" or "Size"
  options: string[]; // e.g. ["Black", "White", "Navy"]
}

export interface Product {
  id: string; // [first 3 category words]_[7 random digits], e.g. sho_1245832
  name: string;
  categoryId: string; // normalized, e.g. "shoes"
  categoryName: string; // display name, e.g. "Shoes"
  description: string;
  shortDescription: string;
  price: number;
  discountPrice?: number;
  brand: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  images: string[];
  thumbnail: string;
  variants: ProductVariant[];
  tags: string[];
  status: ProductStatus;
  featured: boolean;
  newArrival: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string; // normalized, e.g. "shoes"
  displayName: string;
  productCount?: number;
  description?: string;
  image?: string;
}

export type OrderStatus =
  | 'pending'
  | 'whatsapp_sent'
  | 'under_verification'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedVariant?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface Review {
  id: string; // e.g. rev_1726301293_ab3x
  orderId: string; // reference to Order.orderId
  orderNumber: string | null; // e.g. #3943222
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  rating: number; // 1 to 5
  comment: string;
  productId?: string; // specific product reviewed or undefined for entire order
  productName?: string;
  verifiedPurchase: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  status: 'published' | 'pending' | 'flagged';
  reply?: {
    message: string;
    repliedAt: string;
    repliedBy: string;
  };
}

export interface EmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  type: 'order_confirmation' | 'order_status_update' | 'review_notification' | 'invoice_receipt' | 'test_email';
  status: 'sent' | 'queued' | 'failed';
  sentAt: string;
  orderId?: string;
  orderNumber?: string;
  previewSnippet?: string;
  html?: string;
  errorMessage?: string;
}

export interface EmailSettings {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  sendOrderConfirmation: boolean;
  sendReviewConfirmation: boolean;
  sendInvoiceOnRequest: boolean;
  adminAlertEmail?: string;
}

export interface Order {
  orderId: string; // secure internal token ID
  orderNumber: string | null; // e.g. #3943222 (7 digits assigned upon confirmation)
  status: OrderStatus;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  whatsapp: {
    number: string;
    messageGenerated: boolean;
    sentAt?: string;
  };
  token: string;
  createdAt: string;
  confirmedAt?: string;
  updatedAt: string;
  notes?: string;
}

export interface StoreConfig {
  store: {
    name: string;
    tagline: string;
    currency: string;
    country: string;
    language: string;
  };
  branding: {
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
  };
  contact: {
    whatsappNumber: string;
    email: string;
    supportHours?: string;
  };
  announcement?: {
    enabled: boolean;
    text: string;
  };
  header: {
    showSearch: boolean;
    showCategories: boolean;
    showCart: boolean;
  };
  footer: {
    enabled: boolean;
    description: string;
    showSocialLinks: boolean;
    copyright: string;
  };
  theme: {
    default: 'light' | 'dark' | 'system';
    allowDarkMode: boolean;
    allowLightMode: boolean;
  };
  checkout: {
    allowGuestCheckout: boolean;
    whatsappOrdering: boolean;
  };
  features: {
    whatsappOrders: boolean;
    darkMode: boolean;
    guestCheckout: boolean;
    invoiceGeneration: boolean;
    emailSystem: boolean;
  };
  emailSettings?: EmailSettings;
  externalApiBaseUrl?: string; // Custom API endpoint provided by user
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalSales: number;
  recentOrders: Order[];
  topProducts: { name: string; count: number; revenue: number }[];
}
