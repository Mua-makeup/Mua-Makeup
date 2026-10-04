import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Eye,
  ImageIcon,
  AlertCircle,
  ShieldAlert,
  User as UserIcon,
  ExternalLink,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { Modal } from '../../components/base/Modal';
import { Textarea } from '../../components/base/Textarea';
import { Toast } from '../../components/base/Toast';
import { getSavedPageSize } from '../../utils/pagination.util';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const AdminDisputesPage = () => {
  const { t } = useI18nStore();

  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({
    pendingDisputes: 0,
    refundedDisputes: 0,
    rejectedDisputes: 0,
    totalDisputedDepositAmount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  // Selected dispute for detail modal
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Arbitration state within detail modal
  const [resolutionAction, setResolutionAction] = useState('APPROVE_REFUND_CUSTOMER'); // 'APPROVE_REFUND_CUSTOMER' | 'REJECT_AND_PAYOUT_MUA'
  const [resolveNote, setResolveNote] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Evidence image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await superAdminService.getDisputeStats();
      const data = res?.data || res || {};
      setStats({
        pendingDisputes: Number(data.pendingDisputes || 0),
        refundedDisputes: Number(data.refundedDisputes || 0),
        rejectedDisputes: Number(data.rejectedDisputes || 0),
        totalDisputedDepositAmount: Number(data.totalDisputedDepositAmount || 0),
      });
    } catch (err) {
      console.warn('[AdminDisputesPage] Failed to fetch stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchDisputes = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await superAdminService.getDisputes({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
        page,
        size,
      });
      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setDisputes(data);
        setPageInfo({ page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setDisputes(data.content || []);
        setPageInfo({
          page: data.page ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDisputes(0);
  }, [statusFilter]);

  // Listen for realtime dispute events from STOMP
  useEffect(() => {
    const handleRealtimeDispute = () => {
      fetchStats();
      fetchDisputes(0);
    };

    window.addEventListener('admin:dispute-created', handleRealtimeDispute);
    return () => {
      window.removeEventListener('admin:dispute-created', handleRealtimeDispute);
    };
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDisputes(0);
  };

  const handleReloadAll = () => {
    fetchStats();
    fetchDisputes(0);
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleOpenDetail = (dispute) => {
    setSelectedDispute(dispute);
    setResolutionAction('APPROVE_REFUND_CUSTOMER');
    setResolveNote('');
    setResolveError('');
    setIsDetailModalOpen(true);
  };

  const handleConfirmResolution = async () => {
    if (!resolveNote.trim()) {
      setResolveError(t('modal_resolve_note_required') || 'Vui lòng nhập ghi chú phán quyết của Admin');
      return;
    }

    if (!selectedDispute) return;

    setIsResolving(true);
    setResolveError('');

    try {
      await superAdminService.resolveDispute(selectedDispute.id, {
        resolution: resolutionAction,
        note: resolveNote.trim(),
      });

      setToastMessage(t('resolve_dispute_success') || 'Đã thực hiện phán quyết khiếu nại thành công!');
      setIsDetailModalOpen(false);
      setSelectedDispute(null);
      fetchStats();
      fetchDisputes(pageInfo.page);
    } catch (err) {
      setResolveError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsResolving(false);
    }
  };

  // Synchronized status badge (NO blinking text)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISPUTED':
        return (
          <Badge variant="danger" hasDot={true} className="font-bold">
            {t('badge_disputed') || 'Đang Khiếu Nại'}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="success" hasDot={true} className="font-bold">
            {t('badge_refunded') || 'Đã Hoàn Cọc'}
          </Badge>
        );
      case 'PAID_OUT':
        return (
          <Badge variant="indigo" hasDot={true} className="font-bold">
            {t('badge_rejected_payout') || 'Đã Quyết Toán Thợ'}
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" hasDot={true}>
            {t(`status_${status?.toLowerCase()}`) || status}
          </Badge>
        );
    }
  };

  const columns = [
    {
      header: t('col_dispute_booking') || 'Mã Đơn & Thời Gian',
      accessor: 'bookingCode',
      headerClassName: 'pl-4 pr-3',
      className: 'pl-4 pr-3',
      render: (row) => (
        <div className="flex flex-col items-start space-y-1">
          <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/30">
            #{row.bookingCode || row.id}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatDate(row.emergencyReportedAt || row.createdAt)}
          </span>
          {row.bookingType && (
            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {row.bookingType === 'REALTIME_INSTANT'
                ? t('type_instant') || '⚡ Ca Gấp'
                : t('type_scheduled') || '📅 Đặt Lịch'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('col_dispute_customer') || 'Khách Hàng',
      accessor: 'customerName',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 dark:text-white text-xs block">
            {row.customerName || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono block">
            {row.customerPhone || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_dispute_mua') || 'Thợ Trang Điểm',
      accessor: 'muaName',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
            {row.muaName || (row.muaId ? `MUA #${row.muaId}` : t('unassigned_staff') || 'Chưa phân công')}
          </span>
          {row.muaPhone && (
            <span className="text-[11px] text-slate-400 font-mono block">
              {row.muaPhone}
            </span>
          )}
          {row.agencyName && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
              Studio: {row.agencyName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('col_dispute_reason') || 'Lý Do & Minh Chứng',
      accessor: 'emergencyReason',
      render: (row) => (
        <div className="space-y-1.5 max-w-xs">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 text-xs font-medium line-clamp-2 leading-relaxed">
            {row.emergencyReason || row.cancellationReason || t('default_dispute_reason') || 'Khách hàng khiếu nại sự cố ca'}
          </div>
          {row.emergencyProofUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImageUrl(row.emergencyProofUrl);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t('btn_view_proof') || 'Xem Minh Chứng'}</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              {t('no_proof_available') || 'Không có ảnh minh chứng'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('col_dispute_deposit') || 'Tiền Cọc Escrow',
      accessor: 'depositAmount',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-xs text-rose-600 dark:text-rose-400 block font-mono">
            {formatCurrency(row.depositAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {t('col_total_amount') || 'Tổng đơn'}: {formatCurrency(row.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      header: t('col_dispute_status') || 'Trạng Thái',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: t('col_dispute_actions') || 'Thao Tác',
      accessor: 'id',
      headerClassName: 'text-right pr-4',
      className: 'text-right pr-4',
      render: (row) => {
        const isDisputed = row.status === 'DISPUTED';

        return (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isDisputed
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title={isDisputed ? t('btn_view_dispute_detail') || 'Xem Chi Tiết & Xử Lý' : t('btn_view_detail_only') || 'Xem Chi Tiết'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {isDisputed
                  ? t('btn_view_dispute_detail') || 'Xem Chi Tiết & Xử Lý'
                  : t('btn_view_detail_only') || 'Xem Chi Tiết'}
              </span>
            </button>
          </div>
        );
      },
    },
  ];

  // Synchronized Filter Tabs with dynamic counter badges
  const totalCount =
    (stats.pendingDisputes || 0) +
    (stats.refundedDisputes || 0) +
    (stats.rejectedDisputes || 0);

  const statusTabs = [
    {
      key: 'ALL',
      label: t('filter_all_disputes') || 'Tất Cả Khiếu Nại',
      count: totalCount,
    },
    {
      key: 'PENDING',
      label: t('filter_pending_disputes') || 'Đang Chờ Xử Lý',
      count: stats.pendingDisputes || 0,
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
    },
    {
      key: 'CANCELLED',
      label: t('filter_refunded_disputes') || 'Đã Hoàn Tiền Cọc',
      count: stats.refundedDisputes || 0,
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'PAID_OUT',
      label: t('filter_rejected_disputes') || 'Đã Quyết Toán Cho Thợ',
      count: stats.rejectedDisputes || 0,
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>{t('disputes_title') || 'Quản Lý Báo Cáo Khiếu Nại & Sự Cố'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('disputes_subtitle') ||
              'Tiếp nhận khiếu nại từ khách hàng & thợ trang điểm, xử lý phân xử hoàn cọc hoặc quyết toán'}
          </p>
        </div>

        <button
          onClick={handleReloadAll}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isStatsLoading ? 'animate-spin' : ''}`} />
          <span>{t('reload') || 'Tải Lại'}</span>
        </button>
      </div>

      {/* KPI Overview Cards (Solid, Clean, No Blinking) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Disputes */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('stat_pending_disputes') || 'Khiếu Nại Đang Chờ'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.pendingDisputes || 0}
          </div>
        </div>

        {/* Card 2: Refunded Disputes */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('stat_refunded_disputes') || 'Đã Chấp Thuận Hoàn Cọc'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.refundedDisputes || 0}
          </div>
        </div>

        {/* Card 3: Rejected / Paid Out Disputes */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('stat_rejected_disputes') || 'Đã Bác Bỏ / Quyết Toán'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.rejectedDisputes || 0}
          </div>
        </div>

        {/* Card 4: Total Disputed Deposit Amount */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('stat_disputed_deposit_amount') || 'Tổng Tiền Cọc Tranh Chấp'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(stats.totalDisputedDepositAmount)}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {apiError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Tabs with Exact Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none w-full sm:w-auto shrink-0">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badgeColor || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Keyword Search */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('dispute_search_placeholder') || 'Mã đơn, SĐT, tên khách, thợ...'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-xs"
          />
        </form>
      </div>

      {/* Disputes Data Table */}
      <DataTable
        columns={columns}
        data={disputes}
        isLoading={isLoading}
        onRowClick={(row) => handleOpenDetail(row)}
        pagination={{
          currentPage: pageInfo.page + 1,
          pageSize: pageInfo.size,
          totalElements: pageInfo.totalElements,
          totalPages: pageInfo.totalPages,
          onPageChange: (newPage) => fetchDisputes(newPage - 1, pageInfo.size),
          onPageSizeChange: (newSize) => fetchDisputes(0, newSize),
        }}
        emptyMessage={t('no_data') || 'Không có khiếu nại nào trong danh mục này'}
      />

      {/* Comprehensive Dispute Dossier & Arbitration Modal */}
      {isDetailModalOpen && selectedDispute && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            if (!isResolving) {
              setIsDetailModalOpen(false);
              setSelectedDispute(null);
            }
          }}
          title={
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>
                {t('modal_dispute_detail_title') || 'Hồ Sơ Chi Tiết Khiếu Nại Đơn Hàng'}{' '}
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  #{selectedDispute.bookingCode || selectedDispute.id}
                </span>
              </span>
            </div>
          }
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedDispute(null);
                }}
                disabled={isResolving}
              >
                {t('close') || 'Đóng'}
              </Button>

              {selectedDispute.status === 'DISPUTED' ? (
                <Button
                  variant={resolutionAction === 'APPROVE_REFUND_CUSTOMER' ? 'primary' : 'danger'}
                  onClick={handleConfirmResolution}
                  isLoading={isResolving}
                  icon={resolutionAction === 'APPROVE_REFUND_CUSTOMER' ? CheckCircle2 : XCircle}
                >
                  {resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                    ? t('btn_approve_refund') || 'Phê Duyệt Hoàn Cọc'
                    : t('btn_reject_dispute') || 'Từ Chối & Quyết Toán'}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{t('dispute_resolved_notice') || 'Đơn hàng đã được phân xử hoàn tất'}</span>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Status & Booking Type Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{t('col_dispute_status') || 'Trạng thái'}:</span>
                {getStatusBadge(selectedDispute.status)}
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>{formatDate(selectedDispute.bookingDate || selectedDispute.createdAt)}</span>
                {selectedDispute.startTime && (
                  <>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>{selectedDispute.startTime}</span>
                  </>
                )}
              </div>
            </div>

            {/* Incident & Dispute Evidence Banner */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('dispute_incident_info') || 'Thông Tin Sự Cố & Khiếu Nại'}</span>
                </div>
                {selectedDispute.emergencyReportedAt && (
                  <span className="text-[11px] text-rose-600/80 dark:text-rose-400 font-medium">
                    {t('dispute_reported_at') || 'Báo cáo lúc'}: {formatDateTime(selectedDispute.emergencyReportedAt)}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-800 dark:text-slate-200 font-medium bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40 leading-relaxed">
                "{selectedDispute.emergencyReason || selectedDispute.cancellationReason || t('default_dispute_reason') || 'Khách hàng báo sự cố ca'}"
              </div>

              {selectedDispute.emergencyProofUrl ? (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={selectedDispute.emergencyProofUrl}
                    alt="Minh chứng khiếu nại"
                    className="w-16 h-16 object-cover rounded-xl border border-rose-200 dark:border-rose-800 cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
                    onClick={() => setPreviewImageUrl(selectedDispute.emergencyProofUrl)}
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {t('proof_document_label') || 'Ảnh minh chứng sự cố'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(selectedDispute.emergencyProofUrl)}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('proof_document_view_full') || 'Xem ảnh phóng to'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  {t('no_proof_available') || 'Không có ảnh minh chứng đính kèm'}
                </div>
              )}
            </div>

            {/* Parties Info Grid: Customer vs Makeup Artist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Customer Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                  <UserIcon className="w-3.5 h-3.5 text-rose-500" />
                  <span>{t('dispute_customer_info') || 'Khách Hàng Khiếu Nại'}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedDispute.customerName || 'N/A'}
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                  {selectedDispute.customerPhone || 'N/A'}
                </div>
                {selectedDispute.destinationAddress && (
                  <div className="flex items-start gap-1 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{selectedDispute.destinationAddress}</span>
                  </div>
                )}
              </div>

              {/* MUA Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('dispute_mua_info') || 'Thợ Trang Điểm'}</span>
                  </div>
                  {selectedDispute.agencyName && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">
                      Studio: {selectedDispute.agencyName}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedDispute.muaName || (selectedDispute.muaId ? `MUA #${selectedDispute.muaId}` : t('unassigned_staff') || 'Chưa phân công')}
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                  {selectedDispute.muaPhone || 'N/A'}
                </div>
              </div>
            </div>

            {/* Financial & Escrow Deposit Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {t('dispute_financial_summary') || 'Tổng Quan Tài Chính & Tiền Cọc'}
                </span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                  {t('col_dispute_deposit') || 'Tiền Cọc Escrow'}: {formatCurrency(selectedDispute.depositAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-[10px] block">{t('fee_service') || 'Phí dịch vụ'}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(selectedDispute.serviceSubtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block">{t('fee_distance') || 'Phí di chuyển'}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(selectedDispute.distanceFee)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block">{t('fee_surcharge') || 'Phụ phí'}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(selectedDispute.surchargeFee)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block text-rose-600 font-semibold">{t('col_total_amount') || 'Tổng đơn'}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(selectedDispute.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Already Resolved Section */}
            {selectedDispute.status !== 'DISPUTED' && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  selectedDispute.status === 'CANCELLED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'
                }`}
              >
                <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {selectedDispute.status === 'CANCELLED'
                      ? t('dispute_resolved_status_refunded') || 'ĐÃ CHẤP THUẬN HOÀN TIỀN CỌC CHO KHÁCH HÀNG'
                      : t('dispute_resolved_status_rejected') || 'ĐÃ BÁC BỎ KHIẾU NẠI & QUYẾT TOÁN CHO THỢ'}
                  </span>
                </div>
                <div className="text-xs leading-relaxed bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="font-bold block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                    {t('dispute_decision_reason') || 'Căn cứ phán quyết'}:
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedDispute.cancellationReason || t('dispute_resolved_notice') || 'Đã phân xử xong.'}
                  </span>
                </div>
              </div>
            )}

            {/* Active Arbitration Section (When DISPUTED) */}
            {selectedDispute.status === 'DISPUTED' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>{t('modal_resolve_dispute_title') || 'Phán Quyết Khiếu Nại Của Ban Quản Trị'}</span>
                </div>

                {/* Resolution Choice Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResolutionAction('APPROVE_REFUND_CUSTOMER')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('btn_approve_refund') || 'Phê Duyệt Hoàn Cọc'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Khách Hàng
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Hoàn {formatCurrency(selectedDispute.depositAmount)} về Ví Khách Hàng. Chuyển trạng thái CANCELLED.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionAction('REJECT_AND_PAYOUT_MUA')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      resolutionAction === 'REJECT_AND_PAYOUT_MUA'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-100'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        {t('btn_reject_dispute') || 'Từ Chối & Quyết Toán'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                        Thợ Trang Điểm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Bác bỏ khiếu nại, quyết toán giải ngân thanh toán cho Thợ (PAID_OUT).
                    </p>
                  </button>
                </div>

                {/* Explanation Banner */}
                <div
                  className={`p-3 rounded-xl text-xs leading-relaxed border ${
                    resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                    ? t('modal_resolve_approve_desc') ||
                      'Bạn đang chọn PHÊ DUYỆT khiếu nại. Toàn bộ tiền cọc Escrow sẽ được hoàn trả về Ví Khách Hàng. Đơn hàng chuyển sang ĐÃ HỦY (CANCELLED).'
                    : t('modal_resolve_reject_desc') ||
                      'Bạn đang chọn TỪ CHỐI khiếu nại. Khiếu nại sẽ bị bác bỏ và hệ thống quyết toán giải ngân thanh toán cho Thợ (PAID_OUT).'}
                </div>

                {/* Admin Note Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('modal_resolve_note_label') || 'Ghi Chú & Căn Cứ Phán Quyết Của Admin'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder={
                      t('modal_resolve_note_placeholder') ||
                      'Nhập chi tiết căn cứ và lý do phán quyết của Ban quản trị...'
                    }
                    value={resolveNote}
                    onChange={(e) => {
                      setResolveNote(e.target.value);
                      setResolveError('');
                    }}
                    disabled={isResolving}
                  />
                  {resolveError && (
                    <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{resolveError}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Proof Image Preview Modal */}
      {previewImageUrl && (
        <Modal
          isOpen={Boolean(previewImageUrl)}
          onClose={() => setPreviewImageUrl(null)}
          title={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ImageIcon className="w-5 h-5 text-rose-600" />
              <span>{t('modal_proof_preview_title') || 'Ảnh Minh Chứng Báo Cáo Sự Cố'}</span>
            </div>
          }
          maxWidth="max-w-2xl"
          footer={
            <Button variant="secondary" onClick={() => setPreviewImageUrl(null)}>
              {t('close') || 'Đóng'}
            </Button>
          }
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={previewImageUrl}
              alt="Ảnh minh chứng khiếu nại"
              className="max-h-[70vh] w-auto object-contain rounded-xl border border-slate-200 dark:border-slate-700 shadow-md"
            />
            <div className="mt-3 flex items-center gap-2">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('open_image_new_tab') || 'Mở ảnh trong tab mới'}</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notice */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
};

export default AdminDisputesPage;
