// Device-only Wishlist Management System
// Stores wishlist items strictly in localStorage on this device

const WISHLIST_STORAGE_KEY = 'novamart_device_wishlist';
const WISHLIST_CHANGE_EVENT = 'novamart_wishlist_updated';

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export function getDeviceWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => (typeof item === 'string' ? item : item.productId)).filter(Boolean);
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function isItemInWishlist(productId: string): boolean {
  const current = getDeviceWishlist();
  return current.includes(productId);
}

export function toggleDeviceWishlist(productId: string): boolean {
  const current = getDeviceWishlist();
  const exists = current.includes(productId);
  let updated: string[];

  if (exists) {
    updated = current.filter((id) => id !== productId);
  } else {
    updated = [productId, ...current];
  }

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { productId, added: !exists } }));
  } catch (e) {
    console.error('Failed to update wishlist in localStorage', e);
  }

  return !exists;
}

export function clearDeviceWishlist(): void {
  try {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { cleared: true } }));
  } catch (e) {
    console.error('Failed to clear wishlist', e);
  }
}

export function subscribeWishlist(callback: (wishlistIds: string[]) => void): () => void {
  const handler = () => {
    callback(getDeviceWishlist());
  };

  window.addEventListener(WISHLIST_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(WISHLIST_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
