import React from 'react';
import { MessageSquare, ShoppingCart, Heart, Star, Sparkles, Zap } from 'lucide-react';
import type { Product, StoreConfig } from '../types';
import { formatPKR } from '../services/api';

interface ProductCardProps {
  product: Product;
  config: StoreConfig;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  onSelect: (product: Product) => void;
  onOrderWhatsApp: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  config,
  isWishlisted = false,
  onToggleWishlist,
  onSelect,
  onOrderWhatsApp,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const currentPrice = product.discountPrice || product.price;
  const originalPrice = product.discountPrice ? product.price : null;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;
  const savings = originalPrice ? originalPrice - currentPrice : 0;

  return (
    <div className="group relative flex flex-col bg-white/90 dark:bg-stone-900/85 rounded-2xl border border-slate-200/80 dark:border-stone-800 overflow-hidden shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_22px_48px_rgba(14,165,233,0.14)] hover:border-sky-300/80 dark:hover:border-sky-600/70 transition-all duration-300 hover:-translate-y-1">
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-slate-100 via-white to-sky-50 dark:from-stone-800 dark:via-stone-900 dark:to-sky-950/40 overflow-hidden cursor-pointer">
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          onClick={() => onSelect(product)}
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ease-out"
        />

        {/* Wishlist Heart Button (Top Right) */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-md ${
              isWishlisted
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-white/90 dark:bg-stone-900/90 text-stone-600 dark:text-stone-300 hover:text-rose-500 dark:hover:text-rose-400 hover:scale-110'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist (Saved on this device)'}
            aria-label="Wishlist toggle"
          >
            <Heart
              className={`w-4 h-4 transition-all ${
                isWishlisted ? 'fill-current stroke-current scale-110' : 'stroke-[2.2]'
              }`}
            />
          </button>
        )}

        {/* Badges Overlay (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {discountPercent > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold tracking-wide shadow-sm flex items-center gap-0.5">
              <span>{discountPercent}% OFF</span>
            </span>
          )}
          {product.newArrival && (
            <span className="px-2 py-0.5 rounded-lg bg-blue-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>New</span>
            </span>
          )}
        </div>

        {/* Stock Status Pill (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-md bg-stone-950/85 backdrop-blur-sm text-rose-300 text-[10px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Out of stock
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 rounded-md bg-stone-950/85 backdrop-blur-sm text-amber-300 text-[10px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Only {product.stock} left
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-stone-950/85 backdrop-blur-sm text-blue-200 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              In Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Category & ID */}
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 dark:text-blue-400">
              {product.categoryName}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
              <span>4.9</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(product)}
            className="font-bold text-stone-900 dark:text-white text-sm line-clamp-2 hover:text-blue-900 dark:hover:text-blue-400 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-1">
            {product.shortDescription}
          </p>
        </div>

        {/* Pricing Block */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-blue-950 dark:text-white font-mono">
              {formatPKR(currentPrice, config.store.currency)}
            </span>
            {originalPrice && (
              <span className="text-xs text-stone-400 line-through font-mono">
                {formatPKR(originalPrice, config.store.currency)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <span className="text-[10px] text-blue-800 dark:text-blue-400 font-semibold">
              Save {formatPKR(savings, config.store.currency)}
            </span>
          )}
        </div>

        {/* Action Buttons: WhatsApp Direct Order + Cart */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onOrderWhatsApp(product)}
            disabled={isOutOfStock}
            className="col-span-4 py-2.5 px-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-[0_12px_20px_rgba(16,185,129,0.28)] transition-all"
            title="Order directly via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Order on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className="col-span-1 py-2 bg-slate-100 hover:bg-sky-50 hover:text-sky-900 dark:bg-stone-800 dark:hover:bg-stone-700 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-stone-700 dark:text-stone-200 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-sky-300 dark:hover:border-sky-800 shadow-sm"
            title="Add to Cart"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
