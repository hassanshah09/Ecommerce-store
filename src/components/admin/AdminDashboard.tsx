import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Settings,
  Database,
  FileText,
  Activity,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Phone,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Star,
  Mail,
  Send,
  Inbox,
  CheckCircle2,
  MessageSquare,
  Moon,
  Sun,
} from 'lucide-react';
import type { Product, Category, Order, StoreConfig, AuditLog, DashboardStats, Review, EmailLog } from '../../types';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  createCategory,
  fetchOrders,
  updateOrderStatus,
  fetchStoreConfig,
  updateStoreConfig,
  fetchStats,
  fetchAuditLogs,
  fetchSchemaDocs,
  fetchReviews,
  deleteReview,
  fetchEmailLogs,
  sendTestEmail,
  formatPKR,
  normalizeWhatsApp,
} from '../../services/api';
import { InvoiceModal } from '../InvoiceModal';

interface AdminDashboardProps {
  config: StoreConfig;
  onConfigUpdated: (newConfig: StoreConfig) => void;
  onExitAdmin: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

type AdminTab = 'overview' | 'products' | 'orders' | 'categories' | 'reviews' | 'emails' | 'branding' | 'database' | 'audit';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  onConfigUpdated,
  onExitAdmin,
  darkMode,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [schemaDocs, setSchemaDocs] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Reviews Tab States
  const [reviewRatingFilter, setReviewRatingFilter] = useState<string>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');

  // Email Tab States
  const [testEmailRecipient, setTestEmailRecipient] = useState(config.contact.email || 'customer@example.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedEmailForPreview, setSelectedEmailForPreview] = useState<EmailLog | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  // Modals & Drawers
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [productCategorySelection, setProductCategorySelection] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [isCreatingProductCategory, setIsCreatingProductCategory] = useState(false);

  // API Tester state
  const [apiTestResponse, setApiTestResponse] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  // Form states
  const [brandingForm, setBrandingForm] = useState<StoreConfig>(config);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [st, pr, ct, od, lg, sc, revs, emls] = await Promise.all([
        fetchStats(),
        fetchProducts({ status: 'all' }),
        fetchCategories(),
        fetchOrders(),
        fetchAuditLogs(),
        fetchSchemaDocs(),
        fetchReviews().catch(() => [] as Review[]),
        fetchEmailLogs().catch(() => [] as EmailLog[]),
      ]);
      setStats(st);
      setProducts(pr);
      setCategories(ct);
      setOrders(od);
      setAuditLogs(lg);
      setSchemaDocs(sc);
      setReviews(revs);
      setEmailLogs(emls);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setBrandingForm(config);
  }, [config]);

  useEffect(() => {
    if (!isAddingProduct) return;
    setProductCategorySelection(editingProduct?.categoryName || categories[0]?.displayName || '');
    setNewProductCategory('');
  }, [isAddingProduct, editingProduct]);

  const handleCreateProductCategory = async () => {
    const categoryName = newProductCategory.trim();
    if (!categoryName) return;

    setIsCreatingProductCategory(true);
    try {
      const createdCategory = await createCategory(categoryName);
      setCategories((previous) => {
        const withoutDuplicate = previous.filter((category) => category.id !== createdCategory.id);
        return [...withoutDuplicate, createdCategory];
      });
      setProductCategorySelection(createdCategory.displayName);
      setNewProductCategory('');
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setIsCreatingProductCategory(false);
    }
  };

  // Handle Order Confirmation (Generates #3943222)
  const handleConfirmOrder = async (orderId: string) => {
    try {
      const updated = await updateOrderStatus(orderId, 'confirmed', 'Admin verified and confirmed WhatsApp order.');
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      setSelectedOrderForInvoice(updated); // auto show invoice
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to confirm order');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update order status');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(`Are you sure you want to delete product "${id}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete product');
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateStoreConfig(brandingForm);
      onConfigUpdated(updated);
      setSaveSuccessMsg('Store branding & configuration updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to save config');
    }
  };

  const runApiTest = async (endpoint: string, method = 'GET', body?: any) => {
    setTestingEndpoint(endpoint);
    setApiTestResponse('Running request to ' + endpoint + '...');
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setApiTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiTestResponse(`Error: ${err.message}`);
    } finally {
      setTestingEndpoint(null);
    }
  };

  // Universal Search Filter (detects #3943222, product ID, etc.)
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      o.orderId.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      o.items.some((it) => it.name.toLowerCase().includes(q) || it.productId.toLowerCase().includes(q))
    );
  });

  const filteredProducts = products
    .filter((p) => {
      const matchesCategory = productCategoryFilter === 'all' || p.categoryId === productCategoryFilter;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            {config.store.name.charAt(0)}
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center gap-1.5">
              <span>{config.store.name}</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-sm">
                ADMIN
              </span>
            </div>
            <p className="text-[10px] text-stone-500 font-mono">
              WhatsApp line: {config.contact.whatsappNumber}
            </p>
          </div>
        </div>

        {/* Global search & actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-900" />}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onExitAdmin}
            className="px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <span>Log Out & View Customer Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 p-3 space-y-1">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
            { id: 'products', label: `Products (${products.length})`, icon: Package },
            { id: 'categories', label: `Categories (${categories.length})`, icon: Layers },
            { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
            { id: 'emails', label: `Email System (${emailLogs.length})`, icon: Mail },
            { id: 'branding', label: 'Branding & Store', icon: Settings },
            { id: 'database', label: 'Database & APIs', icon: Database, highlight: true },
            { id: 'audit', label: 'Audit Log', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.highlight ? 'text-emerald-500' : ''}`} />
                <span className="truncate">{tab.label}</span>
                {tab.highlight && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-xs text-stone-500">Realtime WhatsApp store analytics and operational status</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex justify-between items-start text-xs text-stone-500 mb-1">
                    <span>Total Revenue</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {formatPKR(stats.totalSales, config.store.currency)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {stats.confirmedOrders} confirmed orders
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex justify-between items-start text-xs text-stone-500 mb-1">
                    <span>Total Orders</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {stats.totalOrders}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1 font-medium">
                    {stats.pendingOrders} pending verification
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex justify-between items-start text-xs text-stone-500 mb-1">
                    <span>Live Products</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl md:text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {stats.totalProducts}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">Across {categories.length} categories</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex justify-between items-start text-xs text-stone-500 mb-1">
                    <span>Low / Out of Stock</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl md:text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {stats.lowStockCount + stats.outOfStockCount}
                  </div>
                  <div className="text-[10px] text-rose-500 mt-1">
                    {stats.outOfStockCount} out of stock, {stats.lowStockCount} low
                  </div>
                </div>
              </div>

              {/* Pending Orders Action Card */}
              {orders.filter((o) => o.status === 'pending' || o.status === 'under_verification' || o.status === 'whatsapp_sent').length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h3 className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                        Orders Awaiting Verification
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setOrderStatusFilter('pending');
                        setActiveTab('orders');
                      }}
                      className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {orders
                      .filter((o) => o.status === 'pending' || o.status === 'under_verification' || o.status === 'whatsapp_sent')
                      .slice(0, 3)
                      .map((ord) => (
                        <div
                          key={ord.orderId}
                          className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-stone-900 dark:text-white">{ord.customer.name}</span>
                            <span className="text-stone-400 ml-2 font-mono">{ord.customer.phone}</span>
                            <div className="text-[11px] text-stone-500">
                              {ord.items.length} item(s) • Total: {formatPKR(ord.total, config.store.currency)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmOrder(ord.orderId)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-2xs text-[11px]"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirm Order</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent Orders & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-sm text-stone-900 dark:text-white">Recent Orders</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-emerald-600 hover:underline font-medium"
                    >
                      View All Orders
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.orderId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-stone-900 dark:text-white font-mono">
                            {o.orderNumber || o.orderId}
                          </div>
                          <div className="text-stone-500 text-[11px]">
                            {o.customer.name} • {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-stone-900 dark:text-white font-mono">
                            {formatPKR(o.total, config.store.currency)}
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                            o.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-3">Top Products</h3>
                  <div className="space-y-3">
                    {stats.topProducts.map((tp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-[10px] text-stone-500">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-stone-900 dark:text-white truncate max-w-xs">{tp.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-mono">{formatPKR(tp.revenue, config.store.currency)}</div>
                          <div className="text-[10px] text-stone-500">{tp.count} sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white">Orders Management</h2>
                  <p className="text-xs text-stone-500">Verify WhatsApp incoming orders and generate official invoices</p>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1 overflow-x-auto p-1 bg-stone-200/70 dark:bg-stone-800 rounded-xl">
                  {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs font-bold'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Universal Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Universal search: enter Order # (e.g. #3943222), product ID (sho_1245832), customer name, or phone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Orders Table */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 uppercase font-semibold text-[10px] text-stone-500">
                      <tr>
                        <th className="p-3.5">Order # / ID</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Items</th>
                        <th className="p-3.5">Total Amount</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Verification & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-stone-400 text-xs">
                            No orders match current filter or search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr key={ord.orderId} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                            <td className="p-3.5">
                              <div className="font-bold text-stone-900 dark:text-white font-mono">
                                {ord.orderNumber || <span className="text-amber-600">Pending #</span>}
                              </div>
                              <div className="text-[10px] font-mono text-stone-400">{ord.orderId}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-stone-900 dark:text-white">{ord.customer.name}</div>
                              <div className="flex items-center gap-1 text-[11px] text-stone-500 font-mono">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{ord.customer.phone}</span>
                              </div>
                              {ord.customer.address && (
                                <div className="text-[10px] text-stone-400 truncate max-w-xs">{ord.customer.address}</div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="font-medium text-stone-900 dark:text-white">
                                {ord.items.map((it) => `${it.name} (x${it.quantity})`).join(', ')}
                              </div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                Token: {ord.token}
                              </div>
                            </td>
                            <td className="p-3.5 font-bold font-mono text-stone-900 dark:text-white">
                              {formatPKR(ord.total, config.store.currency)}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  ord.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : ord.status === 'delivered'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : ord.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Verify / Confirm Button */}
                                {ord.status !== 'confirmed' && ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleConfirmOrder(ord.orderId)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                                    title="Confirm order & generate 7-digit order number"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Confirm</span>
                                  </button>
                                )}

                                {/* Mark Shipped */}
                                {ord.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.orderId, 'shipped')}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
                                    title="Mark order as Shipped"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Ship</span>
                                  </button>
                                )}

                                {/* Mark Delivered */}
                                {ord.status === 'shipped' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.orderId, 'delivered')}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Delivered</span>
                                  </button>
                                )}

                                {/* Invoice Button */}
                                <button
                                  onClick={() => setSelectedOrderForInvoice(ord)}
                                  className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-medium flex items-center gap-1"
                                  title="View and print invoice"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Invoice</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white">Product Catalog</h2>
                  <p className="text-xs text-stone-500">
                    Deterministic IDs ([cat]_[7digits]), inventory levels, pricing & variants
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setSelectedProductImage('');
                    setIsAddingProduct(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name, SKU, or deterministic ID (e.g. sho_1245832)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Table */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 uppercase font-semibold text-[10px] text-stone-500">
                      <tr>
                        <th className="p-3.5">Product</th>
                        <th className="p-3.5">Product ID</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Stock</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.thumbnail}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover bg-stone-100 dark:bg-stone-800 flex-shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-stone-900 dark:text-white line-clamp-1">{p.name}</div>
                                <div className="text-[10px] text-stone-400 font-mono">SKU: {p.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {p.id}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px]">
                              {p.categoryName}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            {formatPKR(p.discountPrice || p.price, config.store.currency)}
                            {p.discountPrice && (
                              <span className="text-[10px] text-stone-400 line-through ml-1">
                                {formatPKR(p.price, config.store.currency)}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  p.stock <= 0
                                    ? 'bg-rose-500'
                                    : p.stock <= p.lowStockThreshold
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-mono font-bold">{p.stock}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setSelectedProductImage(p.thumbnail || '');
                                  setIsAddingProduct(true);
                                }}
                                className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white">Categories Management</h2>
                  <p className="text-xs text-stone-500">
                    Normalized, collision-proof category taxonomy (e.g. Shoes, shoes, SHOES mapped seamlessly)
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-stone-900 dark:text-white">{c.displayName}</h3>
                        <code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">id: {c.id}</code>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                        {c.productCount || 0} products
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-stone-500">{c.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BRANDING & STORE SETTINGS */}
          {activeTab === 'branding' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">Store Branding & Configuration</h2>
                <p className="text-xs text-stone-500">
                  Customizable store information, WhatsApp contact routing, header announcements, and theme colors
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveBranding} className="space-y-6 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                {/* Store Basics */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Store Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={brandingForm.store.name}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, store: { ...brandingForm.store, name: e.target.value } })
                        }
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Store Tagline
                      </label>
                      <input
                        type="text"
                        value={brandingForm.store.tagline}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, store: { ...brandingForm.store, tagline: e.target.value } })
                        }
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Currency
                      </label>
                      <input
                        type="text"
                        value={brandingForm.store.currency}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, store: { ...brandingForm.store, currency: e.target.value } })
                        }
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={brandingForm.store.country}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, store: { ...brandingForm.store, country: e.target.value } })
                        }
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* WhatsApp & Contact Routing */}
                <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">WhatsApp Ordering Setup</h3>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Seller WhatsApp Number * (Accepts 03115365367 or +923115365367)
                    </label>
                    <input
                      type="text"
                      required
                      value={brandingForm.contact.whatsappNumber}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          contact: { ...brandingForm.contact, whatsappNumber: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono"
                    />
                    <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1 font-mono">
                      <span>Normalized international dispatch:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        +{normalizeWhatsApp(brandingForm.contact.whatsappNumber)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={brandingForm.contact.email}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            contact: { ...brandingForm.contact, email: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Support Operating Hours
                      </label>
                      <input
                        type="text"
                        value={brandingForm.contact.supportHours || ''}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            contact: { ...brandingForm.contact, supportHours: e.target.value },
                          })
                        }
                        placeholder="e.g. 9:00 AM - 10:00 PM (PKT)"
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Announcement Bar */}
                <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Announcement Banner</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="announcementToggle"
                      checked={brandingForm.announcement?.enabled ?? false}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          announcement: {
                            text: brandingForm.announcement?.text || '',
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="announcementToggle" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Enable Announcement Top Bar
                    </label>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={brandingForm.announcement?.text || ''}
                      onChange={(e) =>
                        setBrandingForm({
                          ...brandingForm,
                          announcement: {
                            enabled: brandingForm.announcement?.enabled ?? true,
                            text: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Free delivery on orders above PKR 4,000"
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Theme & Brand Colors */}
                <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Brand Palette</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Primary Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandingForm.branding.primaryColor || '#059669'}
                          onChange={(e) =>
                            setBrandingForm({
                              ...brandingForm,
                              branding: { ...brandingForm.branding, primaryColor: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
                        />
                        <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                          {brandingForm.branding.primaryColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Logo Image URL (Leave blank for automatic stylized text brand)
                      </label>
                      <input
                        type="text"
                        value={brandingForm.branding.logo || ''}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            branding: { ...brandingForm.branding, logo: e.target.value },
                          })
                        }
                        placeholder="https://.../logo.png"
                        className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Save & Apply Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: DATABASE & APIS (Addresses user prompt: "also add data base i will provide u apis") */}
          {activeTab === 'database' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white">Database & API Integration Hub</h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Built-in persistent database with full REST API contracts ready for custom endpoints
                </p>
              </div>

              {/* Database Status Card */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-stone-900 dark:text-white uppercase tracking-wider">
                      Database Engine Status: Operational
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-mono font-bold rounded-full">
                    Atomic JSON Store (data/db.json)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                    <div className="text-stone-400 text-[10px]">Products in DB</div>
                    <div className="text-lg font-black text-stone-900 dark:text-white font-mono">{products.length}</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                    <div className="text-stone-400 text-[10px]">Categories in DB</div>
                    <div className="text-lg font-black text-stone-900 dark:text-white font-mono">{categories.length}</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                    <div className="text-stone-400 text-[10px]">Orders in DB</div>
                    <div className="text-lg font-black text-stone-900 dark:text-white font-mono">{orders.length}</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl">
                    <div className="text-stone-400 text-[10px]">Audit Logs</div>
                    <div className="text-lg font-black text-stone-900 dark:text-white font-mono">{auditLogs.length}</div>
                  </div>
                </div>
              </div>

              {/* Interactive REST API Documentation Explorer */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Interactive REST API Documentation (Click to test endpoint)
                  </h3>
                  <span className="text-[10px] text-stone-400 font-mono">Base: /api</span>
                </div>

                {schemaDocs?.endpoints && (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {schemaDocs.endpoints.map((ep: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                              ep.method === 'GET'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : ep.method === 'POST'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : ep.method === 'PUT'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {ep.method}
                          </span>
                          <code className="font-mono font-semibold text-stone-800 dark:text-stone-200">{ep.path}</code>
                          <span className="text-stone-500 text-[11px] hidden md:inline">• {ep.summary}</span>
                        </div>

                        {ep.method === 'GET' && (
                          <button
                            onClick={() => runApiTest(ep.path, 'GET')}
                            disabled={testingEndpoint === ep.path}
                            className="px-2.5 py-1 bg-white dark:bg-stone-700 hover:bg-stone-100 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 self-end sm:self-auto transition-colors"
                          >
                            <span>Test Live</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* API Live Output Console */}
                {apiTestResponse && (
                  <div className="mt-4 p-4 rounded-xl bg-stone-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 border border-stone-800">
                    <div className="text-[10px] text-stone-500 mb-2 uppercase font-semibold">Live Response Output</div>
                    <pre>{apiTestResponse}</pre>
                  </div>
                )}
              </div>

              {/* Connected Firebase Project Card */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="font-bold text-xs text-stone-900 dark:text-white uppercase tracking-wider">
                      Connected Firebase Project: ecomercesite-9bfd4
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-mono font-bold rounded-full">
                    Firebase SDK v11 Active
                  </span>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Firebase web app credentials and Google Analytics 4 tracking (<code className="font-mono text-amber-600 font-bold">G-ZFT8HXB541</code>) are linked and tracking visitor storefront interactions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
                    <div className="text-stone-400 text-[10px]">Project ID</div>
                    <div className="font-mono font-bold text-stone-800 dark:text-stone-200">ecomercesite-9bfd4</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
                    <div className="text-stone-400 text-[10px]">Auth Domain</div>
                    <div className="font-mono text-stone-700 dark:text-stone-300 truncate">ecomercesite-9bfd4.firebaseapp.com</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
                    <div className="text-stone-400 text-[10px]">Google Analytics Stream</div>
                    <div className="font-mono text-emerald-600 font-bold">G-ZFT8HXB541 (Active)</div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
                    <div className="text-stone-400 text-[10px]">Storage Bucket</div>
                    <div className="font-mono text-stone-700 dark:text-stone-300 truncate">ecomercesite-9bfd4.firebasestorage.app</div>
                  </div>
                </div>
              </div>

              {/* Custom External API Integration box */}
              <div className="p-5 bg-stone-50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs text-stone-900 dark:text-white uppercase tracking-wider">
                    Connect External Custom APIs
                  </h4>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  When you provide your external database or REST APIs, specify the endpoint Base URL below or swap the handlers in{' '}
                  <code className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded-sm">/server/api.ts</code>. The application is completely decoupled and modular!
                </p>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={brandingForm.externalApiBaseUrl || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, externalApiBaseUrl: e.target.value })}
                    placeholder="e.g. https://api.my-ecommerce-service.com/v1"
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateStoreConfig({ externalApiBaseUrl: brandingForm.externalApiBaseUrl });
                      alert('External API Base URL updated.');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Save Endpoint
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">Administrative Audit Log</h2>
                <p className="text-xs text-stone-500">
                  Traceable history of orders, confirmations, stock adjustments, and store updates
                </p>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs divide-y divide-stone-100 dark:divide-stone-800">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 text-xs flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-white">{log.action}</span>
                        <span className="text-[10px] text-stone-400 font-mono">by {log.actor}</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-stone-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: REVIEWS MANAGEMENT */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span>Customer Reviews ({reviews.length})</span>
                  </h2>
                  <p className="text-xs text-stone-500">
                    Verified customer feedback, ratings, and comments submitted through Order History
                  </p>
                </div>
              </div>

              {/* Reviews Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <span className="text-xs text-stone-500">Average Rating</span>
                  <div className="text-2xl font-black text-amber-500 font-mono mt-1 flex items-center gap-1.5">
                    <span>
                      {reviews.length > 0
                        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                        : '0.0'}
                    </span>
                    <span className="text-xs font-normal text-stone-400">/ 5.0</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Overall customer satisfaction</span>
                </div>

                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <span className="text-xs text-stone-500">Total Reviews</span>
                  <div className="text-2xl font-black text-stone-900 dark:text-white font-mono mt-1">
                    {reviews.length}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Stored in reviews table</span>
                </div>

                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <span className="text-xs text-stone-500">5-Star Reviews</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    {reviews.filter((r) => r.rating === 5).length}
                  </div>
                  <span className="text-[10px] text-stone-400">Top tier satisfaction</span>
                </div>

                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <span className="text-xs text-stone-500">Verified Buyers</span>
                  <div className="text-2xl font-black text-blue-600 font-mono mt-1">
                    {reviews.filter((r) => r.verifiedPurchase).length}
                  </div>
                  <span className="text-[10px] text-stone-400">Linked to genuine orders</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={reviewSearchQuery}
                    onChange={(e) => setReviewSearchQuery(e.target.value)}
                    placeholder="Search by customer name, order number, or comment..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['all', '5', '4', '3', '2', '1'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReviewRatingFilter(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        reviewRatingFilter === r
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      {r === 'all' ? 'All Ratings' : `${r} ★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              {(() => {
                const filtered = reviews.filter((r) => {
                  if (reviewRatingFilter !== 'all' && r.rating !== Number(reviewRatingFilter)) {
                    return false;
                  }
                  if (reviewSearchQuery) {
                    const q = reviewSearchQuery.toLowerCase();
                    const matchName = r.customerName.toLowerCase().includes(q);
                    const matchOrder = (r.orderNumber || r.orderId).toLowerCase().includes(q);
                    const matchComment = r.comment.toLowerCase().includes(q);
                    return matchName || matchOrder || matchComment;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
                      <Star className="w-8 h-8 text-stone-300 mx-auto" />
                      <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">No reviews found</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        Customers can leave reviews on their delivered orders directly in the Order History screen.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                              {rev.customerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-stone-900 dark:text-white">
                                  {rev.customerName}
                                </span>
                                {rev.verifiedPurchase && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                                <span>Order #{rev.orderNumber || rev.orderId.slice(0, 8)}</span>
                                {rev.customerPhone && <span>• {rev.customerPhone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${
                                    s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold font-mono text-amber-600">{rev.rating}.0</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Delete review from "${rev.customerName}"?`)) {
                                  try {
                                    await deleteReview(rev.id);
                                    setReviews((prev) => prev.filter((r) => r.id !== rev.id));
                                    loadData();
                                  } catch (e: any) {
                                    alert(e.message || 'Failed to delete review');
                                  }
                                }
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-stone-700 dark:text-stone-300 italic">
                          "{rev.comment}"
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap gap-1">
                            {rev.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(rev.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: EMAIL SYSTEM & DISPATCH LOGS */}
          {activeTab === 'emails' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>Email System & Dispatch Logs</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Automated email confirmations, official tax invoice receipts, and live dispatch audit logs
                </p>
              </div>

              {/* Status and Diagnostics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Email Service Status
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Dual-mode dispatcher with production SMTP support and local JSON fallback logging.
                  </p>
                  <div className="text-[11px] font-mono text-stone-400 pt-1">
                    Sender: {config.contact.email || 'orders@novamart.pk'}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Automated Event Triggers
                  </span>
                  <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Order Confirmation on Placement</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dispatch/Delivery Notification</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>On-demand Customer Invoice Delivery</span>
                    </li>
                  </ul>
                </div>

                {/* Quick Test Email Dispatch Tool */}
                <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Send Test Email</span>
                  </span>
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="Recipient email address"
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!testEmailRecipient.includes('@')) {
                          alert('Please enter a valid recipient email');
                          return;
                        }
                        setIsSendingTestEmail(true);
                        setTestEmailResult(null);
                        try {
                          const res = await sendTestEmail(testEmailRecipient);
                          setTestEmailResult({ success: true, message: res.message || 'Test email dispatched!' });
                          loadData();
                        } catch (err: any) {
                          setTestEmailResult({ success: false, message: err.message || 'Failed to send' });
                        } finally {
                          setIsSendingTestEmail(false);
                        }
                      }}
                      disabled={isSendingTestEmail}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingTestEmail ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Dispatch Test Email</span>
                        </>
                      )}
                    </button>
                    {testEmailResult && (
                      <p
                        className={`text-[11px] font-medium ${
                          testEmailResult.success ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {testEmailResult.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Dispatch Logs Table */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Inbox className="w-4 h-4 text-stone-500" />
                    <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                      Email Dispatch Activity ({emailLogs.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={loadData}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                {emailLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    No emails logged yet. Emails are automatically logged when orders are placed, status is updated, or invoices are sent.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {emailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 dark:text-white">{log.subject}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                log.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                            <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-md font-mono">
                              {log.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2">
                            <span>To: <span className="font-mono text-stone-800 dark:text-stone-200">{log.to}</span></span>
                            {log.orderNumber && <span>• Order #{log.orderNumber}</span>}
                          </div>
                          {log.previewSnippet && (
                            <p className="text-[11px] text-stone-400 line-clamp-1 italic">
                              "{log.previewSnippet}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="text-[11px] text-stone-400 font-mono whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleString()}
                          </span>
                          {log.html && (
                            <button
                              type="button"
                              onClick={() => setSelectedEmailForPreview(log)}
                              className="px-2.5 py-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View HTML</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Email HTML Preview Modal */}
      {selectedEmailForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
          onClick={() => setSelectedEmailForPreview(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900">{selectedEmailForPreview.subject}</h4>
                <p className="text-[11px] text-stone-500 font-mono">To: {selectedEmailForPreview.to}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmailForPreview(null)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-stone-50">
              <div
                className="prose prose-sm max-w-none bg-white p-6 rounded-xl border border-stone-200 shadow-xs"
                dangerouslySetInnerHTML={{ __html: selectedEmailForPreview.html || '' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedOrderForInvoice && (
        <InvoiceModal
          order={selectedOrderForInvoice}
          config={config}
          isOpen={true}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {/* Add / Edit Product Modal */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {editingProduct ? `Edit Product (${editingProduct.id})` : 'Add New Product'}
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const payload = {
                  name: form.name.value,
                  categoryName: form.categoryName.value,
                  price: Number(form.price.value),
                  discountPrice: form.discountPrice.value ? Number(form.discountPrice.value) : undefined,
                  stock: Number(form.stock.value),
                  sku: form.sku.value,
                  brand: form.brand.value,
                  thumbnail: selectedProductImage || form.thumbnail.value || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
                  description: form.description.value,
                  status: form.status.value,
                  featured: form.featured.checked,
                  newArrival: form.newArrival.checked,
                };

                try {
                  if (editingProduct) {
                    await updateProduct(editingProduct.id, payload);
                  } else {
                    await createProduct(payload);
                  }
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                  setSelectedProductImage('');
                  loadData();
                } catch (err: any) {
                  alert(err.message || 'Failed to save product');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Product Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingProduct?.name || ''}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <select
                    name="categoryName"
                    required
                      value={productCategorySelection}
                      onChange={(e) => {
                        setProductCategorySelection(e.target.value);
                        if (e.target.value !== '__new__') setNewProductCategory('');
                      }}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.displayName}>
                          {category.displayName} ({category.productCount || 0} products)
                        </option>
                      ))}
                      <option value="__new__">+ Create new category</option>
                    </select>
                    {productCategorySelection === '__new__' && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          placeholder="New category name"
                          className="min-w-0 flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={handleCreateProductCategory}
                          disabled={!newProductCategory.trim() || isCreatingProductCategory}
                          className="shrink-0 px-3 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-xl"
                        >
                          {isCreatingProductCategory ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    )}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Brand</label>
                  <input
                    name="brand"
                    type="text"
                    defaultValue={editingProduct?.brand || 'NovaMart'}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Price (PKR) *</label>
                  <input
                    name="price"
                    type="number"
                    required
                    defaultValue={editingProduct?.price || ''}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Discount Price (PKR)</label>
                  <input
                    name="discountPrice"
                    type="number"
                    defaultValue={editingProduct?.discountPrice || ''}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Stock Qty *</label>
                  <input
                    name="stock"
                    type="number"
                    required
                    defaultValue={editingProduct?.stock ?? 10}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">SKU</label>
                  <input
                    name="sku"
                    type="text"
                    defaultValue={editingProduct?.sku || `NV-SKU-${Math.floor(1000 + Math.random() * 9000)}`}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingProduct?.status || 'published'}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Thumbnail Image URL</label>
                <input
                  name="thumbnail"
                  type="url"
                  placeholder="https://..."
                  defaultValue={editingProduct?.thumbnail || ''}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-950 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-950">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setSelectedProductImage(String(reader.result));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span>Choose a photo from phone</span>
                </label>
                {selectedProductImage && (
                  <img src={selectedProductImage} alt="Selected product preview" className="mt-2 h-20 w-20 rounded-xl object-cover border border-blue-200" />
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingProduct?.description || ''}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl resize-none"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 font-medium">
                  <input type="checkbox" name="featured" defaultChecked={editingProduct?.featured || false} />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium">
                  <input type="checkbox" name="newArrival" defaultChecked={editingProduct?.newArrival || false} />
                  <span>Mark as New Arrival</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-stone-500 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">Add New Category</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await createCategory(form.displayName.value, form.description.value);
                  setIsAddingCategory(false);
                  loadData();
                } catch (err: any) {
                  alert(err.message || 'Failed to create category');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Category Name *</label>
                <input
                  name="displayName"
                  type="text"
                  required
                  placeholder="e.g. Leather Goods"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Short Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="e.g. Handcrafted leather bags and cases"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-3 py-1.5 text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
