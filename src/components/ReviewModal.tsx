import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, CheckCircle2, MessageSquare, AlertCircle, Sparkles, Send, Mail } from 'lucide-react';
import type { Order, Review } from '../types';
import { submitOrderReview } from '../services/api';

interface ReviewModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: (review: Review) => void;
  existingReview?: Review | null;
}

const REVIEW_TAGS = [
  'Fast Delivery',
  '100% Authentic',
  'Great Packaging',
  'High Quality',
  'Value for Money',
  'Smooth WhatsApp Order',
  'Responsive Support',
  'Matches Pictures',
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  order,
  isOpen,
  onClose,
  onReviewSubmitted,
  existingReview,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingReview?.tags || ['Fast Delivery', '100% Authentic']
  );
  const [email, setEmail] = useState<string>(order.customer.email || existingReview?.customerEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a brief comment about your experience with this order.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const review = await submitOrderReview({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerEmail: email.trim() || undefined,
        rating,
        comment: comment.trim(),
        productId: firstItem?.productId,
        productName: firstItem?.name,
        tags: selectedTags,
      });

      setSuccess(true);
      setTimeout(() => {
        onReviewSubmitted(review);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="review-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="review-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {existingReview ? 'Update Your Review' : 'Rate & Review Your Order'}
                </h3>
                <p className="text-xs text-stone-400">
                  Order {order.orderNumber || order.orderId} • Verified Purchase
                </p>
              </div>
            </div>
            <button
              id="close-review-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-bold text-stone-900">Thank You For Your Feedback!</h4>
              <p className="text-sm text-stone-600 max-w-xs mx-auto">
                Your review has been saved to the verified database. A confirmation has also been dispatched to your email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Order Summary Ribbon */}
              <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  {firstItem?.image ? (
                    <img
                      src={firstItem.image}
                      alt={firstItem.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover border border-stone-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-stone-200 flex items-center justify-center text-stone-500 font-bold">
                      {order.items.length}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-stone-900 line-clamp-1">
                      {firstItem ? firstItem.name : `Order #${order.orderNumber || order.orderId}`}
                    </p>
                    <p className="text-stone-500">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''} • Delivered to {order.customer.city || 'Pakistan'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Delivered
                </span>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Overall Experience Rating
                </label>
                <div className="flex items-center justify-center space-x-2 py-1">
                  {[1, 2, 3, 4, 5].map(star => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        id={`star-rating-btn-${star}`}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300 fill-stone-100'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-medium text-stone-600 h-4">
                  {rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Outstanding & Highly Satisfied'}
                  {rating === 4 && '⭐️⭐️⭐️⭐️ Very Good Experience'}
                  {rating === 3 && '⭐️⭐️⭐️ Satisfactory'}
                  {rating === 2 && '⭐️⭐️ Needs Improvement'}
                  {rating === 1 && '⭐️ Poor Quality or Service'}
                </div>
              </div>

              {/* Tag Highlights */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">
                  What did you like the most? (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REVIEW_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-amber-50 text-amber-900 border-amber-300 font-medium'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written Review */}
              <div className="space-y-1.5">
                <label htmlFor="review-comment" className="block text-xs font-semibold text-stone-700">
                  Your Review & Comments <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share details about the product quality, packing, speed of delivery, or customer service..."
                  className="w-full text-sm rounded-xl border border-stone-300 p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>

              {/* Email Input for confirmation receipt */}
              <div className="space-y-1.5">
                <label htmlFor="review-email" className="block text-xs font-semibold text-stone-700 flex items-center justify-between">
                  <span>Your Email (For Review Receipt & Updates)</span>
                  <span className="text-[11px] text-stone-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="review-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. yourname@example.com"
                    className="w-full text-sm pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-stone-900 placeholder:text-stone-400"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  We'll send an automated thank you verification email and save this review to the store database.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  id="cancel-review-btn"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-review-btn"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 shadow-md shadow-amber-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Saving Review...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {existingReview ? 'Update Review' : 'Submit Verified Review'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
