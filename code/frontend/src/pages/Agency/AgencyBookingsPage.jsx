import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  AlertTriangle,
  Eye,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Users,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { DataTable } from '../../components/base/DataTable';
import { Badge } from '../../components/base/Badge';
import { useI18nStore } from '../../store/useI18nStore';
import { AgencyBookingDetailModal } from '../../components/features/agency/AgencyBookingDetailModal';
import { AgencyCancelBookingModal } from '../../components/features/agency/AgencyCancelBookingModal';
import { StaffAssignmentMatrixModal } from '../../components/features/agency/StaffAssignmentMatrixModal';
import { EmergencyReassignModal } from '../../components/features/agency/EmergencyReassignModal';
import { EmergencyApprovalModal } from '../../components/features/agency/EmergencyApprovalModal';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';
import { formatDateTime, formatBookingDateTime } from '../../utils/formatters';

export const AgencyBookingsPage = () => {
  const { t } = useI18nStore();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Dispatch & Emergency Modals
  const [matrixModalOpen, setMatrixModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [bookingForDispatch, setBookingForDispatch] = useState(null);
  const [bookingForApproval, setBookingForApproval] = useState(null);

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const [overviewStats, setOverviewStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    totalGrossRevenue: 0,
    totalStudioNet: 0,
    emergencyCount: 0,
  });

  const fetchOverviewStats = async () => {
    try {
      const res = await agencyService.getBookingStats();
      const data = res?.data || res;
      if (data) {
        setOverviewStats({
          totalBookings: Number(data.totalBookings) || 0,
          completedBookings: Number(data.completedBookings) || 0,
          totalGrossRevenue: Number(data.totalGrossRevenue) || 0,
          totalStudioNet: Number(data.totalStudioNet) || 0,
          emergencyCount: Number(data.emergencyCount) || 0,
        });
      }
    } catch {
      // ignore
    }
  };

  const fetchBookings = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await agencyService.getBookings({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        keyword: searchQuery.trim() || undefined,
        page,
        size,
      });
      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setBookings(data);
        setPageInfo({ page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setBookings(data.content || []);
        setPageInfo({
          page: data.page ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchBookings(pageInfo.page);
    fetchOverviewStats();
  };

  useEffect(() => {
    fetchBookings(0);
    fetchOverviewStats();
  }, [selectedStatus]);

  // Tự động tải lại bảng khi có đơn đặt lịch mới hoặc báo bận khẩn cấp đẩy về qua WebSocket
  useEffect(() => {
    const handleReload = () => {
      fetchBookings(0);
      fetchOverviewStats();
    };
    window.addEventListener('agency:new-booking', handleReload);
    window.addEventListener('agency:dispatch-alert', handleReload);
    window.addEventListener('agency:emergency-dispatch', handleReload);
    return () => {
      window.removeEventListener('agency:new-booking', handleReload);
      window.removeEventListener('agency:dispatch-alert', handleReload);
      window.removeEventListener('agency:emergency-dispatch', handleReload);
    };
  }, [selectedStatus, searchQuery, pageInfo.size]);

  const isBookingTerminated = (b) => {
    const st = b.bookingStatus || b.status;
    return st === 'CANCELLED' || st === 'CANCELLED_EXPIRED' || st === 'COMPLETED' || st === 'REFUNDED';
  };

  const hasEmergency = overviewStats.emergencyCount > 0 || selectedStatus === 'EMERGENCY_REASSIGNMENT';

  const statusTabs = [
    { key: 'ALL', label: t('tab_all') },
    ...(hasEmergency ? [
      {
        key: 'EMERGENCY_REASSIGNMENT',
        label: `🚨 ${t('tab_emergency_reassign')} (${overviewStats.emergencyCount})`,
        isEmergency: true,
      }
    ] : []),
    { key: 'PENDING_AGENCY_DISPATCH', label: t('status_pending_agency_dispatch') },
    { key: 'PENDING_DEPOSIT', label: t('status_pending_deposit') },
    { key: 'CONFIRMED', label: t('status_confirmed') },
    { key: 'IN_PROGRESS', label: t('status_in_progress') },
    { key: 'COMPLETED', label: t('status_completed') },
    { key: 'CANCELLED', label: t('status_cancelled') },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = b.bookingStatus || b.status;
      if (selectedStatus === 'EMERGENCY_REASSIGNMENT') {
        if (!b.needsEmergencyReassignment || isBookingTerminated(b)) return false;
      } else {
        const matchesStatus =
          selectedStatus === 'ALL' ||
          st === selectedStatus ||
          (selectedStatus === 'PENDING_AGENCY_DISPATCH' && st === 'PENDING_AGENCY_DISPATCH') ||
          (selectedStatus === 'CANCELLED' && (st === 'CANCELLED' || st === 'CANCELLED_EXPIRED')) ||
          (selectedStatus === 'CONFIRMED' && (st === 'CONFIRMED' || st === 'ACCEPTED' || st === 'AGENCY_ASSIGNED' || st === 'ARRIVED'));

        if (!matchesStatus) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.bookingCode?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.customerPhone?.toLowerCase().includes(q) ||
        b.staffName?.toLowerCase().includes(q) ||
        b.servicePackageName?.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [bookings, selectedStatus, searchQuery]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };



  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING_DEPOSIT: { variant: 'pending', label: t('status_pending_deposit') },
      REQUESTED: { variant: 'warning', label: t('status_requested') },
      PENDING_AGENCY_DISPATCH: { variant: 'orange', label: t('status_pending_agency_dispatch') },
      AGENCY_ASSIGNED: { variant: 'indigo', label: t('status_agency_assigned') },
      ACCEPTED: { variant: 'blue', label: t('status_accepted') },
      CONFIRMED: { variant: 'teal', label: t('status_confirmed') },
      ON_THE_WAY: { variant: 'purple', label: t('status_on_the_way') },
      ARRIVED: { variant: 'info', label: t('status_arrived') },
      IN_PROGRESS: { variant: 'pink', label: t('status_in_progress') },
      COMPLETED: { variant: 'success', label: t('status_completed') },
      PAID_OUT: { variant: 'active', label: t('status_paid_out') },
      CANCELLED: { variant: 'danger', label: t('status_cancelled') },
      CANCELLED_EXPIRED: { variant: 'inactive', label: t('status_cancelled_expired') },
      DISPUTED: { variant: 'rejected', label: t('status_disputed') },
      PENDING: { variant: 'pending', label: t('status_pending') },
    };
    const s = statusMap[status] || { variant: 'default', label: status || '—' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleOpenDetail = (booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      header: t('col_booking_code'),
      accessor: 'bookingCode',
      render: (row) => {
        const isEmergency = row.needsEmergencyReassignment && !isBookingTerminated(row);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
              {row.bookingCode}
            </span>
            {isEmergency && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                <AlertTriangle className="w-3 h-3" />
                {t('emergency_badge_short')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: t('field_customer_info'),
      accessor: 'customerName',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">
            {row.customerName || '—'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.customerPhone || '—'}</div>
        </div>
      ),
    },
    {
      header: t('col_package'),
      accessor: 'servicePackageName',
      render: (row) => (
        <div className="max-w-[180px] truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
          {row.servicePackageName || row.packageName || '—'}
        </div>
      ),
    },
    {
      header: t('col_scheduled_time'),
      accessor: 'scheduledStartTime',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.scheduledStartTime
            ? formatDateTime(row.scheduledStartTime)
            : formatBookingDateTime(row.startTime, row.bookingDate) || '—'}
        </span>
      ),
    },
    {
      header: t('col_assigned_staff'),
      accessor: 'staffName',
      render: (row) => {
        const assistants = (row.assignedStaff || []).filter(
          (s) => s.role === 'ASSISTANT_MUA' && (!s.status || s.status === 'ACTIVE')
        );
        return row.staffName ? (
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {row.staffName}
            </span>
            {assistants.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60">
                +{assistants.length} {t('dispatch_badge_assistant')}: {assistants.map((a) => a.staffName).join(', ')}
              </span>
            )}
            <span className="text-[11px] text-slate-400 block">{row.staffPhone || ''}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">{t('unassigned_staff')}</span>
        );
      },
    },
    {
      header: t('col_studio_net'),
      accessor: 'estimatedStudioNet',
      align: 'right',
      render: (row) => (
        <div>
          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
            {formatCurrency(row.estimatedStudioNet)}
          </span>
          <span className="text-[10px] text-slate-400">
            {t('total')}: {formatCurrency(row.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      header: t('status'),
      accessor: 'bookingStatus',
      align: 'center',
      render: (row) => getStatusBadge(row.bookingStatus || row.status),
    },
    {
      header: t('actions'),
      align: 'right',
      render: (row) => {
        const st = row.bookingStatus || row.status;
        const canCancel = st === 'PENDING_AGENCY_DISPATCH' || st === 'AGENCY_ASSIGNED';
        const isEmergency = row.needsEmergencyReassignment && !isBookingTerminated(row);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {isEmergency ? (
              <button
                onClick={() => {
                  setBookingForApproval(row);
                  setApprovalModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                title={t('dispatch_btn_review_emergency')}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('dispatch_btn_review_emergency')}</span>
              </button>
            ) : (st === 'PENDING_AGENCY_DISPATCH' || st === 'AGENCY_ASSIGNED') ? (
              <button
                onClick={() => {
                  setBookingForDispatch(row);
                  setMatrixModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                title={st === 'AGENCY_ASSIGNED' ? t('dispatch_btn_change_staff') : t('dispatch_btn_dispatch_now')}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{st === 'AGENCY_ASSIGNED' ? t('dispatch_btn_change_staff') : t('dispatch_btn_dispatch_now')}</span>
              </button>
            ) : null}

            <button
              onClick={() => handleOpenDetail(row)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('btn_view_details')}
            >
              <Eye className="w-4 h-4" />
            </button>
            {canCancel && (
              <button
                onClick={() => {
                  setBookingToCancel(row);
                  setCancelModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={t('btn_cancel_booking')}
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('nav_agency_bookings')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('agency_bookings_sub')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_total_bookings')}
            </span>
            <CalendarDays className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {overviewStats.totalBookings}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_completed_bookings')}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {overviewStats.completedBookings}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_total_gross_revenue')}
            </span>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(overviewStats.totalGrossRevenue)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_estimated_studio_net')}
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(overviewStats.totalStudioNet)}
          </div>
        </div>
      </div>

      {/* Filter, Search and Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1.5 sm:pb-0 shrink-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                selectedStatus === tab.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : tab.isEmergency
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_booking_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
            title={t('btn_reload')}
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
          {apiError}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredBookings}
        isLoading={isLoading}
        emptyMessage={t('no_data')}
        pagination={{
          page: pageInfo.page,
          size: pageInfo.size,
          totalElements: pageInfo.totalElements,
          totalPages: pageInfo.totalPages,
          onPageChange: (newPage1Indexed) => fetchBookings(newPage1Indexed - 1, pageInfo.size),
          onPageSizeChange: (newSize) => {
            savePageSize(newSize);
            setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
            fetchBookings(0, newSize);
          },
        }}
      />

      {/* Booking Detail Modal */}
      <AgencyBookingDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        booking={selectedBooking}
        onBookingUpdated={handleRefresh}
        onReviewEmergency={(b) => {
          setBookingForApproval(b);
          setApprovalModalOpen(true);
        }}
      />

      {/* Booking Cancellation Modal */}
      <AgencyCancelBookingModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setBookingToCancel(null);
        }}
        booking={bookingToCancel}
        onSuccess={handleRefresh}
      />

      {/* 4-Way Staff Assignment Matrix Modal */}
      <StaffAssignmentMatrixModal
        isOpen={matrixModalOpen}
        onClose={() => {
          setMatrixModalOpen(false);
          setBookingForDispatch(null);
        }}
        booking={bookingForDispatch}
        onSuccess={handleRefresh}
      />

      {/* Emergency Backup Staff Reassign Modal */}
      <EmergencyReassignModal
        isOpen={emergencyModalOpen}
        onClose={() => {
          setEmergencyModalOpen(false);
          setBookingForDispatch(null);
        }}
        booking={bookingForDispatch}
        onSuccess={() => {
          handleRefresh();
          fetchOverviewStats();
        }}
      />

      {/* Emergency Review & Approval Modal */}
      <EmergencyApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setBookingForApproval(null);
        }}
        booking={bookingForApproval}
        onApprovedAndReassign={(b) => {
          setApprovalModalOpen(false);
          setBookingForDispatch(b);
          setEmergencyModalOpen(true);
        }}
        onSuccess={() => {
          handleRefresh();
          fetchOverviewStats();
        }}
      />
    </div>
  );
};
