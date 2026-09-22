import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye, AlertCircle, ShoppingBag } from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { DataTable } from '../../components/base/DataTable';
import { BookingDetailModal } from '../../components/features/admin/BookingDetailModal';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const AdminBookingsPage = () => {
  const { t } = useI18nStore();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
      const res = await superAdminService.getBookings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
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
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBookings(0);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'PENDING_DEPOSIT':
      case 'PENDING':
        return 'pending';
      case 'REQUESTED':
      case 'PENDING_AGENCY_DISPATCH':
        return 'warning';
      case 'ACCEPTED':
      case 'AGENCY_ASSIGNED':
      case 'CONFIRMED':
      case 'ON_THE_WAY':
      case 'ARRIVED':
        return 'info';
      case 'IN_PROGRESS':
        return 'primary';
      case 'COMPLETED':
      case 'PAID_OUT':
        return 'success';
      case 'CANCELLED':
      case 'CANCELLED_EXPIRED':
        return 'rejected';
      case 'DISPUTED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      PENDING_DEPOSIT: t('status_pending_deposit'),
      REQUESTED: t('status_requested'),
      PENDING_AGENCY_DISPATCH: t('status_pending_agency_dispatch'),
      AGENCY_ASSIGNED: t('status_agency_assigned'),
      ACCEPTED: t('status_accepted'),
      CONFIRMED: t('status_confirmed'),
      ON_THE_WAY: t('status_on_the_way'),
      ARRIVED: t('status_arrived'),
      IN_PROGRESS: t('status_in_progress'),
      COMPLETED: t('status_completed'),
      PAID_OUT: t('status_paid_out'),
      CANCELLED: t('status_cancelled'),
      CANCELLED_EXPIRED: t('status_cancelled_expired'),
      DISPUTED: t('status_disputed'),
      PENDING: t('status_pending'),
    };
    return map[status] || status;
  };

  const columns = [
    {
      header: t('col_booking_code'),
      accessor: 'bookingCode',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/30">
            #{row.bookingCode || row.id}
          </span>
          <span className="block text-[10px] text-slate-400 mt-1 uppercase">
            {row.bookingType}
          </span>
        </div>
      ),
    },
    {
      header: t('col_customer'),
      accessor: 'customerName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white text-xs block">
            {row.customerName || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500">{row.customerPhone}</span>
        </div>
      ),
    },
    {
      header: t('col_mua'),
      accessor: 'muaName',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
            {row.muaName || (row.muaId ? `MUA #${row.muaId}` : t('unassigned_staff'))}
          </span>
          {row.agencyName && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              Studio: {row.agencyName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('col_date_time'),
      accessor: 'bookingDate',
      render: (row) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <div>{row.bookingDate || 'N/A'}</div>
          <div className="text-[11px] text-slate-400">{row.startTime || ''}</div>
        </div>
      ),
    },
    {
      header: t('col_total_amount'),
      accessor: 'totalAmount',
      render: (row) => (
        <span className="font-extrabold text-slate-900 dark:text-white text-xs">
          {Number(row.totalAmount || 0).toLocaleString()} đ
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {getStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      header: t('actions'),
      accessor: 'id',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedBooking(row);
            setIsDetailModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t('view_detail')}</span>
        </button>
      ),
    },
  ];

  const statusTabs = [
    { key: 'ALL', label: t('tab_all') },
    { key: 'REQUESTED', label: t('status_requested') },
    { key: 'ACCEPTED', label: t('status_accepted') },
    { key: 'ON_THE_WAY', label: t('status_on_the_way') },
    { key: 'IN_PROGRESS', label: t('status_in_progress') },
    { key: 'COMPLETED', label: t('status_completed') },
    { key: 'CANCELLED', label: t('status_cancelled') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-rose-600" />
            <span>{t('nav_admin_bookings')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('admin_bookings_sub')}
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t('reload') || 'Tải Lại'}</span>
        </button>
      </div>

      {/* Error Notice */}
      {apiError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Keyword Search */}
        <form onSubmit={handleSearch} className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_booking_placeholder') || 'Mã đơn, SĐT, tên khách...'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={bookings}
          isLoading={isLoading}
          emptyMessage={t('no_bookings_found') || 'Chưa có đơn hàng nào trong danh mục này'}
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
      </div>

      {/* Booking Detail & Audit Log Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />
    </div>
  );
};
