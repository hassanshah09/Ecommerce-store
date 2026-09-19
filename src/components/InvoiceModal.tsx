import React, { useRef } from 'react';
import { X, Printer, Copy, Check, Share2, Store, Calendar, Hash, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Order, StoreConfig } from '../types';
import { formatPKR, normalizeWhatsApp } from '../services/api';

interface InvoiceModalProps {
  order: Order | null;
  config: StoreConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, config, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const orderNumber = order.orderNumber || order.orderId;
  const formattedDate = new Date(order.confirmedAt || order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const generateInvoicePlainText = () => {
    return `====================================
${config.store.name.toUpperCase()} - INVOICE
${config.store.tagline || 'Official Order Invoice'}
====================================
Invoice #: ${orderNumber}
Date: ${formattedDate}
Status: ${order.status.toUpperCase()}

CUSTOMER DETAILS:
Name: ${order.customer.name}
Phone: ${order.customer.phone}
${order.customer.address ? `Address: ${order.customer.address}, ${order.customer.city || ''}` : ''}

ITEMS:
${order.items
  .map(
    (item, i) =>
      `${i + 1}. ${item.name} (${item.productId})
   Qty: ${item.quantity} x ${formatPKR(item.price, config.store.currency)} = ${formatPKR(item.price * item.quantity, config.store.currency)}`
  )
  .join('\n')}

------------------------------------
Subtotal: ${formatPKR(order.subtotal, config.store.currency)}
Shipping: ${order.shipping === 0 ? 'FREE' : formatPKR(order.shipping, config.store.currency)}
GRAND TOTAL: ${formatPKR(order.total, config.store.currency)}
------------------------------------
Contact WhatsApp: ${config.contact.whatsappNumber}
Thank you for shopping with us!
====================================`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateInvoicePlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const handleShareToCustomer = () => {
    const custPhone = normalizeWhatsApp(order.customer.phone);
    const invoiceSummary = `*Official Invoice from ${config.store.name}*\n\nInvoice Number: *${orderNumber}*\nDate: ${formattedDate}\nTotal Amount: *${formatPKR(order.total, config.store.currency)}*\nStatus: *${order.status.toUpperCase()}*\n\nThank you for shopping with us! Your order is being processed for delivery.`;
    const waUrl = `https://wa.me/${custPhone}?text=${encodeURIComponent(invoiceSummary)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6"
        >
          {/* Top Bar Action buttons */}
          <div className="px-6 py-3.5 bg-stone-100 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between no-print">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <Hash className="w-4 h-4 text-emerald-600" />
              <span>Invoice {orderNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                order.status === 'confirmed'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {order.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white dark:bg-stone-700 hover:bg-stone-50 border border-stone-200 dark:border-stone-600 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-200 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Print Invoice"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-white dark:bg-stone-700 hover:bg-stone-50 border border-stone-200 dark:border-stone-600 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-200 flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Copy Invoice Text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {order.customer.phone && (
                <button
                  onClick={handleShareToCustomer}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Send Invoice to Customer on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 transition-colors ml-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Sheet */}
          <div ref={printRef} className="p-8 space-y-6 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900">
            {/* Header: Store details & Invoice Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-stone-200 dark:border-stone-800 pb-6 gap-4">
              <div className="space-y-1">
                {config.branding.logo ? (
                  <img src={config.branding.logo} alt={config.store.name} className="h-10 object-contain mb-2" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                      {config.store.name.charAt(0)}
                    </div>
                    <span className="text-xl font-extrabold tracking-tight">{config.store.name}</span>
                  </div>
                )}
                <p className="text-xs text-stone-500 dark:text-stone-400">{config.store.tagline}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  WhatsApp: <span className="font-mono text-emerald-600 dark:text-emerald-400">{config.contact.whatsappNumber}</span>
                  {config.contact.email && ` • ${config.contact.email}`}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Tax Invoice</span>
                <div className="text-2xl font-black tracking-tight font-mono text-stone-900 dark:text-white">
                  {orderNumber}
                </div>
                <div className="flex sm:justify-end items-center gap-1.5 text-xs text-stone-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Billed To / Shipping Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Customer Information</div>
                <div className="font-bold text-sm text-stone-900 dark:text-white">{order.customer.name}</div>
                <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span className="font-mono">{order.customer.phone}</span>
                </div>
                {order.customer.address && (
                  <div className="flex items-start gap-1 text-stone-600 dark:text-stone-300">
                    <MapPin className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{order.customer.address}, {order.customer.city}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <div className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">Order Authentication</div>
                <div>Status: <span className="font-bold uppercase text-emerald-600">{order.status}</span></div>
                <div className="font-mono text-[11px] text-stone-500">Token: {order.token}</div>
                {order.notes && (
                  <div className="text-[11px] text-stone-500 italic mt-1">Note: {order.notes}</div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Product ID</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {order.items.map((item, index) => (
                    <tr key={index} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-900 dark:text-white">{item.name}</div>
                        {item.selectedVariant && (
                          <div className="text-[11px] text-stone-500">{item.selectedVariant}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-500">{item.productId}</td>
                      <td className="py-3 px-3 text-center font-semibold">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-stone-600 dark:text-stone-300">
                        {formatPKR(item.price, config.store.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 dark:text-white">
                        {formatPKR(item.price * item.quantity, config.store.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-stone-900 dark:text-white">
                    {formatPKR(order.subtotal, config.store.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Delivery Charges:</span>
                  <span className="font-semibold text-stone-900 dark:text-white">
                    {order.shipping === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      formatPKR(order.shipping, config.store.currency)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between text-sm font-extrabold text-stone-900 dark:text-white">
                  <span>Total Amount:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                    {formatPKR(order.total, config.store.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-6 border-t border-stone-200 dark:border-stone-800 text-center space-y-1 text-xs text-stone-500 dark:text-stone-400">
              <p className="font-medium text-stone-700 dark:text-stone-300">Thank you for shopping with us!</p>
              <p className="text-[11px]">
                For any questions or changes regarding this order, message our WhatsApp support at{' '}
                <span className="font-mono text-emerald-600 font-semibold">{config.contact.whatsappNumber}</span>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
