import React, { useState } from 'react';
import { X, MessageSquare, ShoppingCart, Check, ShieldCheck, Truck, RotateCcw, AlertCircle, Share2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product, StoreConfig } from '../types';
import { formatPKR } from '../services/api';

interface ProductDetailModalProps {
  product: Product | null;
  config: StoreConfig;
  isOpen: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  onClose: () => void;
  onOrderWhatsApp: (product: Product, quantity: number, selectedVariant?: string) => void;
  onAddToCart: (product: Product, quantity: number, selectedVariant?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  config,
  isOpen,
  isWishlisted = false,
  onToggleWishlist,
  onClose,
  onOrderWhatsApp,
  onAddToCart,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !product) return null;

  const currentPrice = product.discountPrice || product.price;
  const originalPrice = product.discountPrice ? product.price : null;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const images = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  // Initialize variants if needed
  const variantSummary = Object.entries(selectedVariants)
    .map(([name, opt]) => `${name}: ${opt}`)
    .join(' | ');

  const handleVariantSelect = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({ ...prev, [variantName]: option }));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 max-h-[90vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 dark:bg-stone-800/90 backdrop-blur-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:white border border-stone-200 dark:border-stone-700 transition-colors shadow-xs"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gallery Column */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-200 dark:border-stone-800">
                <img
                  src={images[selectedImageIndex] || product.thumbnail}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                />

                {/* Wishlist toggle inside gallery */}
                {onToggleWishlist && (
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product)}
                    className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-all active:scale-90 ${
                      isWishlisted
                        ? 'bg-rose-500 text-white shadow-rose-500/30'
                        : 'bg-white/90 dark:bg-stone-900/90 text-stone-600 dark:text-stone-300 hover:text-rose-500'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-emerald-600 scale-95 shadow-sm'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                  <Truck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>Free above 4k</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>100% Genuine</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                  <MessageSquare className="w-4 h-4 text-emerald-600 mb-1" />
                  <span>WhatsApp Direct</span>
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                    {product.categoryName}
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md text-stone-600 dark:text-stone-400">
                      {product.id}
                    </code>
                    <button
                      onClick={handleShare}
                      className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                      title="Copy link"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white leading-tight">
                  {product.name}
                </h2>

                {/* Stock Status Indicator */}
                <div className="flex items-center gap-2 text-xs">
                  {isOutOfStock ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Out of stock
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Only {product.stock} units remaining
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      In Stock ({product.stock} units)
                    </span>
                  )}
                  <span className="text-stone-400">• SKU: {product.sku}</span>
                </div>

                {/* Pricing */}
                <div className="py-2 flex items-baseline gap-3">
                  <span className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white font-mono">
                    {formatPKR(currentPrice, config.store.currency)}
                  </span>
                  {originalPrice && (
                    <span className="text-sm text-stone-400 line-through font-mono">
                      {formatPKR(originalPrice, config.store.currency)}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
                  <p>{product.description}</p>
                </div>

                {/* Variants Picker */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {product.variants.map((v, i) => (
                      <div key={i} className="space-y-1.5">
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Select {v.name}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {v.options.map((opt, oIdx) => {
                            const isSelected = selectedVariants[v.name] === opt;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleVariantSelect(v.name, opt)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="pt-2 flex items-center gap-4">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Quantity:</span>
                  <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-800">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-sm font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold font-mono text-stone-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(product.stock || 10, q + 1))}
                      disabled={quantity >= product.stock}
                      className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-sm font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    onOrderWhatsApp(product, quantity, variantSummary || undefined);
                    onClose();
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Order Directly on WhatsApp</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    onAddToCart(product, quantity, variantSummary || undefined);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Bag ({quantity})</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
