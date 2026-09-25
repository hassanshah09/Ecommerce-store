const products = [
  { name: 'AeroFlex Knit Everyday Sneakers', categoryName: 'Shoes', price: 5499, discountPrice: 4499, stock: 16, lowStockThreshold: 5, sku: 'NV-SH-009', brand: 'NovaStride', thumbnail: 'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=800&q=80', description: 'Lightweight knit sneakers with a cushioned sole for everyday city walking and travel.', shortDescription: 'Breathable everyday sneakers with a soft cushioned sole.', tags: ['shoes', 'sneakers', 'casual'], featured: false, newArrival: true, variants: [{ name: 'Size', options: ['40 EUR', '41 EUR', '42 EUR', '43 EUR'] }, { name: 'Color', options: ['Cloud White', 'Graphite'] }] },
  { name: 'StudioCore Bluetooth Desk Speaker', categoryName: 'Electronics', price: 6499, discountPrice: 5599, stock: 12, lowStockThreshold: 4, sku: 'NV-EL-010', brand: 'AcousticLab', thumbnail: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=80', description: 'Compact wireless speaker with balanced stereo sound, USB-C charging, and a warm studio finish.', shortDescription: 'Compact Bluetooth speaker for desks, bedrooms, and travel.', tags: ['speaker', 'bluetooth', 'audio'], featured: true, newArrival: true, variants: [{ name: 'Color', options: ['Sandstone', 'Midnight Black'] }] },
  { name: 'Meridian Steel Chronograph', categoryName: 'Watches', price: 8999, discountPrice: 7499, stock: 7, lowStockThreshold: 3, sku: 'NV-WT-011', brand: 'Chronos Heritage', thumbnail: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80', description: 'Polished stainless steel chronograph with a clean black dial and Japanese quartz movement.', shortDescription: 'Refined stainless steel chronograph with a black dial.', tags: ['watch', 'chronograph', 'steel'], featured: true, newArrival: false, variants: [{ name: 'Strap', options: ['Steel Bracelet', 'Black Leather'] }] },
  { name: 'Canvas Weekender Travel Bag', categoryName: 'Accessories', price: 4299, discountPrice: 3599, stock: 14, lowStockThreshold: 5, sku: 'NV-AC-012', brand: 'Craftsman Guild', thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80', description: 'Structured canvas weekender with leather carry handles, shoe compartment, and a padded shoulder strap.', shortDescription: 'Durable canvas travel bag with a separate shoe compartment.', tags: ['travel', 'bag', 'weekender'], featured: false, newArrival: true, variants: [{ name: 'Color', options: ['Olive Canvas', 'Charcoal Canvas'] }] },
  { name: 'Minimal Card Holder Wallet', categoryName: 'Accessories', price: 1799, discountPrice: 1399, stock: 28, lowStockThreshold: 5, sku: 'NV-AC-013', brand: 'Craftsman Guild', thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80', description: 'Slim full-grain leather card holder with six card slots and a central cash sleeve.', shortDescription: 'Slim full-grain leather card holder with six practical slots.', tags: ['wallet', 'leather', 'minimal'], featured: false, newArrival: true, variants: [{ name: 'Color', options: ['Cognac', 'Black'] }] },
  { name: 'Heavyweight Essential Overshirt', categoryName: 'Apparel', price: 3899, discountPrice: 3199, stock: 19, lowStockThreshold: 5, sku: 'NV-AP-014', brand: 'NovaWear', thumbnail: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80', description: 'Structured heavyweight cotton overshirt with a relaxed fit, utility pockets, and durable metal buttons.', shortDescription: 'Relaxed heavyweight cotton overshirt for layered everyday styling.', tags: ['apparel', 'overshirt', 'cotton'], featured: true, newArrival: true, variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['Stone', 'Deep Navy'] }] },
  { name: 'Performance Polo Shirt', categoryName: 'Apparel', price: 2499, discountPrice: 1999, stock: 22, lowStockThreshold: 5, sku: 'NV-AP-015', brand: 'NovaWear', thumbnail: 'https://images.unsplash.com/photo-1625910513413-5fc45e9e4a27?auto=format&fit=crop&w=800&q=80', description: 'Moisture-wicking performance polo with stretch fabric, a structured collar, and quick-dry comfort.', shortDescription: 'Breathable quick-dry polo for workdays and weekends.', tags: ['apparel', 'polo', 'activewear'], featured: false, newArrival: true, variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }, { name: 'Color', options: ['White', 'Black', 'Sky Blue'] }] },
];

(async () => {
  const existing = await fetch('http://localhost:3000/api/products?status=all').then((response) => response.json());
  const existingSkus = new Set(existing.map((product) => product.sku));
  const results = [];
  for (const product of products) {
    if (existingSkus.has(product.sku)) {
      results.push({ sku: product.sku, status: 'exists' });
      continue;
    }
    const response = await fetch('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`${product.sku}: ${body.error || response.statusText}`);
    results.push({ sku: product.sku, id: body.id, category: body.categoryName, status: 'created' });
  }
  console.table(results);
})();
