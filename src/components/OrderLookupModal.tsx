import React, { useState } from 'react';
import { X, Search, CheckCircle, Clock, Truck, Package, Hash, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Order, StoreConfig } from '../types';
import { fetchOrderById, formatPKR } from '../services/api';

interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onViewInvoice: (order: Order) => void;
}

export const OrderLookupModal: React.FC<OrderLookupModalProps> = ({
  isOpen,
  onClose,
  config,
  onViewInvoice,
}) => {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrderById(query.trim());
      setOrder(res);
    } catch (err: any) {
      setError(`Order "${query.trim()}" not found. Please verify your order number (e.g. #3943222) or token.`);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Verified & Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Processing / Packed', icon: Package },
    { key: 'shipped', label: 'Shipped / Dispatched', icon: Truck },
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

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6"
        >
          {/* Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-stone-900 dark:text-white">Track Your Order</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleSearch} className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Enter your 7-Digit Order # (e.g. #3943222) or Order Token:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. #3943222 or ord_sample_001"
                  className="flex-1 px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>{loading ? 'Searching...' : 'Track'}</span>
                </button>
              </div>
            </form>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {order && (
              <div className="space-y-5 pt-2 border-t border-stone-200 dark:border-stone-800">
                {/* Order Summary banner */}
                <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-stone-900 dark:text-white font-mono">
                      {order.orderNumber || order.orderId}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      order.status === 'confirmed' || order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : order.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Placed For:</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300">{order.customer.name}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Grand Total:</span>
                    <span className="font-bold text-stone-900 dark:text-white font-mono">
                      {formatPKR(order.total, config.store.currency)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                {order.status !== 'cancelled' ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Status Timeline
                    </div>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                      {stages.map((stage, idx) => {
                        const isDone = currentStageIndex >= idx;
                        const isCurrent = currentStageIndex === idx;
                        const Icon = stage.icon;

                        return (
                          <div key={stage.key} className="relative flex items-center gap-3">
                            <div
                              className={`absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isDone
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700'
                              }`}
                            >
                              {isDone && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>

                            <div className="flex items-center gap-2">
                              <Icon
                                className={`w-4 h-4 ${
                                  isCurrent
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isDone
                                    ? 'text-stone-700 dark:text-stone-300'
                                    : 'text-stone-400'
                                }`}
                              />
                              <span
                                className={`text-xs ${
                                  isCurrent
                                    ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                    : isDone
                                    ? 'font-medium text-stone-800 dark:text-stone-200'
                                    : 'text-stone-400'
                                }`}
                              >
                                {stage.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg font-medium">
                    This order was cancelled.
                  </div>
                )}

                {/* View Invoice CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onViewInvoice(order);
                    }}
                    className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View & Print Official Invoice</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
