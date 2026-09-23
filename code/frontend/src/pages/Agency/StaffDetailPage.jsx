import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  Package,
  Percent,
  Image as ImageIcon,
  Eye,
  X,
  Loader2,
  Check,
  Save,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/base/Button';
import { Badge } from '../../components/base/Badge';
import { Input } from '../../components/base/Input';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { agencyService } from '../../services/agency.service';
import { superAdminService } from '../../services/super-admin.service';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const StaffDetailPage = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18nStore();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Editable states
  const [agreedCommissionRate, setAgreedCommissionRate] = useState(30);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);

  // Catalog master data
  const [allStyles, setAllStyles] = useState([]);
  const [allPackages, setAllPackages] = useState([]);

  // Pending application review states
  const [reviewNote, setReviewNote] = useState('');
  const [confirmingReviewAction, setConfirmingReviewAction] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [isRemovingStaff, setIsRemovingStaff] = useState(false);

  // Lightbox for zoomed certificate / portfolio image
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = useCallback(async () => {
    if (!staffId) return;
    setIsLoading(true);
    setPageError(null);
    try {
      const [staffRes, stylesRes, pkgsRes, staffPkgsRes, staffStylesRes] = await Promise.allSettled([
        agencyService.getStaffDetail(staffId),
        superAdminService.getMakeupStyles(),
        agencyService.getMyPackages({ page: 0, size: 100 }),
        agencyService.getStaffPackages(staffId),
        agencyService.getStaffStyles(staffId),
      ]);

      let staffData = null;
      if (staffRes.status === 'fulfilled') {
        staffData = staffRes.value?.data || staffRes.value;
        setDetail(staffData);
        if (staffData?.agreedCommissionRate !== undefined && staffData?.agreedCommissionRate !== null) {
          setAgreedCommissionRate(Number(staffData.agreedCommissionRate));
        } else if (staffData?.commissionRateCustom !== undefined && staffData?.commissionRateCustom !== null) {
          setAgreedCommissionRate(Number(staffData.commissionRateCustom));
        }
      } else {
        throw new Error(staffRes.reason?.response?.data?.message || staffRes.reason?.message || t('error_general'));
      }

      // Makeup styles master
      if (stylesRes.status === 'fulfilled') {
        const styleList = stylesRes.value?.data || stylesRes.value || [];
        setAllStyles(Array.isArray(styleList) ? styleList : []);
      }

      // Studio packages master
      if (pkgsRes.status === 'fulfilled') {
        const pkgData = pkgsRes.value?.data || pkgsRes.value;
        const pkgList = pkgData?.content || (Array.isArray(pkgData) ? pkgData : []);
        setAllPackages(pkgList);
      }

      // Assigned styles
      let assignedStyleIds = [];
      if (Array.isArray(staffData?.assignedStyles) && staffData.assignedStyles.length > 0) {
        assignedStyleIds = staffData.assignedStyles.map((s) => Number(s.id || s.styleId)).filter(Boolean);
      } else if (staffStylesRes.status === 'fulfilled') {
        const list = staffStylesRes.value?.data || staffStylesRes.value || [];
        if (Array.isArray(list)) {
          assignedStyleIds = list.map((s) => Number(s.id || s.styleId)).filter(Boolean);
        }
      }
      setSelectedStyleIds(assignedStyleIds);

      // Assigned packages
      let assignedPkgIds = [];
      if (staffPkgsRes.status === 'fulfilled') {
        const pData = staffPkgsRes.value?.data || staffPkgsRes.value;
        let list = [];
        if (Array.isArray(pData?.assignedPackages)) {
          list = pData.assignedPackages;
        } else if (Array.isArray(pData?.packageIds)) {
          assignedPkgIds = pData.packageIds.map(Number).filter(Boolean);
        } else if (Array.isArray(pData)) {
          list = pData;
        }
        if (list.length > 0) {
          assignedPkgIds = list.map((item) => Number(item.packageId || item.id)).filter(Boolean);
        }
      } else if (Array.isArray(staffData?.packageIds)) {
        assignedPkgIds = staffData.packageIds.map(Number).filter(Boolean);
      }
      setSelectedPackageIds(assignedPkgIds);
    } catch (err) {
      setPageError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  }, [staffId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStyle = (id) => {
    setSelectedStyleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTogglePackage = (id) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveAll = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      const parsedCommission = Math.min(100, Math.max(0, Number(agreedCommissionRate) || 0));

      await Promise.all([
        agencyService.updateStaffCommission(staffId, { agreedCommissionRate: parsedCommission }),
        agencyService.assignStaffStyles(staffId, selectedStyleIds.map(Number)),
        agencyService.assignStaffPackages(staffId, selectedPackageIds.map(Number)),
      ]);

      setToastMessage(t('staff_detail_save_success'));
      loadData();
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReview = async (decision) => {
    setIsSaving(true);
    try {
      const res = await agencyService.reviewStaffApplication(staffId, {
        decision,
        agreedCommissionRate: Number(agreedCommissionRate) || 30,
        note: reviewNote?.trim() || (decision === 'APPROVE' ? 'Approved by Studio' : 'Declined by Studio'),
      });
      setConfirmingReviewAction(null);
      const defaultMsg = decision === 'APPROVE'
        ? t('agency_staff_review_approved')
        : t('agency_staff_review_rejected');
      const msg = res?.message && !res.message.startsWith('agency.')
        ? res.message
        : (t(res?.message) !== res?.message ? t(res?.message) : defaultMsg);
      setToastMessage(msg);
      loadData();
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
      setConfirmingReviewAction(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemoveStaff = async () => {
    try {
      setIsSaving(true);
      const res = await agencyService.removeStaff(staffId);
      setToastMessage(res?.message || t('delete_success'));
      setIsRemovingStaff(false);
      navigate('/agency/staff');
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="text-sm text-slate-500 font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (pageError || !detail) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {pageError || t('no_data')}
        </h2>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/agency/staff')}>
            {t('btn_back_to_staff_list')}
          </Button>
          <Button variant="primary" onClick={loadData}>
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  const certificates = detail.certificates || [];
  const portfolioImages = detail.portfolioImages || [];
  const isPending = detail.status === 'PENDING';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agency/staff')}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs transition-all cursor-pointer"
            title={t('btn_back_to_staff_list')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              {t('staff_management_title')}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isPending ? t('staff_application_review_title') : t('staff_detail_title')}
            </h1>
          </div>
        </div>

        {!isPending && (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSaveAll}
              isLoading={isSaving}
              disabled={isSaving}
              className="shadow-sm"
            >
              {isSaving ? t('btn_saving') : t('btn_save_all_changes')}
            </Button>
          </div>
        )}
      </div>

      {/* Main Artist Profile Summary Card */}
      <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-rose-50/40 dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black text-3xl flex items-center justify-center shadow-md overflow-hidden shrink-0 border-3 border-white dark:border-slate-700">
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
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {detail.fullName}
              </h2>
              <Badge variant={isPending ? 'pending' : 'active'} size="md">
                {isPending ? t('status_pending') : t('status_active')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
              {detail.phoneNumber && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {detail.phoneNumber}
                </span>
              )}
              {detail.email && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {detail.email}
                </span>
              )}
              {detail.muaCode && (
                <span className="bg-slate-200/70 dark:bg-slate-700 px-2.5 py-0.5 rounded-md font-mono font-bold text-slate-700 dark:text-slate-200">
                  {t('staff_code_prefix')}: {detail.muaCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Career Stats */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-center px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[90px]">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">
              {t('staff_metric_experience')}
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-1 mt-0.5">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              {detail.experienceYears ?? 1} {t('unit_years')}
            </span>
          </div>

          <div className="text-center px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[90px]">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">
              {t('staff_metric_rating')}
            </span>
            <span className="text-base font-extrabold text-amber-500 flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {detail.ratingAvg ? Number(detail.ratingAvg).toFixed(1) : '5.0'}
            </span>
          </div>

          <div className="text-center px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs min-w-[90px]">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">
              {t('staff_metric_completed_jobs')}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Check className="w-4 h-4" />
              {detail.totalCompletedJobs ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Application Review Banner (If status is PENDING) */}
      {isPending && (
        <div className="p-6 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <Award className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold">
                {t('staff_review_panel_title')}
              </h3>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                {t('staff_application_review_desc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Input
                label={t('staff_commission_label')}
                type="number"
                min="0"
                max="100"
                value={agreedCommissionRate}
                onChange={(e) => setAgreedCommissionRate(e.target.value)}
                helperText={t('staff_commission_helper')}
              />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={agreedCommissionRate}
                onChange={(e) => setAgreedCommissionRate(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
            </div>
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
              icon={XCircle}
              onClick={() => setConfirmingReviewAction('REJECT')}
              isLoading={isSaving}
              disabled={isSaving}
            >
              {t('action_reject')}
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={() => setConfirmingReviewAction('APPROVE')}
              isLoading={isSaving}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t('action_approve')}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content: Focused Review for Pending vs Full Management for Active */}
      {isPending ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Bio & Certificates */}
          <div className="lg:col-span-6 space-y-6">
            {/* Bio Box */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-500" />
                {t('staff_bio_title')}
              </h4>
              {detail.bio ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;{detail.bio}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {t('staff_bio_empty')}
                </p>
              )}
            </div>

            {/* Certificates Card */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('staff_certs_title')}
                  </h4>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {certificates.length}
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('staff_certs_empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {certificates.map((cert, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50/60 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden group flex flex-col justify-between shadow-2xs"
                    >
                      <div
                        onClick={() => cert.imageUrl && setPreviewImage(cert.imageUrl)}
                        className="relative h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
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

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                          <Eye className="w-4 h-4" />
                          <span>{t('staff_btn_view_cert')}</span>
                        </div>
                      </div>

                      <div className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={cert.certName}>
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

                        {cert.uploadedAt && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
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
          </div>

          {/* RIGHT COLUMN: Portfolio & Styles */}
          <div className="lg:col-span-6 space-y-6">
            {/* Portfolio Showcase Card */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('staff_portfolio_title')}
                  </h4>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {portfolioImages.length}
                </span>
              </div>

              {portfolioImages.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('staff_portfolio_empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {portfolioImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImage(img)}
                      className="relative h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer group shadow-2xs border border-slate-200 dark:border-slate-700"
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
              )}
            </div>

            {/* Applicant's Signature Styles (if registered on MUA profile) */}
            {detail.assignedStyles && detail.assignedStyles.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  {t('staff_styles_title')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detail.assignedStyles.map((st) => (
                    <span
                      key={st.id || st.styleCode}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                    >
                      {st.styleName || st.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FULL STUDIO CONFIGURATIONS FOR ACTIVE STAFF */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: STUDIO CONFIGURATIONS (Commission, Styles, Packages) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Section: Commission Setting */}
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Percent className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('staff_tab_commission')}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {agreedCommissionRate}%
                  </span>
                </div>

                <div className="space-y-3">
                  <Input
                    label={t('staff_commission_label')}
                    type="number"
                    min="0"
                    max="100"
                    value={agreedCommissionRate}
                    onChange={(e) => setAgreedCommissionRate(e.target.value)}
                    helperText={t('staff_commission_helper')}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={agreedCommissionRate}
                    onChange={(e) => setAgreedCommissionRate(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Section: Styles Assignment */}
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('staff_tab_styles')}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {selectedStyleIds.length} {t('selected') || 'đã chọn'}
                  </span>
                </div>

                {allStyles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {t('staff_styles_empty')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {allStyles.map((st) => {
                      const isChecked = selectedStyleIds.includes(Number(st.id));
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleStyle(Number(st.id))}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 dark:bg-slate-850 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                                isChecked
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold">{st.name || st.styleName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section: Packages Assignment */}
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('staff_tab_packages')}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {selectedPackageIds.length} {t('selected') || 'đã chọn'}
                  </span>
                </div>

                {allPackages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {t('staff_packages_empty')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                    {allPackages.map((pkg) => {
                      const isChecked = selectedPackageIds.includes(Number(pkg.id));
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => handleTogglePackage(Number(pkg.id))}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 dark:bg-slate-850 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold block">{pkg.name}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {pkg.durationMinutes ? `${pkg.durationMinutes} phút • ` : ''}
                                {formatCurrency(pkg.basePrice || pkg.price || 0)}
                              </span>
                            </div>
                          </div>
                          <Badge variant={pkg.status === 'ACTIVE' ? 'active' : 'default'} size="sm">
                            {pkg.status === 'ACTIVE' ? t('status_active') : pkg.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: CREDENTIALS, CERTIFICATES & PORTFOLIO */}
            <div className="lg:col-span-5 space-y-6">
              {/* Bio Box */}
              {detail.bio && (
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    {t('staff_bio_title')}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    &ldquo;{detail.bio}&rdquo;
                  </p>
                </div>
              )}

              {/* Certificates Card */}
              <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('staff_certs_title')}
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    {certificates.length}
                  </span>
                </div>

                {certificates.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('staff_certs_empty')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certificates.map((cert, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/60 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden group flex flex-col justify-between shadow-2xs"
                      >
                        <div
                          onClick={() => cert.imageUrl && setPreviewImage(cert.imageUrl)}
                          className="relative h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
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

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                            <Eye className="w-4 h-4" />
                            <span>{t('staff_btn_view_cert')}</span>
                          </div>
                        </div>

                        <div className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={cert.certName}>
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

                          {cert.uploadedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
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

              {/* Portfolio Showcase Card */}
              {portfolioImages.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {t('staff_portfolio_title')}
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {portfolioImages.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {portfolioImages.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(img)}
                        className="relative h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer group shadow-2xs border border-slate-200 dark:border-slate-700"
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
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs mt-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Save className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{t('staff_bottom_save_hint')}</span>
            </div>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSaveAll}
              isLoading={isSaving}
              disabled={isSaving}
              className="shadow-sm shrink-0"
            >
              {isSaving ? t('btn_saving') : t('btn_save_all_changes')}
            </Button>
          </div>
        </>
      )}

      {/* Danger Zone: Xóa thợ khỏi Studio */}
      {!isPending && (
        <div className="p-6 bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
          <div>
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300">
              {t('danger_zone_title')}
            </h4>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1 max-w-xl">
              {t('danger_zone_remove_staff_desc')}
            </p>
          </div>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => setIsRemovingStaff(true)}
            disabled={isSaving}
            className="shrink-0"
          >
            {t('btn_remove_staff')}
          </Button>
        </div>
      )}

      {/* Lightbox Modal */}
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

      {/* Confirm Review Modal */}
      <ConfirmDialog
        isOpen={Boolean(confirmingReviewAction)}
        onClose={() => setConfirmingReviewAction(null)}
        onConfirm={() => handleExecuteReview(confirmingReviewAction)}
        title={
          confirmingReviewAction === 'APPROVE'
            ? t('confirm_approve_staff_title')
            : t('confirm_reject_staff_title')
        }
        message={
          confirmingReviewAction === 'APPROVE'
            ? t('confirm_approve_staff_msg').replace('{name}', detail?.fullName || '')
            : t('confirm_reject_staff_msg').replace('{name}', detail?.fullName || '')
        }
        confirmText={
          confirmingReviewAction === 'APPROVE'
            ? t('action_approve')
            : t('action_reject')
        }
        variant={confirmingReviewAction === 'APPROVE' ? 'primary' : 'danger'}
        isDangerous={confirmingReviewAction === 'REJECT'}
        isLoading={isSaving}
      />

      {/* Confirm Remove Staff Modal */}
      <ConfirmDialog
        isOpen={isRemovingStaff}
        onClose={() => setIsRemovingStaff(false)}
        onConfirm={handleConfirmRemoveStaff}
        title={t('confirm_remove_staff_title')}
        message={`${t('confirm_remove_staff_msg')} (${detail?.fullName})`}
        confirmText={t('btn_remove_staff')}
        isDangerous
        isLoading={isSaving}
      />

      {/* Global Toast */}
      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
