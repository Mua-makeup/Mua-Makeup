import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  QrCode,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  UserCheck,
  SlidersHorizontal,
  Eye,
  Briefcase,
  Star,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { StaffInvitationModal } from '../../components/features/agency/StaffInvitationModal';
import { AgencyPendingVerificationNotice } from '../../components/features/agency/AgencyPendingVerificationNotice';
import { useI18nStore } from '../../store/useI18nStore';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const StaffManagementPage = () => {
  const { t } = useI18nStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending'
  const [activeStaff, setActiveStaff] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [removingStaff, setRemovingStaff] = useState(null);
  const [reviewingStaffApp, setReviewingStaffApp] = useState(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const loadStaffData = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [activeRes, pendingRes] = await Promise.allSettled([
        agencyService.getStaffList('ACTIVE', page, size),
        agencyService.getStaffList('PENDING', 0, 50),
      ]);

      let unverifiedDetected = false;

      if (activeRes.status === 'fulfilled') {
        const d = activeRes.value?.data || activeRes.value || {};
        if (Array.isArray(d)) {
          setActiveStaff(d);
          setPageInfo({ page: 0, size: d.length, totalElements: d.length, totalPages: 1 });
        } else {
          const total = d.totalElements ?? d.total_elements ?? (d.content?.length || 0);
          const pSize = d.size ?? size ?? 10;
          const totalP = d.totalPages ?? d.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
          setActiveStaff(d.content || []);
          setPageInfo({
            page: d.page ?? page,
            size: pSize,
            totalElements: total,
            totalPages: totalP,
          });
        }
      } else {
        const reason = activeRes.reason;
        const errCode = reason?.response?.data?.errorCode;
        const errMsg = reason?.response?.data?.message || reason?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          unverifiedDetected = true;
        } else {
          setApiError(
            !reason?.response || reason?.code === 'ERR_NETWORK'
              ? t('error_api_connection')
              : errMsg
          );
        }
        setActiveStaff([]);
      }

      if (pendingRes.status === 'fulfilled') {
        const val = pendingRes.value?.data || pendingRes.value || {};
        const pList = val?.content || (Array.isArray(val) ? val : []);
        setPendingApplications(pList);
      } else {
        const reason = pendingRes.reason;
        const errCode = reason?.response?.data?.errorCode;
        const errMsg = reason?.response?.data?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          unverifiedDetected = true;
        }
        setPendingApplications([]);
      }

      setIsNotVerified(unverifiedDetected);
    } catch (err) {
      setApiError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData(0);
  }, []);

  const handleConfirmReviewApplication = async () => {
    if (!reviewingStaffApp) return;
    setIsReviewSubmitting(true);
    try {
      const { app, action } = reviewingStaffApp;
      const res = await agencyService.reviewStaffApplication(app.id, {
        decision: action,
        agreedCommissionRate: 30,
        note: action === 'APPROVE' ? 'Approved by Studio' : 'Application declined',
      });
      const defaultMsg = action === 'APPROVE'
        ? t('agency_staff_review_approved')
        : t('agency_staff_review_rejected');
      const msg = res?.message && !res.message.startsWith('agency.')
        ? res.message
        : (t(res?.message) !== res?.message ? t(res?.message) : defaultMsg);
      setToastMessage(msg);
      setReviewingStaffApp(null);
      loadStaffData();
    } catch (err) {
      setToastMessage(err.message || t('error_general'));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleConfirmRemoveStaff = async () => {
    if (!removingStaff) return;
    try {
      const res = await agencyService.removeStaff(removingStaff.id);
      setActiveStaff((prev) => prev.filter((s) => s.id !== removingStaff.id));
      setToastMessage(res?.message || t('delete_success'));
      setRemovingStaff(null);
    } catch (err) {
      setToastMessage(err.message || t('error_general'));
    }
  };

  // Columns for Active Staff
  const activeColumns = [
    {
      header: t('col_staff_name'),
      accessor: 'fullName',
      render: (row) => (
        <div
          onClick={() => navigate(`/agency/staff/${row.id}`)}
          className="cursor-pointer group whitespace-nowrap"
        >
          <span className="font-bold text-slate-900 dark:text-white block group-hover:text-rose-600 transition-colors whitespace-nowrap">
            {row.fullName}
          </span>
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
            {row.phoneNumber || 'N/A'} • {row.email || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_staff_code'),
      accessor: 'muaCode',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
          {row.muaCode || '—'}
        </span>
      ),
    },
    {
      header: t('col_experience_rating'),
      accessor: 'experienceYears',
      render: (row) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {row.experienceYears || 1} {t('unit_years')}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            {row.ratingAvg ? Number(row.ratingAvg).toFixed(1) : '5.0'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_commission'),
      accessor: 'agreedCommissionRate',
      render: (row) => (
        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 text-xs whitespace-nowrap">
          {row.agreedCommissionRate ?? row.commissionRateCustom ?? 30}%
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: () => (
        <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
          {t('status_active')}
        </span>
      ),
    },
    {
      header: t('actions'),
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button
            onClick={() => navigate(`/agency/staff/${row.id}`)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:hover:text-rose-400 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            title={t('staff_edit_details')}
          >
            <SlidersHorizontal className="w-4 h-4 text-rose-500" />
          </button>
          <button
            onClick={() => setRemovingStaff(row)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50/80 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/70 hover:border-rose-300 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 dark:border-rose-800/60 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            title={t('btn_remove_staff')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Pending Applications
  const pendingColumns = [
    {
      header: t('col_staff_name'),
      accessor: 'fullName',
      render: (row) => (
        <div
          onClick={() => navigate(`/agency/staff/${row.id}`)}
          className="cursor-pointer group whitespace-nowrap"
        >
          <span className="font-bold text-slate-900 dark:text-white block group-hover:text-rose-600 transition-colors whitespace-nowrap">
            {row.fullName}
          </span>
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
            {row.phoneNumber || 'N/A'} • {row.email || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_invite_code'),
      accessor: 'inviteCodeUsed',
      render: (row) => {
        const code = row.inviteCodeUsed || row.inviteCode || (row.note?.match(/(INV-[A-Za-z0-9_-]+)/)?.[1]);
        return (
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded whitespace-nowrap">
            {code || 'N/A'}
          </span>
        );
      },
    },
    {
      header: t('col_notes'),
      accessor: 'note',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-sm block truncate whitespace-nowrap" title={row.note}>
          {row.note || '—'}
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: () => (
        <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse shrink-0"></span>
          {t('status_pending')}
        </span>
      ),
    },
    {
      header: t('actions'),
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button
            onClick={() => navigate(`/agency/staff/${row.id}`)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:hover:text-indigo-400 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            title={t('btn_view_details') || 'Chi Tiết'}
          >
            <Eye className="w-4 h-4 text-indigo-500" />
          </button>
          <button
            onClick={() => setReviewingStaffApp({ app: row, action: 'APPROVE' })}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50/80 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border border-emerald-200/70 hover:border-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-800/60 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            title={t('action_approve')}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setReviewingStaffApp({ app: row, action: 'REJECT' })}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50/80 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/70 hover:border-rose-300 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 dark:border-rose-800/60 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            title={t('action_reject')}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && !isNotVerified && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {apiError.toLowerCase().includes('connect') || apiError.toLowerCase().includes('network')
                ? t('error_api_connection')
                : t('error_system_notice')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadStaffData}>
              {t('retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiError(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('staff_management_title')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('staff_management_sub')}
          </p>
        </div>

        <Button
          variant="primary"
          icon={QrCode}
          disabled={isNotVerified}
          title={isNotVerified ? t('pending_tooltip_staff') : undefined}
          onClick={() => {
            if (isNotVerified) return;
            setIsInviteModalOpen(true);
          }}
        >
          {t('btn_recruit_qr')}
        </Button>
      </div>

      {/* Main Content: Pending Notice vs Tabs + Data Tables */}
      {isNotVerified ? (
        <AgencyPendingVerificationNotice
          featureName={t('staff_management_title')}
          onRefresh={loadStaffData}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'active'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('tab_active_staff')} ({activeStaff.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'pending'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t('tab_pending_applications')} ({pendingApplications.length})</span>
            </button>
          </div>

          {/* Tables based on active tab */}
          {activeTab === 'active' && (
            <DataTable
              columns={activeColumns}
              data={activeStaff}
              isLoading={isLoading}
              emptyMessage={t('empty_staff_msg')}
              pagination={{
                page: pageInfo.page,
                size: pageInfo.size,
                totalElements: pageInfo.totalElements,
                totalPages: pageInfo.totalPages,
                onPageChange: (newPage1Indexed) => loadStaffData(newPage1Indexed - 1, pageInfo.size),
                onPageSizeChange: (newSize) => {
                  savePageSize(newSize);
                  setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
                  loadStaffData(0, newSize);
                },
              }}
            />
          )}

          {activeTab === 'pending' && (
            <DataTable
              columns={pendingColumns}
              data={pendingApplications}
              isLoading={isLoading}
              emptyMessage={t('empty_applications_msg')}
              pagination={{
                page: 0,
                size: 10,
                totalElements: pendingApplications.length,
                totalPages: Math.max(Math.ceil(pendingApplications.length / 10), 1),
                onPageChange: () => {},
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      <StaffInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onStaffAdded={loadStaffData}
      />


      <ConfirmDialog
        isOpen={Boolean(removingStaff)}
        onClose={() => setRemovingStaff(null)}
        onConfirm={handleConfirmRemoveStaff}
        title={t('confirm_remove_staff_title')}
        message={`${t('confirm_remove_staff_msg')} (${removingStaff?.fullName})`}
        confirmText={t('btn_remove_staff')}
        isDangerous
      />

      <ConfirmDialog
        isOpen={Boolean(reviewingStaffApp)}
        onClose={() => setReviewingStaffApp(null)}
        onConfirm={handleConfirmReviewApplication}
        title={
          reviewingStaffApp?.action === 'APPROVE'
            ? t('confirm_approve_staff_title')
            : t('confirm_reject_staff_title')
        }
        message={
          reviewingStaffApp?.action === 'APPROVE'
            ? t('confirm_approve_staff_msg').replace('{name}', reviewingStaffApp?.app?.fullName || '')
            : t('confirm_reject_staff_msg').replace('{name}', reviewingStaffApp?.app?.fullName || '')
        }
        confirmText={
          reviewingStaffApp?.action === 'APPROVE'
            ? t('action_approve')
            : t('action_reject')
        }
        variant={reviewingStaffApp?.action === 'APPROVE' ? 'primary' : 'danger'}
        isDangerous={reviewingStaffApp?.action === 'REJECT'}
        isLoading={isReviewSubmitting}
      />

      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
