import React, { useState, useEffect } from 'react';
import { Star, MessageSquareQuote, Calendar, User, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatBookingDateTime } from '../../../utils/formatters';

export const AgencyReviewReplyModal = ({ isOpen, onClose, review, onSuccess }) => {
  const { t } = useI18nStore();
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (review) {
      setReplyContent(review.agencyReply || '');
      setErrorMsg('');
    }
  }, [review, isOpen]);

  if (!review) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      setErrorMsg(t('reviews_reply_not_blank') || 'Nội dung phản hồi không được để trống.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await agencyService.replyToReview(review.reviewId, replyContent.trim());
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reviews_reply_modal_title')}
      subtitle={t('reviews_reply_modal_subtitle')}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Review Context Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {review.customerName}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                #{review.bookingCode}
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-amber-500 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{review.rating}.0</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
            "{review.comment || t('no_comment')}"
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {t('reviews_staff_label')}:{' '}
              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                {review.staffName || 'Studio Staff'}
              </strong>
            </span>
            <span>{review.createdAt ? formatBookingDateTime(review.createdAt) : ''}</span>
          </div>
        </div>

        {/* Reply Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t('reviews_reply_label')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t('reviews_reply_placeholder')}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all resize-none shadow-2xs"
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
            <span>{t('max_characters', { count: 1000 }) || 'Tối đa 1000 ký tự'}</span>
            <span>{replyContent.length} / 1000</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('cancel') || 'Hủy'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !replyContent.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isSubmitting
              ? t('reviews_reply_btn_updating')
              : t('reviews_reply_btn_submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
