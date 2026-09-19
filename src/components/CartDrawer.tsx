import React from 'react';
import { X, Trash2, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StoreConfig } from '../types';
import { formatPKR } from '../services/api';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedVariant?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  config: StoreConfig;
  onUpdateQuantity: (productId: string, quantity: number, selectedVariant?: string) => void;
  onRemoveItem: (productId: string, selectedVariant?: string) => void;
  onCheckoutWhatsApp: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  config,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutWhatsApp,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const freeShippingThreshold = 4000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shipping = items.length === 0 ? 0 : isFreeShipping ? 0 : 250;
  const grandTotal = subtotal + shipping;
  const neededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="w-screen max-w-md bg-white dark:bg-stone-900 shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  Shopping Bag ({items.reduce((acc, it) => acc + it.quantity, 0)})
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Progress bar */}
            {items.length > 0 && (
              <div className="px-4 py-3 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40">
                <div className="flex justify-between items-center text-xs font-semibold mb-1 text-blue-950 dark:text-blue-200">
                  {isFreeShipping ? (
                    <span className="flex items-center gap-1">🎉 You unlocked FREE Delivery!</span>
                  ) : (
                    <span>Add {formatPKR(neededForFreeShipping, config.store.currency)} more for FREE Delivery!</span>
                  )}
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-900 dark:bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-100 dark:divide-stone-800">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-stone-800 rounded-full flex items-center justify-center text-blue-900 dark:text-blue-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">Your bag is empty</h4>
                  <p className="text-xs text-stone-500 max-w-xs">
                    Browse our premium catalog and order your favorite products instantly via WhatsApp.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={`${item.productId}-${item.selectedVariant || ''}-${idx}`} className="pt-3 first:pt-0 flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0 border border-stone-200 dark:border-stone-800">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                            {item.name}
                          </h5>
                          <button
                            onClick={() => onRemoveItem(item.productId, item.selectedVariant)}
                            className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                          <span>{item.productId}</span>
                          {item.selectedVariant && (
                            <span className="text-emerald-600 dark:text-emerald-400">• {item.selectedVariant}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden bg-stone-50 dark:bg-stone-800">
                          <button
                            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1, item.selectedVariant)}
                            className="px-2 py-0.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 py-0.5 text-xs font-mono font-bold text-stone-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1, item.selectedVariant)}
                            className="px-2 py-0.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-xs font-extrabold text-stone-900 dark:text-white font-mono">
                          {formatPKR(item.price * item.quantity, config.store.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {items.length > 0 && (
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {formatPKR(subtotal, config.store.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Shipping</span>
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {shipping === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : formatPKR(shipping, config.store.currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between text-sm font-black text-stone-900 dark:text-white">
                    <span>Total Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatPKR(grandTotal, config.store.currency)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCheckoutWhatsApp();
                  }}
                  className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Order Entire Bag on WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
