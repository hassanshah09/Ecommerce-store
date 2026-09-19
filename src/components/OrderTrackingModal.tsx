import React, { useState, useEffect } from 'react';
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
  Mail,
  Send,
  ExternalLink,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Order, StoreConfig } from '../types';
import { fetchOrderById, formatPKR, normalizeWhatsApp, sendOrderReceiptEmail } from '../services/api';
import { trackEvent } from '../firebase';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onViewInvoice: (order: Order) => void;
  initialQuery?: string;
  onOpenReview?: (order: Order) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  config,
  onViewInvoice,
  initialQuery = '',
  onOpenReview,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  const performSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setError(null);
    setEmailStatusMsg(null);
    try {
      const res = await fetchOrderById(targetQuery.trim());
      setOrder(res);
      setEmailInput(res.customer.email || '');
      trackEvent('track_order', { order_id: res.orderId, status: res.status });
    } catch {
      setError(`Order "${targetQuery.trim()}" not found. Please double-check your 7-digit order number (e.g. #3943222) or phone number.`);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const stages = [
    {
      key: 'pending',
      title: 'Order Placed',
      description: 'Order registered in system & verification initiated',
      icon: Clock,
    },
    {
      key: 'confirmed',
      title: 'Confirmed',
      description: 'Customer contact verified & 7-digit tracking ID assigned',
      icon: CheckCircle,
    },
    {
      key: 'processing',
      title: 'Packed & Ready',
      description: 'Item inspected, sealed, and ready for courier pickup',
      icon: Package,
    },
    {
      key: 'shipped',
      title: 'In Transit / Dispatched',
      description: 'Handed over to courier with live route transit',
      icon: Truck,
    },
    {
      key: 'delivered',
      title: 'Delivered',
      description: 'Safely delivered to customer address',
      icon: CheckCircle2,
    },
  ];

  const getStageIndex = (status: Order['status']) => {
    switch (status) {
      case 'pending':
      case 'whatsapp_sent':
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

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  // Courier partner simulation based on order token
  const getCourierInfo = (orderData: Order) => {
    const courierOptions = ['Trax Logistics PK', 'TCS Express', 'Leopards Courier Service', 'M&P Express'];
    const charCode = orderData.orderId.charCodeAt(orderData.orderId.length - 1) || 0;
    const courier = courierOptions[charCode % courierOptions.length];
    const trackingCode = `EXP-${(orderData.orderNumber?.replace('#', '') || '94821')}-${(orderData.orderId.slice(0, 4)).toUpperCase()}`;
    return { courier, trackingCode };
  };

  const handleSendEmail = async () => {
    if (!order) return;
    const targetEmail = emailInput.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await sendOrderReceiptEmail(order.orderId, targetEmail);
      setEmailStatusMsg({ success: true, message: res.message || 'Tracking receipt sent to your email inbox!' });
      trackEvent('email_tracking_sent', { order_id: order.orderId });
    } catch (err: any) {
      setEmailStatusMsg({ success: false, message: err.message || 'Failed to send tracking email.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden my-4"
        >
          {/* Header with Dark Blue Branding */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Truck className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                  <span>Live Order Tracking</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                    Real-time
                  </span>
                </h3>
                <p className="text-xs text-blue-200">
                  Track courier transit status, dispatch updates, and delivery schedule
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Enter your 7-Digit Order # (e.g. #3943222), Token, or Phone Number:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-blue-600 dark:text-blue-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. #3943222 or 03115365367"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{loading ? 'Locating...' : 'Track'}</span>
                </button>
              </div>
            </form>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {order && (
              <div className="space-y-6 pt-2">
                {/* Order Status Hero Banner */}
                <div className="p-5 bg-gradient-to-br from-blue-50/80 to-slate-50 dark:from-slate-800/70 dark:to-slate-800/40 rounded-3xl border border-blue-200/80 dark:border-slate-700 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 dark:border-slate-700 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-blue-950 dark:text-blue-100 font-mono tracking-tight">
                          {order.orderNumber || order.orderId}
                        </span>
                        <span className="text-xs text-slate-500">• {order.items.length} item(s)</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.status === 'confirmed' || order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : order.status === 'shipped' || order.status === 'processing'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                            : order.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Recipient</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{order.customer.name}</div>
                      <div className="text-slate-500 font-mono">{order.customer.phone}</div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Delivery Destination</span>
                      <div className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">
                        {order.customer.address || 'Standard Delivery Address'}
                      </div>
                      <div className="text-blue-900 dark:text-blue-300 font-bold">{order.customer.city || 'Pakistan'}</div>
                    </div>
                  </div>
                </div>

                {/* Courier Transit Box */}
                {order.status !== 'cancelled' && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Courier Logistics Partner</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {getCourierInfo(order).courier}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Consignment: {getCourierInfo(order).trackingCode}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Status</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        COD ({formatPKR(order.total, config.store.currency)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress Visual Stepper */}
                {order.status !== 'cancelled' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Order Progress
                      </span>
                      <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                        Step {Math.min(currentStageIndex + 1, 5)} of 5
                      </span>
                    </div>

                    {/* Stepper nodes */}
                    <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-slate-800">
                      {stages.map((stage, idx) => {
                        const isDone = currentStageIndex >= idx;
                        const isCurrent = currentStageIndex === idx;
                        const Icon = stage.icon;

                        return (
                          <div key={stage.key} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-blue-900 border-blue-900 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {isDone ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                              )}
                            </div>

                            <div className="space-y-0.5 pt-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs ${
                                    isCurrent
                                      ? 'font-bold text-blue-950 dark:text-blue-300'
                                      : isDone
                                      ? 'font-bold text-slate-800 dark:text-slate-200'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {stage.title}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded-sm">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {stage.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs rounded-2xl font-medium border border-rose-200">
                    This order was cancelled. Please contact customer support if you need assistance.
                  </div>
                )}

                {/* Email Tracking Updates Feature */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-blue-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Email Tracking Updates & Receipt
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email for live dispatch receipts"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={isSendingEmail}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingEmail ? 'Sending...' : 'Email Me'}</span>
                    </button>
                  </div>
                  {emailStatusMsg && (
                    <p
                      className={`text-[11px] font-medium ${
                        emailStatusMsg.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                      }`}
                    >
                      {emailStatusMsg.message}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onViewInvoice(order)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>View & Download Invoice</span>
                  </button>

                  <a
                    href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}?text=${encodeURIComponent(
                      `Hello ${config.store.name}, I am tracking order ${order.orderNumber || order.orderId}. Could you please share the latest courier status?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Courier Query</span>
                  </a>
                </div>

                {/* Leave a review button if delivered */}
                {order.status === 'delivered' && onOpenReview && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenReview(order)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Order Delivered! Leave a Product Review ★★★★★</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
