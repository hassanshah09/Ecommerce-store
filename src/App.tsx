import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShoppingBag,
  Moon,
  Sun,
  MessageSquare,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  Hash,
  Heart,
  X,
  Filter,
  Flame,
  Tag,
  Grid3X3,
  LayoutGrid,
  PackageCheck,
} from 'lucide-react';
import type { Product, Category, StoreConfig, Order } from './types';
import {
  fetchStoreConfig,
  fetchCategories,
  fetchProducts,
  formatPKR,
  normalizeWhatsApp,
} from './services/api';
import {
  getDeviceWishlist,
  toggleDeviceWishlist,
  clearDeviceWishlist,
  subscribeWishlist,
} from './services/wishlist';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { WhatsAppModal } from './components/WhatsAppModal';
import { OrderLookupModal } from './components/OrderLookupModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { OrderHistory } from './components/OrderHistory';
import { InvoiceModal } from './components/InvoiceModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminAuthGate } from './components/admin/AdminAuthGate';
import { auth, trackEvent } from './firebase';
import { signOut } from 'firebase/auth';

const isAdminBuild = import.meta.env.MODE === 'admin';

export default function App() {
  // Theme: User explicitly requested White & Dark Blue in light theme mode, set default as default (Light Mode)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('novamart_theme');
      if (saved) return saved === 'dark';
    } catch {
      // ignore
    }
    return false; // Default is explicitly Light Theme (White & Dark Blue)
  });

  // Admin routing & authentication (completely decoupled from customer UI)
  const checkIsAdminPath = useCallback(() => {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/admin' ||
      path.startsWith('/admin/') ||
      search.includes('admin') ||
      hash.includes('admin')
    );
  }, []);

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(isAdminBuild || checkIsAdminPath());
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Secret shortcut tap counter (5 taps on footer copyright within 3 seconds)
  const [secretTapCount, setSecretTapCount] = useState(0);

  // Core Store Data
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters, Search & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('auto'); // Default: Auto-sorted (Newest added first)
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [dealsOnly, setDealsOnly] = useState<boolean>(false);
  const [gridDensity, setGridDensity] = useState<'standard' | 'compact'>('standard');

  // Device Wishlist State (Local to same device)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getDeviceWishlist());
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Cart State (stored locally)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('novamart_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppModalProduct, setWhatsAppModalProduct] = useState<Product | null>(null);
  const [whatsAppModalItems, setWhatsAppModalItems] = useState<CartItem[] | undefined>(undefined);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [isOrderLookupOpen, setIsOrderLookupOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [orderTrackingQuery, setOrderTrackingQuery] = useState('');
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [orderHistoryQuery, setOrderHistoryQuery] = useState('');
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync wishlist updates across components
  useEffect(() => {
    return subscribeWishlist(setWishlistIds);
  }, []);

  // Listen to browser navigation changes for admin route
  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminRoute(isAdminBuild || checkIsAdminPath());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Global keyboard shortcut for admin: Ctrl+Shift+A or Cmd+Shift+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdminBuild) {
          window.history.pushState(null, '', '/admin');
          setIsAdminRoute(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [checkIsAdminPath]);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('novamart_cart', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // Load initial store data
  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [cfg, cats, prods] = await Promise.all([
        fetchStoreConfig(),
        fetchCategories(),
        fetchProducts({ status: 'published', sort: 'auto' }),
      ]);
      setConfig(cfg);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  // Keep branding and WhatsApp routing current when admin changes config elsewhere.
  useEffect(() => {
    if (isAdminRoute) return;

    const refreshConfig = async () => {
      try {
        const latestConfig = await fetchStoreConfig();
        setConfig((currentConfig) => {
          if (JSON.stringify(currentConfig) === JSON.stringify(latestConfig)) return currentConfig;
          return latestConfig;
        });
      } catch {
        // Keep the current store visible during a temporary API interruption.
      }
    };

    const intervalId = window.setInterval(refreshConfig, 3000);
    return () => window.clearInterval(intervalId);
  }, [isAdminRoute]);

  const handleAdminSuccess = useCallback(() => {
    setIsAdminAuthenticated(true);
  }, []);

  // Exit Admin back to store
  const handleExitAdmin = () => {
    void signOut(auth);
    if (isAdminBuild) {
      window.location.reload();
      return;
    }
    setIsAdminRoute(false);
    setIsAdminAuthenticated(false);
    try {
      window.history.pushState(null, '', '/');
    } catch {
      // ignore
    }
    // Refresh catalog when returning from admin
    loadStoreData();
  };

  // Secret 5-tap owner shortcut on footer
  const handleSecretTap = () => {
    if (isAdminBuild) return;
    setSecretTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        window.history.pushState(null, '', '/admin');
        setIsAdminRoute(true);
        return 0;
      }
      return next;
    });

    // Reset tap count if no further taps within 3 seconds
    setTimeout(() => {
      setSecretTapCount(0);
    }, 3000);
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    toggleDeviceWishlist(product.id);
    trackEvent('toggle_wishlist', { item_id: product.id, item_name: product.name });
  };

  const handleRemoveFromWishlist = (productId: string) => {
    toggleDeviceWishlist(productId);
  };

  const handleClearWishlist = () => {
    clearDeviceWishlist();
  };

  const handleAddWishlistToCart = (itemsToAdd: Product[]) => {
    trackEvent('add_wishlist_to_cart', { items_count: itemsToAdd.length });
    setCartItems((prev) => {
      const updated = [...prev];
      itemsToAdd.forEach((prod) => {
        const existingIdx = updated.findIndex(
          (it) => it.productId === prod.id && !it.selectedVariant
        );
        if (existingIdx > -1) {
          updated[existingIdx].quantity += 1;
        } else {
          updated.push({
            productId: prod.id,
            name: prod.name,
            price: prod.discountPrice || prod.price,
            quantity: 1,
            image: prod.thumbnail,
          });
        }
      });
      return updated;
    });
    setIsWishlistOpen(false);
    setIsCartOpen(true);
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1, selectedVariant?: string) => {
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      price: product.discountPrice || product.price,
      quantity,
    });
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === product.id && it.selectedVariant === selectedVariant
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.discountPrice || product.price,
          quantity,
          image: product.thumbnail,
          selectedVariant,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number, selectedVariant?: string) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId, selectedVariant);
      return;
    }
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId && it.selectedVariant === selectedVariant) {
          return { ...it, quantity };
        }
        return it;
      })
    );
  };

  const handleRemoveCartItem = (productId: string, selectedVariant?: string) => {
    setCartItems((prev) =>
      prev.filter((it) => !(it.productId === productId && it.selectedVariant === selectedVariant))
    );
  };

  // WhatsApp Order triggers
  const handleDirectWhatsAppOrder = (product: Product, quantity = 1, selectedVariant?: string) => {
    setWhatsAppModalProduct(product);
    setWhatsAppModalItems([
      {
        productId: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        quantity,
        image: product.thumbnail,
        selectedVariant,
      },
    ]);
    setIsWhatsAppModalOpen(true);
  };

  const handleCartCheckoutWhatsApp = () => {
    if (cartItems.length === 0) return;
    setWhatsAppModalProduct(null);
    setWhatsAppModalItems(cartItems);
    setIsWhatsAppModalOpen(true);
  };

  // -------------------------------------------------------------
  // ADMIN PORTAL ROUTE (Completely separate from storefront)
  // -------------------------------------------------------------
  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <AdminAuthGate
          onSuccess={handleAdminSuccess}
          onExit={handleExitAdmin}
        />
      );
    }

    if (config) {
      return (
        <AdminDashboard
          config={config}
          onConfigUpdated={(newCfg) => setConfig(newCfg)}
          onExitAdmin={handleExitAdmin}
          darkMode={darkMode}
          onToggleTheme={() => {
            setDarkMode((current) => {
              const next = !current;
              try {
                localStorage.setItem('novamart_theme', next ? 'dark' : 'light');
              } catch {
                // ignore
              }
              return next;
            });
          }}
        />
      );
    }
  }

  // Loading state
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Loading Store...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FILTERING & AUTO-SORTING LOGIC
  // -------------------------------------------------------------
  const filteredProducts = products.filter((p) => {
    // 1. Category Filter
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
      return false;
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 3. Price Filter
    const effectivePrice = p.discountPrice || p.price;
    if (priceFilter === 'under-3000' && effectivePrice >= 3000) return false;
    if (priceFilter === '3000-5000' && (effectivePrice < 3000 || effectivePrice > 5000)) return false;
    if (priceFilter === '5000-8000' && (effectivePrice < 5000 || effectivePrice > 8000)) return false;
    if (priceFilter === 'above-8000' && effectivePrice <= 8000) return false;

    // 4. In Stock Filter
    if (inStockOnly && p.stock <= 0) return false;

    // 5. Deals Only Filter
    if (dealsOnly && !p.discountPrice) return false;

    return true;
  });

  // Auto-Sort: Ensures products added by admin are automatically sorted to the top!
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return (a.discountPrice || a.price) - (b.discountPrice || b.price);
    }
    if (sortBy === 'price-desc') {
      return (b.discountPrice || b.price) - (a.discountPrice || a.price);
    }
    if (sortBy === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'featured') {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Default 'auto' / 'newest': Newly created products appear first!
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const totalWishlistCount = wishlistIds.length;

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    priceFilter !== 'all' ||
    inStockOnly ||
    dealsOnly ||
    sortBy !== 'auto';

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setPriceFilter('all');
    setInStockOnly(false);
    setDealsOnly(false);
    setSortBy('auto');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-stone-950 text-slate-900 dark:text-stone-100 transition-colors duration-200">
      {/* 1. Top Announcement Bar */}
      {config.announcement?.enabled && (
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-sky-900 text-white text-[11px] font-semibold py-2 px-4 text-center tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-sm">
          <span>{config.announcement.text}</span>
        </div>
      )}

      {/* 2. Sleek Customer Header */}
      <header className="sticky top-0 z-30 glass-panel bg-white/80 dark:bg-stone-900/80 border-b border-slate-200/80 dark:border-stone-800/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            {config.branding.logo ? (
              <div className="flex items-center gap-3">
                <img src={config.branding.logo} alt={config.store.name} className="h-10 w-auto object-contain brand-logo-image" />
                <div className="flex flex-col leading-none">
                  <span className="font-black text-base sm:text-lg tracking-tight text-slate-950 dark:text-white">
                    {config.store.name}
                  </span>
                  <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold tracking-[0.22em] uppercase">
                    WhatsApp Store • PK
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-900 text-white flex items-center justify-center font-black text-base shadow-lg shadow-sky-500/20">
                  {config.store.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-base sm:text-lg tracking-tight leading-none text-slate-950 dark:text-white">
                    {config.store.name}
                  </span>
                  <span className="text-[10px] text-blue-900 dark:text-blue-400 font-bold tracking-wide">
                    WhatsApp Store • PK
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search bar (Desktop Center) */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, or IDs (e.g. sho_1245832)..."
              className="w-full pl-10 pr-9 py-2 bg-slate-100 dark:bg-stone-800/80 border border-transparent hover:border-slate-300 dark:hover:border-stone-700 focus:border-blue-700 focus:bg-white dark:focus:bg-stone-900 rounded-xl text-xs focus:ring-2 focus:ring-blue-700/20 focus:outline-hidden transition-all text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Tools: Track Order, Wishlist, Cart, Theme (No Admin Button!) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Live Order Tracking Button */}
            <button
              id="header-track-order-button"
              onClick={() => {
                setOrderTrackingQuery('');
                setIsOrderTrackingOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Track Real-time Order & Courier Status"
            >
              <Truck className="w-4 h-4 text-blue-200" />
              <span>Track Order</span>
            </button>

            {/* My Orders Button */}
            <button
              id="header-my-orders-button"
              onClick={() => {
                setOrderHistoryQuery('');
                setIsOrderHistoryOpen(true);
              }}
              className="hidden sm:flex px-2.5 sm:px-3 py-1.5 text-slate-800 dark:text-stone-200 hover:text-blue-950 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-stone-800 rounded-xl text-xs font-bold items-center gap-1.5 transition-colors border border-slate-200 dark:border-stone-700 hover:border-blue-300 shadow-2xs cursor-pointer"
              title="My Orders & Purchase History"
            >
              <PackageCheck className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>My Orders</span>
            </button>

            {/* Wishlist Button (Device Only) */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              className="relative p-2 text-slate-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              aria-label="View Wishlist"
              title="View Wishlist (Saved on this device)"
            >
              <Heart className={`w-5 h-5 ${totalWishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {totalWishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs">
                  {totalWishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-blue-50 dark:bg-stone-800 hover:bg-blue-100 dark:hover:bg-stone-700 text-blue-950 dark:text-blue-300 rounded-xl flex items-center justify-center transition-colors shadow-2xs border border-blue-200/60 dark:border-stone-700 cursor-pointer"
              aria-label="View Shopping Cart"
              title="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-900 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                try {
                  localStorage.setItem('novamart_theme', !darkMode ? 'dark' : 'light');
                } catch {
                  // ignore
                }
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60 hover:text-blue-950 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              aria-label="Toggle theme"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or IDs..."
              className="w-full pl-10 pr-9 py-2 bg-slate-100 dark:bg-stone-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-700 focus:outline-hidden text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Showcase Banner with Premium Styling */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_22%),linear-gradient(135deg,_#eff8ff_0%,_#f8fafc_45%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_25%),linear-gradient(135deg,_#020817_0%,_#0f172a_45%,_#111827_100%)] border-b border-blue-100/80 dark:border-stone-800/80 py-8 md:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,_rgba(59,130,246,0.14),_transparent_18%),radial-gradient(circle_at_85%_82%,_rgba(14,165,233,0.14),_transparent_20%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 text-xs font-bold tracking-[0.18em] uppercase border border-sky-200/90 dark:border-sky-800/80 shadow-lg shadow-sky-100/60 dark:shadow-none">
              <Sparkles className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
              <span>Official WhatsApp Commerce • Pakistan</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 dark:text-white tracking-[-0.05em] leading-[0.96]">
              {config.store.name}
            </h1>

            <p className="text-sm md:text-base text-slate-600 dark:text-stone-300 leading-relaxed max-w-2xl">
              {config.store.tagline}. Order in 1-click directly through WhatsApp without cumbersome signups or forgotten passwords. Real-time order verification & instant tax invoices.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-900 hover:from-sky-500 hover:to-blue-800 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-[0_12px_24px_rgba(14,165,233,0.35)] transition-all duration-200"
              >
                <MessageSquare className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Chat with Store on WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  setOrderTrackingQuery('');
                  setIsOrderTrackingOpen(true);
                }}
                className="px-5 py-2.5 bg-white/85 dark:bg-stone-900/85 hover:bg-sky-50 dark:hover:bg-stone-800 text-sky-900 dark:text-sky-300 font-bold rounded-xl text-xs border border-sky-200 dark:border-stone-800 transition-all flex items-center gap-1.5 shadow-[0_10px_22px_rgba(14,165,233,0.1)] cursor-pointer hover:-translate-y-0.5"
              >
                <Truck className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                <span>Track Live Status</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('catalog');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 text-slate-800 dark:text-stone-200 font-semibold rounded-xl text-xs border border-slate-200/90 dark:border-stone-800 transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
              >
                <span>Browse Products</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-stone-400">
              <div className="flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 px-2.5 py-2 border border-slate-200/80 dark:border-stone-800">
                <CheckCircle2 className="w-4 h-4 text-sky-700 dark:text-sky-400 flex-shrink-0" />
                <span>Zero Account Signup</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 px-2.5 py-2 border border-slate-200/80 dark:border-stone-800">
                <Truck className="w-4 h-4 text-sky-700 dark:text-sky-400 flex-shrink-0" />
                <span>Free Shipping &gt; 4,000</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 px-2.5 py-2 border border-slate-200/80 dark:border-stone-800">
                <ShieldCheck className="w-4 h-4 text-sky-700 dark:text-sky-400 flex-shrink-0" />
                <span>100% Genuine Quality</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/5 px-2.5 py-2 border border-slate-200/80 dark:border-stone-800">
                <Hash className="w-4 h-4 text-sky-700 dark:text-sky-400 flex-shrink-0" />
                <span>Official # Invoice</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Category Pill Bar */}
      <section className="bg-white dark:bg-stone-900 border-b border-slate-200 dark:border-stone-800 sticky top-16 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 hover:bg-slate-200 dark:hover:bg-stone-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Products</span>
              <span className="text-[10px] opacity-80 font-mono">({products.length})</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 hover:bg-slate-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <span>{cat.displayName}</span>
                  {cat.productCount !== undefined && (
                    <span className="text-[10px] opacity-75 font-mono">({cat.productCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Main Catalog & Easy Filtering Toolbar */}
      <main id="catalog" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Comprehensive Filter & Auto-Sort Bar */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-slate-200 dark:border-stone-800 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Catalog Title & Count */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  {selectedCategory === 'all'
                    ? 'Store Catalog'
                    : categories.find((c) => c.id === selectedCategory)?.displayName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-950 dark:text-blue-300 text-[11px] font-bold">
                  {sortedProducts.length} items
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {sortBy === 'auto'
                  ? '⚡ Auto-sorted (Newest additions always appear first)'
                  : `Sorted by ${sortBy}`}
              </p>
            </div>

            {/* Quick Filters & Sorting Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* In-Stock Toggle */}
              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  inStockOnly
                    ? 'bg-blue-50 border-blue-600 text-blue-950 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-stone-800/80 border-slate-200 dark:border-stone-700 text-slate-600 dark:text-stone-300 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-blue-600' : 'bg-slate-400'}`} />
                <span>In Stock Only</span>
              </button>

              {/* Deals Only Toggle */}
              <button
                type="button"
                onClick={() => setDealsOnly(!dealsOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  dealsOnly
                    ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-stone-800/80 border-slate-200 dark:border-stone-700 text-slate-600 dark:text-stone-300 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-rose-500" />
                <span>Deals & Sale</span>
              </button>

              {/* Price Filter Selector */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-semibold text-slate-500">Price:</span>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-stone-200 focus:outline-hidden"
                >
                  <option value="all">All Prices</option>
                  <option value="under-3000">Under PKR 3,000</option>
                  <option value="3000-5000">PKR 3,000 - 5,000</option>
                  <option value="5000-8000">PKR 5,000 - 8,000</option>
                  <option value="above-8000">Above PKR 8,000</option>
                </select>
              </div>

              {/* Auto-Sorting Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700 rounded-xl px-2.5 py-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-stone-200 focus:outline-hidden"
                >
                  <option value="auto">Auto-Sorted (Newest First)</option>
                  <option value="featured">Featured & Best Sellers</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="alpha">Alphabetical (A - Z)</option>
                </select>
              </div>

              {/* Grid density toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-slate-200 dark:border-stone-700 rounded-xl p-0.5 bg-slate-50 dark:bg-stone-800">
                <button
                  type="button"
                  onClick={() => setGridDensity('standard')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    gridDensity === 'standard'
                      ? 'bg-white dark:bg-stone-900 text-blue-900 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Standard Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGridDensity('compact')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    gridDensity === 'compact'
                      ? 'bg-white dark:bg-stone-900 text-blue-900 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Compact Grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter badges row if any */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-stone-400">Active Filters:</span>
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-[11px]">
                  Category: {categories.find((c) => c.id === selectedCategory)?.displayName}
                  <button onClick={() => setSelectedCategory('all')}>
                    <X className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-[11px]">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                  </button>
                </span>
              )}
              {priceFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-[11px]">
                  Price: {priceFilter}
                  <button onClick={() => setPriceFilter('all')}>
                    <X className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px]">
                  In Stock Only
                  <button onClick={() => setInStockOnly(false)}>
                    <X className="w-3 h-3 text-emerald-600" />
                  </button>
                </span>
              )}
              {dealsOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px]">
                  Deals Only
                  <button onClick={() => setDealsOnly(false)}>
                    <X className="w-3 h-3 text-rose-600" />
                  </button>
                </span>
              )}
              <button
                onClick={resetAllFilters}
                className="text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {sortedProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-xs">
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-400 mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">No products match your filters</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Try resetting your price range, searching for another keyword, or selecting all categories.
            </p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-4 sm:gap-5 ${
              gridDensity === 'compact'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                config={config}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={handleToggleWishlist}
                onSelect={(p) => setSelectedProductDetail(p)}
                onOrderWhatsApp={(p) => handleDirectWhatsAppOrder(p)}
                onAddToCart={(p) => handleAddToCart(p)}
              />
            ))}
          </div>
        )}

        {/* Promotional Free Delivery Feature Banner */}
        <section className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl text-center md:text-left relative z-10">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
              Fast Dispatch Guarantee
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Need Assistance with your Order?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Our sales and support team is online on WhatsApp. Message us directly with questions about sizes, bulk discounts, custom colors, or delivery timelines.
            </p>
          </div>

          <a
            href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-white text-emerald-950 font-black text-xs rounded-2xl flex items-center gap-2 hover:bg-emerald-50 active:scale-95 transition-all shadow-lg flex-shrink-0 relative z-10"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Open WhatsApp Chat</span>
          </a>
        </section>
      </main>

      {/* 6. Customer-Centric Footer (Zero Admin Buttons!) */}
      <footer className="bg-blue-950 dark:bg-stone-950 border-t border-blue-900 dark:border-stone-800 text-white pt-12 pb-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            {/* Store branding */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 font-black text-lg text-stone-900 dark:text-white">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                  {config.store.name.charAt(0)}
                </div>
                <span>{config.store.name}</span>
              </div>
              <p className="text-blue-100 dark:text-stone-300 max-w-sm leading-relaxed">
                {config.footer.description}
              </p>
              <div className="space-y-1 text-blue-100 dark:text-stone-300 font-mono text-[11px]">
                <div>WhatsApp: +{normalizeWhatsApp(config.contact.whatsappNumber)}</div>
                {config.contact.email && <div>Email: {config.contact.email}</div>}
                {config.contact.supportHours && <div>Hours: {config.contact.supportHours}</div>}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Product Categories
              </h4>
              <ul className="space-y-1.5 text-blue-100 dark:text-stone-400">
                {categories.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c.id);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {c.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Assurance */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                Customer Care & Ordering
              </h4>
              <p className="text-blue-100 dark:text-stone-400 leading-relaxed">
                Direct WhatsApp ordering with verified confirmation, live courier route tracking, and automated tax receipt for every delivery.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setOrderTrackingQuery('');
                    setIsOrderTrackingOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-blue-900 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Order Status</span>
                </button>
                <button
                  onClick={() => setIsOrderHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 text-slate-700 dark:text-stone-300 font-bold hover:underline cursor-pointer"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                  <span>My Orders & History</span>
                </button>
                <button
                  onClick={() => setIsWishlistOpen(true)}
                  className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>View Saved Wishlist</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom copyright line with hidden secret tap trigger */}
          <div className="pt-6 border-t border-slate-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 dark:text-stone-400 text-[11px]">
            {/* Secret 5-tap owner shortcut */}
            <span
              onClick={handleSecretTap}
              className="cursor-default select-none transition-opacity hover:text-slate-700 dark:hover:text-stone-300"
              title=""
            >
              {config.footer.copyright}
            </span>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setOrderTrackingQuery('');
                  setIsOrderTrackingOpen(true);
                }}
                className="hover:underline text-blue-900 dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Truck className="w-3 h-3" />
                <span>Track Order</span>
              </button>
              <span>•</span>
              <button onClick={() => setIsOrderHistoryOpen(true)} className="hover:underline cursor-pointer">
                My Orders
              </button>
              <span>•</span>
              <button onClick={() => setIsWishlistOpen(true)} className="hover:underline cursor-pointer">
                Wishlist
              </button>
              <span>•</span>
              <a
                href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Help Bubble */}
      <a
        href={`https://wa.me/${normalizeWhatsApp(config.contact.whatsappNumber)}?text=${encodeURIComponent('Hello! I am browsing your store and need assistance.')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 p-3.5 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center transition-all group cursor-pointer border-2 border-white dark:border-stone-800"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
          Chat on WhatsApp
        </span>
      </a>

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        config={config}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckoutWhatsApp={handleCartCheckoutWhatsApp}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistIds={wishlistIds}
        allProducts={products}
        config={config}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onClearWishlist={handleClearWishlist}
        onAddToCart={(p) => handleAddToCart(p)}
        onOrderWhatsApp={(p) => handleDirectWhatsAppOrder(p)}
        onSelectProduct={(p) => setSelectedProductDetail(p)}
        onAddAllToCart={handleAddWishlistToCart}
      />

      <ProductDetailModal
        product={selectedProductDetail}
        config={config}
        isOpen={Boolean(selectedProductDetail)}
        isWishlisted={selectedProductDetail ? wishlistIds.includes(selectedProductDetail.id) : false}
        onToggleWishlist={(p) => handleToggleWishlist(p)}
        onClose={() => setSelectedProductDetail(null)}
        onOrderWhatsApp={(p, q, v) => handleDirectWhatsAppOrder(p, q, v)}
        onAddToCart={(p, q, v) => handleAddToCart(p, q, v)}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        product={whatsAppModalProduct}
        items={whatsAppModalItems}
        config={config}
        onOrderCreated={(order) => {
          // Clear cart if ordered from cart
          if (whatsAppModalItems && whatsAppModalItems === cartItems) {
            setCartItems([]);
          }
        }}
      />

      {/* Real-time Order Tracking Modal with Live Courier & Status Stepper */}
      <OrderTrackingModal
        isOpen={isOrderTrackingOpen}
        onClose={() => setIsOrderTrackingOpen(false)}
        config={config}
        initialQuery={orderTrackingQuery}
        onViewInvoice={(order) => {
          setIsOrderTrackingOpen(false);
          setActiveInvoiceOrder(order);
        }}
        onOpenReview={(order) => {
          setIsOrderTrackingOpen(false);
          setOrderHistoryQuery(order.orderNumber || order.orderId);
          setIsOrderHistoryOpen(true);
        }}
      />

      <OrderLookupModal
        isOpen={isOrderLookupOpen}
        onClose={() => setIsOrderLookupOpen(false)}
        config={config}
        onViewInvoice={(order) => {
          setIsOrderLookupOpen(false);
          setActiveInvoiceOrder(order);
        }}
      />

      <OrderHistory
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        config={config}
        initialQuery={orderHistoryQuery}
        onViewInvoice={(order) => {
          setActiveInvoiceOrder(order);
        }}
        onOpenTracking={(trackingId) => {
          setOrderTrackingQuery(trackingId);
          setIsOrderTrackingOpen(true);
        }}
      />

      {activeInvoiceOrder && (
        <InvoiceModal
          order={activeInvoiceOrder}
          config={config}
          isOpen={true}
          onClose={() => setActiveInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
