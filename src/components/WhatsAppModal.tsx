import React, { useState } from 'react';
import { MessageSquare, X, CheckCircle, ArrowRight, ShieldCheck, Phone, MapPin, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product, StoreConfig, Order } from '../types';
import { buildWhatsAppOrderLink, createOrder, formatPKR } from '../services/api';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  items?: { productId: string; name: string; price: number; quantity: number; selectedVariant?: string; image?: string }[];
  totalAmount?: number;
  config: StoreConfig;
  onOrderCreated?: (order: Order) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  product,
  items,
  totalAmount,
  config,
  onOrderCreated,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Single product or multi-item cart
  const orderItems = items || (product ? [{
    productId: product.id,
    name: product.name,
    price: product.discountPrice || product.price,
    quantity: 1,
    image: product.thumbnail,
  }] : []);

  const subtotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const shipping = subtotal >= 4000 ? 0 : 250;
  const calculatedTotal = totalAmount ?? (subtotal + shipping);

  const handleProceedToWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Please provide your WhatsApp contact number');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create pending order in database
      const order = await createOrder({
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          city: customerCity.trim(),
          notes: customerNotes.trim(),
        },
        items: orderItems,
        shipping,
      });

      setCreatedOrder(order);
      try {
        if (order.customer.phone) {
          localStorage.setItem('novamart_customer_phone', order.customer.phone);
        }
        const recentId = order.orderNumber || order.orderId;
        const existingRecent: string[] = JSON.parse(localStorage.getItem('novamart_recent_orders') || '[]');
        const updatedRecent = [recentId, ...existingRecent.filter((x) => x !== recentId)].slice(0, 5);
        localStorage.setItem('novamart_recent_orders', JSON.stringify(updatedRecent));
      } catch {
        // ignore localStorage errors
      }
      if (onOrderCreated) onOrderCreated(order);

      // Build WhatsApp message
      const waUrl = buildWhatsAppOrderLink(config.contact.whatsappNumber, {
        total: order.total,
        currency: config.store.currency,
        items: order.items,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerAddress: order.customer.address ? `${order.customer.address}, ${order.customer.city || ''}` : undefined,
        orderToken: order.token,
      });

      // Redirect to WhatsApp in a new window/tab
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize WhatsApp order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Order via WhatsApp</h3>
                <p className="text-xs text-emerald-100">Direct instant ordering • No account needed</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {createdOrder ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-stone-900 dark:text-white">Order Record Created!</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    WhatsApp chat has been opened. Our seller will review your order shortly.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-left text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Order Token:</span>
                    <code className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{createdOrder.token}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total:</span>
                    <span className="font-bold text-stone-900 dark:text-white">{formatPKR(createdOrder.total, config.store.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">WhatsApp Dispatch:</span>
                    <span className="text-stone-700 dark:text-stone-300 font-mono">{config.contact.whatsappNumber}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const waUrl = buildWhatsAppOrderLink(config.contact.whatsappNumber, {
                        total: createdOrder.total,
                        currency: config.store.currency,
                        items: createdOrder.items,
                        customerName: createdOrder.customer.name,
                        customerPhone: createdOrder.customer.phone,
                        orderToken: createdOrder.token,
                      });
                      window.open(waUrl, '_blank');
                    }}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Reopen WhatsApp Chat
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl transition-colors text-sm"
                  >
                    Done & Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProceedToWhatsApp} className="space-y-4">
                {/* Order Preview Box */}
                <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                    Order Summary ({orderItems.length} {orderItems.length === 1 ? 'item' : 'items'})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1 divide-y divide-stone-100 dark:divide-stone-800">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-stone-900 dark:text-stone-100 truncate">{item.name}</p>
                          <p className="text-xs text-stone-500 font-mono">ID: {item.productId} • Qty: {item.quantity}</p>
                        </div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                          {formatPKR(item.price * item.quantity, config.store.currency)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center text-sm font-bold">
                    <span className="text-stone-700 dark:text-stone-300">Total with Delivery:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-base">
                      {formatPKR(calculatedTotal, config.store.currency)}
                    </span>
                  </div>
                  {shipping === 0 && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 text-right font-medium">
                      ✓ Free Delivery Qualified
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-400" /> Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Usman Tariq"
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 03124567890"
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" /> City
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Lahore / Karachi"
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Special Instructions
                      </label>
                      <input
                        type="text"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Call before arrival"
                        className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Street, House/Flat number, Area"
                      className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-stone-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Your order token will be generated and saved for verification.</span>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                  >
                    {isSubmitting ? (
                      <span>Creating Order...</span>
                    ) : (
                      <>
                        <span>Continue to WhatsApp</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
