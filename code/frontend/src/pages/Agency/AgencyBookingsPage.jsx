import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Search,
  AlertTriangle,
  Eye,
  DollarSign,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { DataTable } from '../../components/base/DataTable';
import { Badge } from '../../components/base/Badge';
import { useI18nStore } from '../../store/useI18nStore';
import { AgencyBookingDetailModal } from '../../components/features/agency/AgencyBookingDetailModal';
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

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

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

  useEffect(() => {
    fetchBookings(0);
  }, [selectedStatus]);

  // Tự động tải lại bảng khi có đơn đặt lịch mới đẩy về qua WebSocket
  useEffect(() => {
    const handleNewBooking = () => {
      fetchBookings(0);
    };
    window.addEventListener('agency:new-booking', handleNewBooking);
    return () => window.removeEventListener('agency:new-booking', handleNewBooking);
  }, [selectedStatus, searchQuery, pageInfo.size]);

  const statusTabs = [
    { key: 'ALL', label: t('tab_all') },
    { key: 'PENDING_DEPOSIT', label: t('status_pending_deposit') },
    { key: 'CONFIRMED', label: t('status_confirmed') },
    { key: 'IN_PROGRESS', label: t('status_in_progress') },
    { key: 'COMPLETED', label: t('status_completed') },
    { key: 'CANCELLED', label: t('status_cancelled') },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = b.bookingStatus || b.status;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        st === selectedStatus ||
        (selectedStatus === 'CANCELLED' && (st === 'CANCELLED' || st === 'CANCELLED_EXPIRED')) ||
        (selectedStatus === 'CONFIRMED' && (st === 'CONFIRMED' || st === 'ACCEPTED' || st === 'AGENCY_ASSIGNED' || st === 'ARRIVED'));

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.bookingCode?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.customerPhone?.toLowerCase().includes(q) ||
        b.staffName?.toLowerCase().includes(q) ||
        b.servicePackageName?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, selectedStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => (b.bookingStatus || b.status) === 'COMPLETED').length;
    const totalRevenue = bookings
      .filter((b) => (b.bookingStatus || b.status) === 'COMPLETED')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const studioNet = bookings
      .filter((b) => (b.bookingStatus || b.status) === 'COMPLETED')
      .reduce((sum, b) => sum + (Number(b.estimatedStudioNet) || 0), 0);

    return { total, completed, totalRevenue, studioNet };
  }, [bookings]);

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };



  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING_DEPOSIT: { variant: 'pending', label: t('status_pending_deposit') },
      REQUESTED: { variant: 'warning', label: t('status_requested') },
      PENDING_AGENCY_DISPATCH: { variant: 'warning', label: t('status_pending_agency_dispatch') },
      AGENCY_ASSIGNED: { variant: 'info', label: t('status_agency_assigned') },
      ACCEPTED: { variant: 'active', label: t('status_accepted') },
      CONFIRMED: { variant: 'active', label: t('status_confirmed') },
      ON_THE_WAY: { variant: 'info', label: t('status_on_the_way') },
      ARRIVED: { variant: 'info', label: t('status_arrived') },
      IN_PROGRESS: { variant: 'warning', label: t('status_in_progress') },
      COMPLETED: { variant: 'success', label: t('status_completed') },
      PAID_OUT: { variant: 'success', label: t('status_paid_out') },
      CANCELLED: { variant: 'inactive', label: t('status_cancelled') },
      CANCELLED_EXPIRED: { variant: 'inactive', label: t('status_cancelled_expired') },
      DISPUTED: { variant: 'danger', label: t('status_disputed') },
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
      render: (row) => (
        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded">
          {row.bookingCode}
        </span>
      ),
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
      render: (row) =>
        row.staffName ? (
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {row.staffName}
            </span>
            <span className="text-[11px] text-slate-400">{row.staffPhone || ''}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">{t('unassigned_staff')}</span>
        ),
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
      render: (row) => (
        <button
          onClick={() => handleOpenDetail(row)}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t('btn_view_details')}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
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
            {stats.total}
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
            {stats.completed}
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
            {formatCurrency(stats.totalRevenue)}
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
            {formatCurrency(stats.studioNet)}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('error_system_notice')}:</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedStatus === tab.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_booking_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

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
      />
    </div>
  );
};
