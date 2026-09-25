import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  CheckCircle,
  Clock,
  Truck,
  Package,
  Hash,
  FileText,
  AlertCircle,
  Phone,
  MessageSquare,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Calendar,
  Star,
  Mail,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Order, StoreConfig, Review } from '../types';
import { searchCustomerOrders, formatPKR, normalizeWhatsApp, fetchReviews, sendOrderReceiptEmail } from '../services/api';
import { ReviewModal } from './ReviewModal';

interface OrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onViewInvoice: (order: Order) => void;
  initialQuery?: string;
  onOpenTracking?: (query: string) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  isOpen,
  onClose,
  config,
  onViewInvoice,
  initialQuery = '',
  onOpenTracking,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Reviews integration
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review>>({});
  const [selectedReviewOrder, setSelectedReviewOrder] = useState<Order | null>(null);

  // Email invoice integration
  const [emailingOrderId, setEmailingOrderId] = useState<string | null>(null);
  const [emailSuccessMap, setEmailSuccessMap] = useState<Record<string, string>>({});
  const [emailPromptOrder, setEmailPromptOrder] = useState<Order | null>(null);
  const [customEmailInput, setCustomEmailInput] = useState<string>('');
  const [isSendingCustomEmail, setIsSendingCustomEmail] = useState(false);

  // Stored device quick identifiers
  const [savedPhone, setSavedPhone] = useState<string | null>(() => {
    try {
      return localStorage.getItem('novamart_customer_phone');
    } catch {
      return null;
    }
  });

  const [recentOrderIds, setRecentOrderIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('novamart_recent_orders') || '[]');
    } catch {
      return [];
    }
  });

  const performSearch = useCallback(
    async (searchTerm: string) => {
      const clean = searchTerm.trim();
      if (!clean) return;

      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const results = await searchCustomerOrders(clean);
        setOrders(results);

        // Fetch associated reviews from the reviews table
        try {
          const allReviews = await fetchReviews();
          const map: Record<string, Review> = {};
          allReviews.forEach(r => {
            if (r.orderId) map[r.orderId.toLowerCase()] = r;
            if (r.orderNumber) {
              map[r.orderNumber.toLowerCase()] = r;
              const digits = r.orderNumber.replace(/\D/g, '');
              if (digits) map[digits] = r;
            }
          });
          setReviewsMap(map);
        } catch (e) {
          // Non-blocking review fetch
        }

        if (results.length === 0) {
          setError(
            `No orders found matching "${clean}". Please verify your 11-digit phone number (e.g. 03214567890) or 7-digit order number.`
          );
        } else {
          // If the search looks like a phone number, remember it for quick access next time
          if (clean.replace(/\D/g, '').length >= 10) {
            try {
              localStorage.setItem('novamart_customer_phone', clean);
              setSavedPhone(clean);
            } catch {
              // ignore
            }
          }
        }
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to search orders at this time. Please check your connection and try again.'
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleReviewSubmitted = (review: Review) => {
    setReviewsMap(prev => ({
      ...prev,
      [review.orderId.toLowerCase()]: review,
      ...(review.orderNumber ? { [review.orderNumber.toLowerCase()]: review } : {}),
    }));
  };

  const handleTriggerEmailReceipt = async (order: Order, emailToUse?: string) => {
    const targetEmail = (emailToUse || order.customer.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailPromptOrder(order);
      setCustomEmailInput(order.customer.email || '');
      return;
    }

    setEmailingOrderId(order.orderId);
    try {
      const res = await sendOrderReceiptEmail(order.orderId, targetEmail);
      setEmailSuccessMap(prev => ({
        ...prev,
        [order.orderId]: res.message || `Invoice sent to ${targetEmail}`,
      }));
      setTimeout(() => {
        setEmailSuccessMap(prev => {
          const next = { ...prev };
          delete next[order.orderId];
          return next;
        });
      }, 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch email receipt');
    } finally {
      setEmailingOrderId(null);
    }
  };

  const handleSendPromptEmail = async () => {
    if (!emailPromptOrder) return;
    if (!customEmailInput.trim() || !customEmailInput.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSendingCustomEmail(true);
    try {
      const res = await sendOrderReceiptEmail(emailPromptOrder.orderId, customEmailInput.trim());
      setEmailSuccessMap(prev => ({
        ...prev,
        [emailPromptOrder.orderId]: res.message || `Invoice sent to ${customEmailInput.trim()}`,
      }));
      setEmailPromptOrder(null);
      setTimeout(() => {
        setEmailSuccessMap(prev => {
          const next = { ...prev };
          if (emailPromptOrder) delete next[emailPromptOrder.orderId];
          return next;
        });
      }, 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch email');
    } finally {
      setIsSendingCustomEmail(false);
    }
  };

  // Auto-search on initial open if phone or query is available
  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
        performSearch(initialQuery);
      } else if (savedPhone && !hasSearched && orders.length === 0) {
        setQuery(savedPhone);
        performSearch(savedPhone);
      }
    }
  }, [isOpen, initialQuery, savedPhone, hasSearched, orders.length, performSearch]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const stages = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Verified & Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Packed & Processing', icon: Package },
    { key: 'shipped', label: 'Dispatched', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  const getStageIndex = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'whatsapp_sent':
        return 0;
      case 'under_verification':
        return 0;
      case 'confirmed':
        return 1;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Verified & Confirmed',
          classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'processing':
        return {
          label: 'Packing & In Prep',
          classes: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'shipped':
        return {
          label: 'Dispatched / In Transit',
          classes: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'delivered':
        return {
          label: 'Delivered',
          classes: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      case 'under_verification':
        return {
          label: 'Under WhatsApp Verification',
          classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          label: 'Order Placed (Pending)',
          classes: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        };
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') {
      return ['pending', 'whatsapp_sent', 'under_verification', 'confirmed', 'processing', 'shipped'].includes(
        o.status
      );
    }
    if (statusFilter === 'delivered') return o.status === 'delivered';
    if (statusFilter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-4 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                  My Orders & Purchase History
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Track dispatch milestones, past WhatsApp orders, and print official invoices.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Toolbar */}
          <div className="p-5 border-b border-stone-100 dark:border-stone-800 space-y-3 bg-white dark:bg-stone-900">
            <form onSubmit={handleSubmit} className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>Search by Phone Number or Unique Order ID</span>
                <span className="text-[11px] text-stone-400 font-normal">
                  Phone (e.g. 03214567890) or Order # (e.g. #3943222)
                </span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter 11-digit phone number, #OrderNumber, or Token..."
                    className="w-full pl-10 pr-9 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden text-stone-900 dark:text-white transition-all"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Find Orders</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Suggestions / Device History Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-stone-400 font-medium">Quick suggestions:</span>

              {savedPhone && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(savedPhone);
                    performSearch(savedPhone);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>My Phone ({savedPhone})</span>
                </button>
              )}

              {recentOrderIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setQuery(id);
                    performSearch(id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-mono flex items-center gap-1 hover:bg-stone-200 transition-colors"
                >
                  <Hash className="w-3 h-3 text-stone-400" />
                  <span>{id}</span>
                </button>
              ))}

            </div>
          </div>

          {/* Body content */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-stone-50/50 dark:bg-stone-950/40">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <div className="space-y-1">
                  <div className="font-bold">No Records Found</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {/* Results Filter Tabs (if orders exist) */}
            {orders.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-stone-200/80 dark:border-stone-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900 dark:text-white">
                    Found {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                  <span className="text-stone-400">•</span>
                  <span className="text-xs text-stone-500 font-mono">
                    {query}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('delivered')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      statusFilter === 'delivered'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    Delivered
                  </button>
                </div>
              </div>
            )}

            {/* List of Orders */}
            {filteredOrders.length > 0 ? (
              <div className="space-y-5">
                {filteredOrders.map((order) => {
                  const stageIndex = getStageIndex(order.status);
                  const badge = getStatusBadge(order.status);
                  const displayId = order.orderNumber || order.orderId;
                  const orderDate = new Date(order.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.orderId}
                      className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Order Card Header */}
                      <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-800/40">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm sm:text-base text-stone-900 dark:text-white">
                              {displayId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(displayId)}
                              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                              title="Copy Order ID"
                            >
                              {copiedId === displayId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>Placed: {orderDate}</span>
                            <span>•</span>
                            <span>Customer: {order.customer.name}</span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.classes}`}
                        >
                          {badge.label}
                        </div>
                      </div>

                      {/* Status Timeline / Milestone Tracker */}
                      {order.status !== 'cancelled' && (
                        <div className="px-4 sm:px-6 py-4 bg-stone-50/30 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                            Milestone Progress
                          </div>
                          <div className="grid grid-cols-5 gap-1 relative">
                            {stages.map((st, idx) => {
                              const isCompleted = stageIndex >= idx;
                              const isCurrent = stageIndex === idx;
                              const Icon = st.icon;

                              return (
                                <div key={st.key} className="flex flex-col items-center text-center">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                                      isCompleted
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-stone-200 dark:bg-stone-800 text-stone-400'
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  <span
                                    className={`text-[9px] sm:text-[10px] leading-tight ${
                                      isCurrent
                                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                        : isCompleted
                                        ? 'font-medium text-stone-800 dark:text-stone-200'
                                        : 'text-stone-400'
                                    }`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center justify-between">
                          <span>Purchased Items ({order.items.length})</span>
                          <span className="font-mono text-[11px] text-stone-500">
                            Subtotal: {formatPKR(order.subtotal, config.store.currency)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                {it.image && (
                                  <img
                                    src={it.image}
                                    alt={it.name}
                                    className="w-11 h-11 rounded-lg object-cover bg-stone-200 dark:bg-stone-700 flex-shrink-0"
                                  />
                                )}
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-stone-900 dark:text-white">
                                    {it.name}
                                  </div>
                                  {it.selectedVariant && (
                                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                      {it.selectedVariant}
                                    </div>
                                  )}
                                  <div className="text-[11px] text-stone-500">
                                    Qty: <span className="font-bold text-stone-700 dark:text-stone-300">{it.quantity}</span> ×{' '}
                                    <span className="font-mono">{formatPKR(it.price, config.store.currency)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right font-mono font-bold text-stone-900 dark:text-white">
                                {formatPKR(it.price * it.quantity, config.store.currency)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Customer Delivery info */}
                        <div className="pt-2 text-xs text-stone-600 dark:text-stone-400 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>
                              {order.customer.address
                                ? `${order.customer.address}, ${order.customer.city || ''}`
                                : 'Direct WhatsApp delivery pickup'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {order.customer.email && (
                              <div className="flex items-center gap-1 text-stone-500">
                                <Mail className="w-3.5 h-3.5 text-stone-400" />
                                <span>{order.customer.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                              <span className="font-mono">{order.customer.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Review Section (Delivered Orders or already reviewed) */}
                        {(() => {
                          const review =
                            reviewsMap[order.orderId.toLowerCase()] ||
                            (order.orderNumber ? reviewsMap[order.orderNumber.toLowerCase()] : null) ||
                            (order.orderNumber ? reviewsMap[order.orderNumber.replace(/\D/g, '')] : null);

                          if (review) {
                            return (
                              <div className="mt-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center space-x-1.5">
                                    <div className="flex items-center text-amber-500">
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${
                                            s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="font-bold text-amber-900 dark:text-amber-300">
                                      {review.rating}/5 Stars
                                    </span>
                                    <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
                                      • Your Verified Review
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReviewOrder(order)}
                                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 transition-colors cursor-pointer"
                                  >
                                    Edit Review
                                  </button>
                                </div>
                                <p className="text-stone-800 dark:text-stone-200 italic font-normal">
                                  "{review.comment}"
                                </p>
                                {review.tags && review.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {review.tags.map(t => (
                                      <span
                                        key={t}
                                        className="text-[10px] bg-white/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // If order is delivered, prompt customer to leave a review
                          if (order.status === 'delivered') {
                            return (
                              <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    <span>How was your experience?</span>
                                  </div>
                                  <p className="text-amber-800/90 dark:text-amber-300/80 text-[11px]">
                                    Your order has been delivered! Rate and comment to help future shoppers.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  id={`leave-review-btn-${order.orderId}`}
                                  onClick={() => setSelectedReviewOrder(order)}
                                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                                  <span>Leave a Review</span>
                                </button>
                              </div>
                            );
                          }

                          return null;
                        })()}

                        {/* Email Dispatch Success Alert */}
                        {emailSuccessMap[order.orderId] && (
                          <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{emailSuccessMap[order.orderId]}</span>
                          </div>
                        )}

                        {/* Financial summary & Actions Bar */}
                        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-stone-500">Grand Total:</span>
                            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                              {formatPKR(order.total, config.store.currency)}
                            </span>
                            {order.shipping === 0 ? (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                                Free Delivery
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400 font-mono">
                                (+ {formatPKR(order.shipping, config.store.currency)} shipping)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Leave Review Shortcut Button if delivered and not yet reviewed */}
                            {order.status === 'delivered' &&
                              !reviewsMap[order.orderId.toLowerCase()] &&
                              !(order.orderNumber && reviewsMap[order.orderNumber.toLowerCase()]) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReviewOrder(order)}
                                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  <span>Review Order</span>
                                </button>
                              )}

                            {/* Email Invoice Dispatch Button */}
                            <button
                              type="button"
                              id={`email-invoice-btn-${order.orderId}`}
                              onClick={() => handleTriggerEmailReceipt(order)}
                              disabled={emailingOrderId === order.orderId}
                              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Send official invoice receipt directly to your email"
                            >
                              {emailingOrderId === order.orderId ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                                  <span>Email Invoice</span>
                                </>
                              )}
                            </button>

                            {/* Live Order Tracking Status Button */}
                            {onOpenTracking && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenTracking(order.orderNumber || order.orderId);
                                  onClose();
                                }}
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800 shadow-2xs"
                                title="Open real-time courier tracking & route status"
                              >
                                <Truck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                                <span>Track Status</span>
                              </button>
                            )}

                            {/* Official Invoice Print */}
                            <button
                              type="button"
                              onClick={() => onViewInvoice(order)}
                              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Invoice Receipt</span>
                            </button>

                            {/* WhatsApp Query */}
                            <a
                              href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}?text=${encodeURIComponent(
                                `Hello ${config.store.name}, I am checking on my order ${displayId} placed under ${order.customer.name}. Could you please update me on its status?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp Help</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasSearched && !loading ? (
              <div className="py-12 text-center space-y-3 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6">
                <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 text-stone-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  No orders found for this search
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Double-check the phone number or order number used during order placement.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Lookup Your Past Orders
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Enter your mobile number or order identifier above to see past orders, track dispatch status, leave verified reviews, and download tax invoices.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Leave a Review Modal */}
        {selectedReviewOrder && (
          <ReviewModal
            order={selectedReviewOrder}
            isOpen={Boolean(selectedReviewOrder)}
            onClose={() => setSelectedReviewOrder(null)}
            onReviewSubmitted={handleReviewSubmitted}
            existingReview={
              reviewsMap[selectedReviewOrder.orderId.toLowerCase()] ||
              (selectedReviewOrder.orderNumber
                ? reviewsMap[selectedReviewOrder.orderNumber.toLowerCase()]
                : null)
            }
          />
        )}

        {/* Email Address Prompt Modal if customer didn't enter email originally */}
        {emailPromptOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => setEmailPromptOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-stone-200 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Email Order Invoice</h3>
                    <p className="text-xs text-stone-500">Order #{emailPromptOrder.orderNumber || emailPromptOrder.orderId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailPromptOrder(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-stone-600">
                Enter the email address where you would like to receive the official tax invoice and dispatch receipt.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700">Recipient Email</label>
                <input
                  type="email"
                  value={customEmailInput}
                  onChange={e => setCustomEmailInput(e.target.value)}
                  placeholder="e.g. yourname@example.com"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailPromptOrder(null)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendPromptEmail}
                  disabled={isSendingCustomEmail}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSendingCustomEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Send Invoice
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
