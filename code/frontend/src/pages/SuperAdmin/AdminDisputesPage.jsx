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
  Scale,
  Gavel,
  Phone,
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

  // Close image lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImageUrl) {
        setPreviewImageUrl(null);
      }
    };
    if (previewImageUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewImageUrl]);

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
  const getStatusBadge = (status, cancellationReason = '') => {
    const isSplit =
      (cancellationReason || '').toLowerCase().includes('50/50') ||
      (cancellationReason || '').toLowerCase().includes('50-50') ||
      (cancellationReason || '').toLowerCase().includes('hòa giải');

    if (isSplit && (status === 'DISPUTE_REFUNDED' || status === 'CANCELLED')) {
      return (
        <Badge variant="purple" hasDot={true} className="font-bold">
          Hòa Giải 50/50
        </Badge>
      );
    }

    switch (status) {
      case 'DISPUTED':
        return (
          <Badge variant="danger" hasDot={true} className="font-bold">
            {t('badge_disputed') || 'Đang Khiếu Nại'}
          </Badge>
        );
      case 'DISPUTE_REFUNDED':
      case 'CANCELLED':
        return (
          <Badge variant="success" hasDot={true} className="font-bold">
            {t('badge_refunded') || 'Đã Hoàn Cọc'}
          </Badge>
        );
      case 'DISPUTE_COMPENSATED':
      case 'PAID_OUT':
        return (
          <Badge variant="indigo" hasDot={true} className="font-bold">
            {t('badge_rejected_payout') || 'Đã Bồi Thường Thợ'}
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

  // Helper to parse dispute origin, statements and evidence
  const parseDisputeInfo = (row) => {
    const rawReason = (row?.emergencyReason || row?.cancellationReason || '').trim();
    const rawProof = (row?.emergencyProofUrl || '').trim();
    const rawProofParts = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];

    const hasCustomerTag = rawReason.includes('[Khách hàng]');
    const hasMuaTag = rawReason.includes('[Chuyên viên MUA]');

    const isDual =
      row?.disputeOrigin === 'DUAL' ||
      (hasCustomerTag && hasMuaTag);

    const isMuaOnly =
      !isDual &&
      (row?.disputeOrigin === 'MUA' ||
        (hasMuaTag && !hasCustomerTag) ||
        (!hasCustomerTag &&
          (rawReason.toLowerCase().includes('vắng mặt') ||
            rawReason.toLowerCase().includes('no-show') ||
            rawReason.toLowerCase().includes('không gặp khách'))));

    let disputeOrigin = isDual ? 'DUAL' : isMuaOnly ? 'MUA' : 'CUSTOMER';
    let customerStatement = '';
    let muaStatement = '';
    let customerProofUrls = [];
    let muaProofUrls = [];

    // Helper to sanitize URL by stripping role tags prefix [Khách hàng]: or [Chuyên viên MUA]:
    const cleanUrl = (u) => (u || '').replace(/^\[.*?\]:?/, '').trim();

    if (isDual) {
      const parts = rawReason.split('|');
      parts.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed.includes('[Khách hàng]')) {
          customerStatement = trimmed.replace(/\[Khách hàng\]:?/, '').trim();
        } else if (trimmed.includes('[Chuyên viên MUA]')) {
          muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
        } else if (
          trimmed.toLowerCase().includes('khách hàng') ||
          trimmed.toLowerCase().includes('với khách') ||
          trimmed.toLowerCase().includes('vắng mặt')
        ) {
          muaStatement = trimmed;
        } else {
          if (!muaStatement) muaStatement = trimmed;
          else if (!customerStatement) customerStatement = trimmed;
        }
      });

      const hasTaggedProofs = rawProofParts.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));
      if (hasTaggedProofs) {
        rawProofParts.forEach((item) => {
          const cleaned = cleanUrl(item);
          if (!cleaned) return;
          if (item.includes('[Khách hàng]')) {
            customerProofUrls.push(cleaned);
          } else if (item.includes('[Chuyên viên MUA]')) {
            muaProofUrls.push(cleaned);
          } else {
            if (muaProofUrls.length === 0) muaProofUrls.push(cleaned);
            else customerProofUrls.push(cleaned);
          }
        });
      } else {
        if (rawReason.startsWith('[Khách hàng]')) {
          customerProofUrls = rawProofParts.slice(0, 1).map(cleanUrl).filter(Boolean);
          muaProofUrls = rawProofParts.slice(1).map(cleanUrl).filter(Boolean);
        } else {
          muaProofUrls = rawProofParts.slice(0, 1).map(cleanUrl).filter(Boolean);
          customerProofUrls = rawProofParts.slice(1).map(cleanUrl).filter(Boolean);
        }
      }
    } else if (isMuaOnly) {
      muaStatement = rawReason.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      customerStatement = 'Chưa gửi lời khai riêng';
      muaProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
      customerProofUrls = [];
    } else {
      customerStatement = rawReason.replace(/\[Khách hàng\]:?/, '').trim();
      muaStatement = 'Chưa gửi lời khai riêng';
      customerProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
      muaProofUrls = [];
    }

    const proofUrls = [...customerProofUrls, ...muaProofUrls];
    if (proofUrls.length === 0 && rawProofParts.length > 0) {
      rawProofParts.forEach((p) => {
        const cleaned = cleanUrl(p);
        if (cleaned) proofUrls.push(cleaned);
      });
    }

    const cleanSummary = rawReason.replace(/\[.*?\]:?/g, '').replace(/\|/g, '•').trim();

    return {
      disputeOrigin,
      customerStatement: customerStatement || (disputeOrigin === 'CUSTOMER' ? cleanSummary : 'Chưa gửi lời khai riêng'),
      muaStatement: muaStatement || (disputeOrigin === 'MUA' ? cleanSummary : 'Chưa gửi lời khai riêng'),
      summaryText: cleanSummary || 'Khiếu nại sự cố ca hẹn',
      proofUrls,
      customerProofUrls,
      muaProofUrls,
    };
  };

  const columns = [
    {
      header: t('col_dispute_booking') || 'Mã Đơn & Thời Gian',
      accessor: 'bookingCode',
      headerClassName: 'pl-4 pr-2 w-[140px]',
      className: 'pl-4 pr-2',
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
      headerClassName: 'px-2 w-[135px]',
      className: 'px-2',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 dark:text-white text-xs block truncate" title={row.customerName}>
            {row.customerName || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
            {row.customerPhone || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_dispute_mua') || 'Thợ Trang Điểm',
      accessor: 'muaName',
      headerClassName: 'px-2 w-[145px]',
      className: 'px-2',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate" title={row.muaName}>
            {row.muaName || (row.muaId ? `MUA #${row.muaId}` : t('unassigned_staff') || 'Chưa phân công')}
          </span>
          {row.muaPhone && (
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              {row.muaPhone}
            </span>
          )}
          {row.agencyName && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block truncate">
              Studio: {row.agencyName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Nguồn Sự Cố',
      accessor: 'disputeOrigin',
      headerClassName: 'px-2 text-center w-[110px]',
      className: 'px-2 text-center',
      render: (row) => {
        const info = parseDisputeInfo(row);
        return (
          <div className="inline-flex items-center justify-center">
            {info.disputeOrigin === 'DUAL' ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-help"
                title="Tranh Chấp 2 Chiều (Cả Khách & Thợ đều gửi khiếu nại - Xem chi tiết để đối chiếu)"
              >
                <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>2 Chiều</span>
              </span>
            ) : info.disputeOrigin === 'MUA' ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 cursor-help"
                title="Chuyên viên MUA báo cáo sự cố (Xem chi tiết để đọc lời khai)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Thợ Báo</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 cursor-help"
                title="Khách hàng khiếu nại (Xem chi tiết để đọc lời khai)"
              >
                <UserIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Khách Báo</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Minh Chứng',
      accessor: 'emergencyProofUrl',
      headerClassName: 'text-center px-2 w-[85px]',
      className: 'text-center px-2',
      render: (row) => {
        const info = parseDisputeInfo(row);
        if (info.proofUrls.length === 0) {
          return <span className="text-[11px] text-slate-400 italic">-</span>;
        }
        return (
          <div className="inline-flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImageUrl(info.proofUrls[0]);
              }}
              className="relative group p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-rose-500 transition-all cursor-pointer bg-white dark:bg-slate-800 shadow-2xs"
              title={`Bấm xem ảnh minh chứng (${info.proofUrls.length} ảnh)`}
            >
              <img
                src={info.proofUrls[0]}
                alt="Proof"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-md object-cover"
              />
              {info.proofUrls.length > 1 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs leading-none">
                  +{info.proofUrls.length - 1}
                </span>
              )}
            </button>
          </div>
        );
      },
    },
    {
      header: t('col_dispute_deposit') || 'Tiền Cọc Escrow',
      accessor: 'depositAmount',
      headerClassName: 'px-2 w-[110px]',
      className: 'px-2',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-bold text-xs text-rose-600 dark:text-rose-400 block font-mono">
            {formatCurrency(row.depositAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            {t('col_total_amount') || 'Tổng'}: {formatCurrency(row.totalAmount)}
          </span>
        </div>
      ),
    },
    {
      header: t('col_dispute_status') || 'Trạng Thái',
      accessor: 'status',
      headerClassName: 'px-2 text-center w-[120px]',
      className: 'px-2 text-center',
      render: (row) => getStatusBadge(row.status, row.cancellationReason),
    },
    {
      header: t('col_dispute_actions') || 'Thao Tác',
      accessor: 'id',
      headerClassName: 'text-right pr-4 pl-2 w-[100px]',
      className: 'text-right pr-4 pl-2',
      render: (row) => {
        const isDisputed = row.status === 'DISPUTED';

        return (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                isDisputed
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title={isDisputed ? 'Mở hồ sơ & phân xử khiếu nại' : 'Xem chi tiết'}
            >
              {isDisputed ? <Gavel className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isDisputed ? 'Phân Xử' : 'Chi Tiết'}</span>
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
      {isDetailModalOpen && selectedDispute && (() => {
        const disputeInfo = parseDisputeInfo(selectedDispute);
        const halfDeposit = Math.round((selectedDispute.depositAmount || 0) / 2);

        return (
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
                  {t('modal_dispute_detail_title') || 'Hồ Sơ Tranh Chấp & Phán Quyết'}{' '}
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    #{selectedDispute.bookingCode || selectedDispute.id}
                  </span>
                </span>
              </div>
            }
            maxWidth="max-w-4xl"
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
                    variant={
                      resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                        ? 'success'
                        : resolutionAction === 'SPLIT_SETTLEMENT_50_50'
                        ? 'purple'
                        : 'danger'
                    }
                    onClick={handleConfirmResolution}
                    isLoading={isResolving}
                    icon={
                      resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                        ? CheckCircle2
                        : resolutionAction === 'SPLIT_SETTLEMENT_50_50'
                        ? Scale
                        : XCircle
                    }
                  >
                    {resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                      ? t('btn_approve_refund') || 'Phê Duyệt Hoàn 100% Khách'
                      : resolutionAction === 'SPLIT_SETTLEMENT_50_50'
                      ? 'Phán Quyết Hòa Giải 50% - 50%'
                      : t('btn_reject_dispute') || 'Bác Bỏ & Bồi Thường 100% Thợ'}
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
              {/* Audit Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('col_dispute_status') || 'Trạng Thái'}</span>
                  <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Loại Hình & Thời Gian</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                    {selectedDispute.bookingType === 'REALTIME_INSTANT' ? '⚡ Ca Gấp 30s' : '📅 Đặt Lịch'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatDate(selectedDispute.bookingDate || selectedDispute.createdAt)} {selectedDispute.startTime ? `• ${selectedDispute.startTime}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Giá Trị Đơn</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-1 block">
                    {formatCurrency(selectedDispute.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500">Gói: {selectedDispute.packageName || 'Dịch vụ make-up'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold uppercase block">Tiền Cọc Đóng Băng (Escrow)</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 mt-1 block text-sm">
                    {formatCurrency(selectedDispute.depositAmount)}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Tài sản tranh chấp</span>
                </div>
              </div>

              {/* Conflict Origin Banner */}
              {disputeInfo.disputeOrigin === 'DUAL' ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs">
                  <Scale className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-bold block">⚔️ Tranh chấp 2 chiều phát sinh đồng thời</span>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300">
                      Cả Khách hàng và Chuyên viên MUA đều đã gửi đơn khiếu nại đối lập nhau. Vui lòng đối chiếu lời khai và bằng chứng của cả hai bên dưới đây.
                    </span>
                  </div>
                </div>
              ) : disputeInfo.disputeOrigin === 'MUA' ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Đơn do Chuyên viên MUA chủ động báo cáo sự cố</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                      Chuyên viên MUA báo cáo khách vắng mặt, không liên lạc được hoặc gặp sự cố bất khả kháng tại hiện trường.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Đơn do Khách hàng chủ động khiếu nại</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      Khách hàng phản ánh thợ không đến, thái độ phục vụ hoặc chất lượng không đúng cam kết.
                    </span>
                  </div>
                </div>
              )}

              {/* 2-Column Side-by-Side Comparison Dossier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Customer Dossier */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{selectedDispute.customerName || 'Khách hàng'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{selectedDispute.customerPhone || 'N/A'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Phía Khách Hàng
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Lời khai & Lý do khiếu nại:
                      </label>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        "{disputeInfo.customerStatement}"
                      </div>
                    </div>
                  </div>

                  {/* Customer Evidence (if any) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                      Ảnh minh chứng của Khách:
                    </label>
                    {disputeInfo.customerProofUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {disputeInfo.customerProofUrls.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Minh chứng khách #${idx + 1}`}
                              referrerPolicy="no-referrer"
                              onClick={() => setPreviewImageUrl(url)}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(url)}
                              className="absolute inset-0 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Không có ảnh minh chứng đính kèm</span>
                    )}
                  </div>
                </div>

                {/* Right: MUA Dossier */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-xs">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {selectedDispute.muaName || (selectedDispute.muaId ? `MUA #${selectedDispute.muaId}` : 'Chưa gán')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {selectedDispute.muaPhone || (selectedDispute.agencyName ? `Studio: ${selectedDispute.agencyName}` : 'N/A')}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Phía Chuyên Viên MUA
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Lời khai & Báo cáo phản hồi:
                      </label>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        "{disputeInfo.muaStatement}"
                      </div>
                    </div>
                  </div>

                  {/* MUA Evidence (if any) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                      Ảnh minh chứng của Thợ:
                    </label>
                    {disputeInfo.muaProofUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {disputeInfo.muaProofUrls.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Minh chứng thợ #${idx + 1}`}
                              referrerPolicy="no-referrer"
                              onClick={() => setPreviewImageUrl(url)}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(url)}
                              className="absolute inset-0 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Không có ảnh minh chứng đính kèm</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Already Resolved Section */}
              {selectedDispute.status !== 'DISPUTED' && (() => {
                const isSplit5050 =
                  (selectedDispute.cancellationReason || '').toLowerCase().includes('50/50') ||
                  (selectedDispute.cancellationReason || '').toLowerCase().includes('50-50') ||
                  (selectedDispute.cancellationReason || '').toLowerCase().includes('hòa giải');
                const isRefunded =
                  selectedDispute.status === 'CANCELLED' || selectedDispute.status === 'DISPUTE_REFUNDED';
                const isCompensated =
                  selectedDispute.status === 'DISPUTE_COMPENSATED' || selectedDispute.status === 'PAID_OUT';

                return (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      isSplit5050
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100'
                        : isRefunded
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                        : isCompensated
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                      {isSplit5050 ? (
                        <Scale className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        {isSplit5050
                          ? 'ĐÃ PHÁN QUYẾT: HÒA GIẢI 50% - 50% (CHIA ĐÔI TIỀN CỌC)'
                          : isRefunded
                          ? 'ĐÃ PHÁN QUYẾT: HOÀN TIỀN CỌC 100% CHO KHÁCH HÀNG'
                          : isCompensated
                          ? 'ĐÃ PHÁN QUYẾT: BÁC BỎ KHIẾU NẠI & BỒI THƯỜNG CHO THỢ'
                          : 'ĐÃ PHÁN QUYẾT XONG VỤ VIỆC'}
                      </span>
                    </div>
                    <div className="text-xs leading-relaxed bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-bold block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                        Căn cứ phán quyết lưu trữ:
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedDispute.cancellationReason || 'Đã giải quyết theo quy định sàn.'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Active Arbitration Section (When DISPUTED) */}
              {selectedDispute.status === 'DISPUTED' && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                      <Scale className="w-4 h-4 text-rose-600" />
                      <span>Hội Đồng Trọng Tài: Chọn Phán Quyết Xử Lý Tiền Cọc</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-rose-600">
                      Cọc Escrow: {formatCurrency(selectedDispute.depositAmount)}
                    </span>
                  </div>

                  {/* 3 Resolution Choice Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Option 1: 100% Customer */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('APPROVE_REFUND_CUSTOMER')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Hoàn 100% Khách
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          Lỗi Thợ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Hoàn toàn bộ <strong>{formatCurrency(selectedDispute.depositAmount)}</strong> về ví Khách. Thợ không nhận thù lao.
                      </p>
                    </button>

                    {/* Option 2: 50/50 Split */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('SPLIT_SETTLEMENT_50_50')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        resolutionAction === 'SPLIT_SETTLEMENT_50_50'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 text-purple-900 dark:text-purple-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-purple-600" />
                          Hòa Giải 50% - 50%
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                          Công Bằng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Chia đôi tiền cọc: Khách hoàn <strong>{formatCurrency(halfDeposit)}</strong>, Thợ bồi thường <strong>{formatCurrency(halfDeposit)}</strong>.
                      </p>
                    </button>

                    {/* Option 3: 100% MUA */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('REJECT_AND_PAYOUT_MUA')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        resolutionAction === 'REJECT_AND_PAYOUT_MUA'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          Bồi Thường 100% Thợ
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                          Lỗi Khách
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Bác bỏ khiếu nại. Chuyển <strong>{formatCurrency(selectedDispute.depositAmount)}</strong> vào ví Thợ bù chi phí đi lại.
                      </p>
                    </button>
                  </div>

                  {/* Dynamic Explanation Alert */}
                  <div
                    className={`p-3 rounded-xl text-xs leading-relaxed border ${
                      resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : resolutionAction === 'SPLIT_SETTLEMENT_50_50'
                        ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {resolutionAction === 'APPROVE_REFUND_CUSTOMER' &&
                      'Quyết định: Hoàn trả 100% tiền cọc cho Khách Hàng. Đơn hàng chuyển sang ĐÃ HỦY (CANCELLED). Áp dụng khi Thợ không đến, đến quá trễ hoặc vi phạm nghiêm trọng.'}
                    {resolutionAction === 'SPLIT_SETTLEMENT_50_50' &&
                      `Quyết định: Hòa giải chia đôi. Khách hàng nhận lại ${formatCurrency(halfDeposit)} và Thợ nhận thù lao hỗ trợ ${formatCurrency(halfDeposit)}. Áp dụng cho sự cố bất khả kháng hoặc lỗi từ cả 2 phía.`}
                    {resolutionAction === 'REJECT_AND_PAYOUT_MUA' &&
                      'Quyết định: Bác bỏ khiếu nại của khách, quyết toán 100% tiền cọc cho Thợ Make-up. Áp dụng khi Khách vắng mặt, không mở cửa hoặc hủy ca sát giờ.'}
                  </div>

                  {/* Admin Note Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ghi Chú & Căn Cứ Phán Quyết Của Admin <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Nhập chi tiết căn cứ và lý do phán quyết để thông báo minh bạch cho cả 2 bên..."
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
        );
      })()}

      {/* Proof Image Lightbox (Không dấu X, click vùng trống ngoài để tắt) */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[10002] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none transition-all animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Ảnh minh chứng khiếu nại"
              referrerPolicy="no-referrer"
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('open_image_new_tab') || 'Mở ảnh trong tab mới'}</span>
              </a>
              <span className="text-white/60 text-xs">
                (Nhấn vùng trống bên ngoài để đóng)
              </span>
            </div>
          </div>
        </div>
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
