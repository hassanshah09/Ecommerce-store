import React from 'react';
import {
  X,
  Heart,
  ShoppingBag,
  MessageSquare,
  Trash2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import type { Product, StoreConfig } from '../types';
import { formatPKR } from '../services/api';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  allProducts: Product[];
  config: StoreConfig;
  onRemoveFromWishlist: (productId: string) => void;
  onClearWishlist: () => void;
  onAddToCart: (product: Product) => void;
  onOrderWhatsApp: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onAddAllToCart: (products: Product[]) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  allProducts,
  config,
  onRemoveFromWishlist,
  onClearWishlist,
  onAddToCart,
  onOrderWhatsApp,
  onSelectProduct,
  onAddAllToCart,
}) => {
  if (!isOpen) return null;

  // Filter products in wishlist
  const wishlistedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));
  const availableCount = wishlistedProducts.filter((p) => p.stock > 0).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Heart className="w-5 h-5 fill-rose-600 dark:fill-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    My Wishlist
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                    {wishlistedProducts.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                  <Smartphone className="w-3 h-3 text-stone-400" />
                  <span>Saved on this device only</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {wishlistedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-400 flex items-center justify-center">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Your Wishlist is Empty
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed">
                    Click the heart icon on any product to save items you want to purchase later on this device.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore Catalog</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {wishlistedProducts.map((product) => {
                  const currentPrice = product.discountPrice || product.price;
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex gap-3 group relative transition-all hover:border-emerald-300 dark:hover:border-emerald-700/60"
                    >
                      {/* Product Thumbnail */}
                      <div
                        onClick={() => {
                          onSelectProduct(product);
                          onClose();
                        }}
                        className="w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-stone-900 flex-shrink-0 cursor-pointer border border-stone-200/60 dark:border-stone-700/50"
                      >
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info & Actions */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {product.categoryName}
                            </span>
                            <button
                              onClick={() => onRemoveFromWishlist(product.id)}
                              className="text-stone-400 hover:text-rose-500 transition-colors p-1"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <h4
                            onClick={() => {
                              onSelectProduct(product);
                              onClose();
                            }}
                            className="font-bold text-xs text-stone-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 transition-colors"
                          >
                            {product.name}
                          </h4>

                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="font-mono font-bold text-xs text-stone-900 dark:text-white">
                              {formatPKR(currentPrice, config.store.currency)}
                            </span>
                            {product.discountPrice && (
                              <span className="font-mono text-[10px] text-stone-400 line-through">
                                {formatPKR(product.price, config.store.currency)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 pt-2">
                          <button
                            onClick={() => {
                              onOrderWhatsApp(product);
                              onClose();
                            }}
                            disabled={isOutOfStock}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition-all"
                            title="Order directly on WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => onAddToCart(product)}
                            disabled={isOutOfStock}
                            className="py-1.5 px-2.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 disabled:opacity-40 text-stone-800 dark:text-stone-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Add item to cart"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions */}
          {wishlistedProducts.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>{availableCount} items available in stock</span>
                <button
                  onClick={onClearWishlist}
                  className="text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>

              {availableCount > 0 && (
                <button
                  onClick={() => {
                    const inStockItems = wishlistedProducts.filter((p) => p.stock > 0);
                    onAddAllToCart(inStockItems);
                  }}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add All ({availableCount}) to Cart</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
