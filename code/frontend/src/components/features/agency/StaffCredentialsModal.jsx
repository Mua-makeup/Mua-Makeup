import React, { useState, useEffect } from 'react';
import {
  Award,
  Briefcase,
  Star,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  Mail,
  Phone,
  Sparkles,
  Image as ImageIcon,
  Eye,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { Input } from '../../base/Input';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { agencyService } from '../../../services/agency.service';
import { formatDate } from '../../../utils/formatters';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffCredentialsModal = ({
  isOpen,
  onClose,
  staffId,
  isPending = false,
  onReviewSuccess,
}) => {
  const { t } = useI18nStore();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Review states (if pending application)
  const [agreedCommissionRate, setAgreedCommissionRate] = useState(30);
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // 'APPROVE' | 'REJECT' | null

  // Lightbox for zoomed certificate / portfolio image
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (isOpen && staffId) {
      loadDetail(staffId);
    } else {
      setDetail(null);
      setError(null);
      setPreviewImage(null);
      setReviewError(null);
      setConfirmingAction(null);
    }
  }, [isOpen, staffId]);

  const loadDetail = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await agencyService.getStaffDetail(id);
      const data = res?.data || res;
      setDetail(data);
      if (data?.agreedCommissionRate !== undefined && data?.agreedCommissionRate !== null) {
        setAgreedCommissionRate(Number(data.agreedCommissionRate));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  const executeReview = async (decision) => {
    setIsReviewing(true);
    setReviewError(null);
    try {
      const res = await agencyService.reviewStaffApplication(staffId, {
        decision,
        agreedCommissionRate: Number(agreedCommissionRate) || 30,
        note: reviewNote?.trim() || (decision === 'APPROVE' ? 'Approved by Studio' : 'Declined by Studio'),
      });
      setConfirmingAction(null);
      const defaultMsg = decision === 'APPROVE'
        ? t('agency_staff_review_approved')
        : t('agency_staff_review_rejected');
      const msg = res?.message && !res.message.startsWith('agency.')
        ? res.message
        : (t(res?.message) !== res?.message ? t(res?.message) : defaultMsg);
      onReviewSuccess?.(decision, msg);
      onClose();
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || t('error_general'));
      setConfirmingAction(null);
    } finally {
      setIsReviewing(false);
    }
  };

  const certificates = detail?.certificates || [];
  const portfolioImages = detail?.portfolioImages || [];
  const assignedStyles = detail?.assignedStyles || [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('staff_credentials_title')}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">
              {detail?.muaCode ? `${t('staff_code_prefix')}: ${detail.muaCode}` : ''}
            </span>
            <Button variant="secondary" onClick={onClose} disabled={isReviewing}>
              {t('close')}
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-sm text-slate-500">{t('loading')}</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-rose-600 font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => loadDetail(staffId)}>
              {t('retry')}
            </Button>
          </div>
        ) : detail ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Profile Card */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-rose-50/30 dark:from-slate-800/80 dark:to-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-bold text-2xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-2 border-white dark:border-slate-700">
                  {detail.avatarUrl ? (
                    <img
                      src={detail.avatarUrl}
                      alt={detail.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    detail.fullName?.charAt(0) || 'M'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {detail.fullName}
                    </h3>
                    <Badge
                      variant={detail.status === 'ACTIVE' ? 'active' : 'pending'}
                      size="sm"
                    >
                      {detail.status === 'ACTIVE' ? t('status_active') : t('status_pending')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    {detail.phoneNumber && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {detail.phoneNumber}
                      </span>
                    )}
                    {detail.email && (
                      <span className="flex items-center gap-1 font-mono">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {detail.email}
                      </span>
                    )}
                    {detail.muaCode && (
                      <span className="bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                        {detail.muaCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Career Stats Badges */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <div className="text-center px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[75px]">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                    {t('staff_metric_experience')}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-0.5 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    {detail.experienceYears ?? 1} {t('unit_years')}
                  </span>
                </div>

                <div className="text-center px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[75px]">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                    {t('staff_metric_rating')}
                  </span>
                  <span className="text-sm font-bold text-amber-500 flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {detail.ratingAvg ? Number(detail.ratingAvg).toFixed(1) : '5.0'}
                  </span>
                </div>

                <div className="text-center px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[75px]">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                    {t('staff_metric_completed_jobs')}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                    {detail.totalCompletedJobs ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio section */}
            {detail.bio && (
              <div className="p-4 bg-slate-50/75 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  {t('staff_bio_title')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{detail.bio}&rdquo;
                </p>
              </div>
            )}

            {/* SECTION 1: CERTIFICATES & CREDENTIALS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('staff_certs_title')}
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    {certificates.length}
                  </span>
                </div>
              </div>

              {certificates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('staff_certs_empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {certificates.map((cert, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs hover:shadow-sm transition-all group flex flex-col justify-between"
                    >
                      {/* Image Thumbnail with Overlay Zoom */}
                      <div
                        onClick={() => cert.imageUrl && setPreviewImage(cert.imageUrl)}
                        className="relative h-36 bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
                      >
                        {cert.imageUrl ? (
                          <img
                            src={cert.imageUrl}
                            alt={cert.certName || 'Certificate'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="text-center p-4 text-slate-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <span className="text-[11px]">{t('staff_no_cert_image')}</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                          <Eye className="w-4 h-4" />
                          <span>{t('staff_btn_view_cert')}</span>
                        </div>
                      </div>

                      {/* Certificate Details */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2" title={cert.certName}>
                            {cert.certName || t('staff_default_cert_name')}
                          </h5>
                          <Badge
                            variant={cert.isVerified || cert.status === 'APPROVED' ? 'active' : 'pending'}
                            size="sm"
                          >
                            {cert.isVerified || cert.status === 'APPROVED'
                              ? t('staff_cert_verified')
                              : t('staff_cert_pending')}
                          </Badge>
                        </div>

                        {cert.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                            {cert.notes}
                          </p>
                        )}

                        {cert.uploadedAt && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <Calendar className="w-3 h-3" />
                            <span>{t('staff_uploaded_date')}: {formatDate(cert.uploadedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: PORTFOLIO SHOWCASE IMAGES */}
            {portfolioImages.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('staff_portfolio_title')}
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {portfolioImages.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {portfolioImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImage(img)}
                      className="relative h-24 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer group shadow-2xs border border-slate-200 dark:border-slate-700"
                    >
                      <img
                        src={img}
                        alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: ASSIGNED STYLES */}
            {assignedStyles.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('staff_styles_title')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {assignedStyles.map((st, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      <Sparkles className="w-3 h-3 text-rose-500" />
                      {st.styleName || st}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: QUICK REVIEW APPLICATION PANEL (IF PENDING) */}
            {(isPending || detail.status === 'PENDING') && (
              <div className="p-5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-4 pt-4">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-sm font-bold">
                    {t('staff_review_panel_title')}
                  </h4>
                </div>

                {reviewError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {reviewError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('staff_commission_label')}
                    type="number"
                    min="0"
                    max="100"
                    value={agreedCommissionRate}
                    onChange={(e) => setAgreedCommissionRate(e.target.value)}
                    helperText={t('staff_commission_helper')}
                  />
                  <Input
                    label={t('staff_review_note_label')}
                    type="text"
                    placeholder={t('staff_review_note_ph')}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => setConfirmingAction('REJECT')}
                    isLoading={isReviewing}
                    disabled={isReviewing}
                  >
                    {t('action_reject')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => setConfirmingAction('APPROVE')}
                    isLoading={isReviewing}
                    disabled={isReviewing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {t('action_approve')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Review Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmingAction)}
        onClose={() => setConfirmingAction(null)}
        onConfirm={() => executeReview(confirmingAction)}
        title={
          confirmingAction === 'APPROVE'
            ? t('confirm_approve_staff_title')
            : t('confirm_reject_staff_title')
        }
        message={
          confirmingAction === 'APPROVE'
            ? t('confirm_approve_staff_msg').replace('{name}', detail?.fullName || '')
            : t('confirm_reject_staff_msg').replace('{name}', detail?.fullName || '')
        }
        confirmText={
          confirmingAction === 'APPROVE'
            ? t('action_approve')
            : t('action_reject')
        }
        variant={confirmingAction === 'APPROVE' ? 'primary' : 'danger'}
        isDangerous={confirmingAction === 'REJECT'}
        isLoading={isReviewing}
        zIndex="z-[80]"
      />

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg border border-white/20"
            />
            <div className="mt-2 text-center">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('staff_open_raw_image')}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
