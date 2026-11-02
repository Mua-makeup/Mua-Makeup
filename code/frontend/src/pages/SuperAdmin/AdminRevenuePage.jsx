import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Percent,
  Wallet,
  Building2,
  User,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  SlidersHorizontal,
  CalendarCheck,
} from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { DataTable } from '../../components/base/DataTable';
import { BookingDetailModal } from '../../components/features/admin/BookingDetailModal';
import { PlatformFeeModal } from '../../components/features/admin/PlatformFeeModal';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';
import { formatDate } from '../../utils/formatters';

export const AdminRevenuePage = () => {
  const { t, language } = useI18nStore();
  const navigate = useNavigate();

  const [overview, setOverview] = useState({
    totalGrossVolume: 0,
    totalPlatformFee: 0,
    totalNetPartnerEarnings: 0,
    platformFeeRate: 0.15,
    totalSettledCount: 0,
    completedBookingsCount: 0,
    paidOutBookingsCount: 0,
    agencyGrossVolume: 0,
    agencyPlatformFee: 0,
    agencyNetEarnings: 0,
    agencyBookingCount: 0,
    freelanceGrossVolume: 0,
    freelancePlatformFee: 0,
    freelanceNetEarnings: 0,
    freelanceBookingCount: 0,
  });

  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Filters
  const [partnerFilter, setPartnerFilter] = useState('ALL'); // ALL | AGENCY | FREELANCE
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PAID_OUT | COMPLETED
  const [keyword, setKeyword] = useState('');

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPlatformFeeOpen, setIsPlatformFeeOpen] = useState(false);

  // Pagination
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fetchOverview = async () => {
    setIsOverviewLoading(true);
    try {
      const res = await superAdminService.getRevenueOverview();
      const data = res?.data || res || {};
      setOverview({
        totalGrossVolume: Number(data.totalGrossVolume) || 0,
        totalPlatformFee: Number(data.totalPlatformFee) || 0,
        totalNetPartnerEarnings: Number(data.totalNetPartnerEarnings) || 0,
        platformFeeRate: Number(data.platformFeeRate) || 0.15,
        totalSettledCount: Number(data.totalSettledCount) || 0,
        completedBookingsCount: Number(data.completedBookingsCount) || 0,
        paidOutBookingsCount: Number(data.paidOutBookingsCount) || 0,
        agencyGrossVolume: Number(data.agencyGrossVolume) || 0,
        agencyPlatformFee: Number(data.agencyPlatformFee) || 0,
        agencyNetEarnings: Number(data.agencyNetEarnings) || 0,
        agencyBookingCount: Number(data.agencyBookingCount) || 0,
        freelanceGrossVolume: Number(data.freelanceGrossVolume) || 0,
        freelancePlatformFee: Number(data.freelancePlatformFee) || 0,
        freelanceNetEarnings: Number(data.freelanceNetEarnings) || 0,
        freelanceBookingCount: Number(data.freelanceBookingCount) || 0,
      });
    } catch {
      // Fallback: If backend endpoint is pending restart, compute from existing booking stats
      try {
        const [statsRes, feeRes] = await Promise.all([
          superAdminService.getBookingStats().catch(() => null),
          superAdminService.getPlatformFee().catch(() => null),
        ]);
        const sData = statsRes?.data || statsRes || {};
        const fData = feeRes?.data || feeRes || {};
        const feeRate = fData.feeRate != null ? Number(fData.feeRate) : (fData.feePercent ? Number(fData.feePercent) / 100 : 0.15);
        const gross = Number(sData.totalGrossVolume) || 0;
        const fee = Math.round(gross * feeRate);
        const net = Math.max(0, gross - fee);

        setOverview((prev) => ({
          ...prev,
          totalGrossVolume: gross,
          totalPlatformFee: fee,
          totalNetPartnerEarnings: net,
          platformFeeRate: feeRate,
          completedBookingsCount: Number(sData.completedBookings) || 0,
          totalSettledCount: Number(sData.completedBookings) || 0,
        }));
      } catch {
        // Non-critical fallback
      }
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const fetchSettlements = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await superAdminService.getRevenueSettlements({
        partner: partnerFilter === 'ALL' ? undefined : partnerFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
        page,
        size,
      });
      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setSettlements(data);
        setPageInfo({ page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setSettlements(data.content || []);
        setPageInfo({
          page: data.page ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      // Fallback: If backend is pending restart, fetch completed bookings and map financial values
      try {
        const bRes = await superAdminService.getBookings({
          status: 'COMPLETED',
          keyword: keyword.trim() || undefined,
          page: 0,
          size: 100,
        });
        const bData = bRes?.data || bRes || {};
        const bContent = bData.content || (Array.isArray(bData) ? bData : []);
        const feeRate = overview.platformFeeRate || 0.15;

        // Filter revenue-eligible items
        let eligible = bContent.filter(
          (b) => b.status === 'COMPLETED' || b.status === 'PAID_OUT'
        );

        if (statusFilter === 'PAID_OUT') {
          eligible = eligible.filter((b) => b.status === 'PAID_OUT');
        } else if (statusFilter === 'COMPLETED') {
          eligible = eligible.filter((b) => b.status === 'COMPLETED');
        }

        const mapped = eligible.map((b) => {
          const total = Number(b.totalAmount) || 0;
          const feeAmt = Math.round(total * feeRate);
          const net = Math.max(0, total - feeAmt);
          const isAgency = b.bookingPartner === 'AGENCY_DISPATCH' || Boolean(b.agencyId);

          return {
            bookingId: b.id,
            bookingCode: b.bookingCode,
            bookingType: b.bookingType || 'SCHEDULED',
            bookingPartner: isAgency ? 'AGENCY_DISPATCH' : 'FREELANCER_DIRECT',
            providerName: isAgency ? (b.agencyName || 'Studio') : (b.muaName || 'Thợ tự do'),
            agencyId: b.agencyId,
            agencyName: b.agencyName,
            muaId: b.muaId,
            muaName: b.muaName,
            customerName: b.customerName || 'N/A',
            customerPhone: b.customerPhone || 'N/A',
            packageName: b.packageName || 'Dịch vụ trang điểm',
            totalAmount: total,
            platformFeeRate: feeRate,
            platformFeeAmount: feeAmt,
            netPartnerEarnings: net,
            status: b.status,
            payoutStatus: b.status === 'PAID_OUT' ? 'SETTLED' : 'PENDING',
            bookingDate: b.bookingDate,
            createdAt: b.createdAt,
            settledAt: b.updatedAt,
          };
        });

        // Filter by partner if needed
        const filtered = mapped.filter((item) => {
          if (partnerFilter === 'AGENCY') return item.bookingPartner === 'AGENCY_DISPATCH';
          if (partnerFilter === 'FREELANCE') return item.bookingPartner === 'FREELANCER_DIRECT';
          return true;
        });

        // Slice for pagination in fallback
        const start = page * size;
        const pagedItems = filtered.slice(start, start + size);

        setSettlements(pagedItems);
        setPageInfo({
          page,
          size,
          totalElements: filtered.length,
          totalPages: Math.max(Math.ceil(filtered.length / size), 1),
        });
      } catch (fallbackErr) {
        setApiError(err.message || fallbackErr.message || t('error_api_connection'));
        setSettlements([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchSettlements(0);
  }, [partnerFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSettlements(0);
  };

  const handleReloadAll = () => {
    fetchOverview();
    fetchSettlements(0);
  };

  // Table Columns
  const columns = useMemo(
    () => [
      {
        header: t('revenue_col_booking_code'),
        accessor: 'bookingCode',
        render: (row) => (
          <div>
            <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 block whitespace-nowrap">
              {row.bookingCode}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {row.bookingType === 'INSTANT' ? t('revenue_type_instant') : t('revenue_type_scheduled')}
            </span>
          </div>
        ),
      },
      {
        header: t('revenue_col_customer'),
        accessor: 'customerName',
        render: (row) => (
          <div>
            <span className="font-bold text-xs text-slate-900 dark:text-white block whitespace-nowrap">
              {row.customerName}
            </span>
            <span className="font-mono text-[10px] text-slate-500 block">
              {row.customerPhone}
            </span>
          </div>
        ),
      },
      {
        header: t('revenue_col_provider'),
        accessor: 'providerName',
        render: (row) => {
          const isAgency = row.bookingPartner === 'AGENCY_DISPATCH' || Boolean(row.agencyId);
          return (
            <div>
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block whitespace-nowrap">
                {row.providerName}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                  isAgency
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60'
                }`}
              >
                {isAgency ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                {isAgency ? t('revenue_badge_agency') : t('revenue_badge_freelance')}
              </span>
            </div>
          );
        },
      },
      {
        header: t('revenue_col_date'),
        accessor: 'bookingDate',
        render: (row) => (
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
            {row.bookingDate ? formatDate(row.bookingDate) : (row.createdAt ? formatDate(row.createdAt) : 'N/A')}
          </span>
        ),
      },
      {
        header: t('revenue_col_gross'),
        accessor: 'totalAmount',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
            {formatCurrency(row.totalAmount)}
          </span>
        ),
      },
      {
        header: t('revenue_col_fee_amount'),
        accessor: 'platformFeeAmount',
        align: 'right',
        render: (row) => {
          const ratePercent = row.platformFeeRate ? Math.round(row.platformFeeRate * 100) : 15;
          return (
            <div className="text-right">
              <span className="font-mono font-semibold text-xs text-amber-600 dark:text-amber-400 block whitespace-nowrap">
                -{formatCurrency(row.platformFeeAmount)}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                ({ratePercent}%)
              </span>
            </div>
          );
        },
      },
      {
        header: t('revenue_col_net_payout'),
        accessor: 'netPartnerEarnings',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
            {formatCurrency(row.netPartnerEarnings)}
          </span>
        ),
      },
      {
        header: t('revenue_col_status'),
        accessor: 'status',
        align: 'center',
        render: (row) => {
          const isSettled = row.payoutStatus === 'SETTLED' || row.status === 'PAID_OUT';
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                isSettled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isSettled ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {isSettled ? t('revenue_status_settled') : t('revenue_status_pending_settlement')}
            </span>
          );
        },
      },
      {
        header: t('revenue_col_actions'),
        align: 'right',
        render: (row) => (
          <button
            onClick={() => {
              setSelectedBooking({
                id: row.bookingId,
                bookingCode: row.bookingCode,
              });
              setIsDetailModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-rose-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {t('view_detail')}
          </button>
        ),
      },
    ],
    [t, language]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <CalendarCheck className="w-4 h-4" />
          {t('revenue_tab_bookings')}
        </button>
        <button
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 shadow-2xs"
        >
          <DollarSign className="w-4 h-4" />
          {t('revenue_tab_revenue')}
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            {t('revenue_page_title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('revenue_page_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPlatformFeeOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Percent className="w-4 h-4 shrink-0" />
            <span>{t('btn_platform_fee') || 'Phí Sàn Nền Tảng'}</span>
          </button>
          <button
            onClick={handleReloadAll}
            disabled={isLoading || isOverviewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isOverviewLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Booking Volume */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('revenue_card_gross')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(overview.totalGrossVolume)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('revenue_card_gross_sub')} ({overview.completedBookingsCount + overview.paidOutBookingsCount} {t('revenue_count_orders')})
          </p>
        </div>

        {/* KPI 2: Platform Fee Deducted */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('revenue_card_platform_fee')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(overview.totalPlatformFee)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('revenue_card_platform_fee_sub')}
          </p>
        </div>

        {/* KPI 3: Net Partner Payout */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('revenue_card_net_payout')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(overview.totalNetPartnerEarnings)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('revenue_card_net_payout_sub')}
          </p>
        </div>

        {/* KPI 4: Active Platform Fee Rate */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('revenue_card_fee_rate')}
            </span>
            <button
              onClick={() => setIsPlatformFeeOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{t('revenue_btn_adjust_fee')}</span>
            </button>
          </div>
          <div className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {Math.round(overview.platformFeeRate * 100)}%
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('revenue_card_fee_rate_sub')}
          </p>
        </div>
      </div>

      {/* Secondary Breakdown: Agency vs Freelancer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Studio / Agency Breakdown Card */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('revenue_agency_title')}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {overview.agencyBookingCount || 0} {t('revenue_count_orders')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_gross')}</span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(overview.agencyGrossVolume)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_fee_amount')}</span>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(overview.agencyPlatformFee)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_net_payout')}</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(overview.agencyNetEarnings)}
              </span>
            </div>
          </div>
        </div>

        {/* Freelancer Breakdown Card */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('revenue_freelance_title')}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {overview.freelanceBookingCount || 0} {t('revenue_count_orders')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_gross')}</span>
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(overview.freelanceGrossVolume)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_fee_amount')}</span>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(overview.freelancePlatformFee)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t('revenue_col_net_payout')}</span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(overview.freelanceNetEarnings)}
              </span>
            </div>
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

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Partner & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              onClick={() => setPartnerFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                partnerFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_partner_all')}
            </button>
            <button
              onClick={() => setPartnerFilter('AGENCY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                partnerFilter === 'AGENCY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_partner_agency')}
            </button>
            <button
              onClick={() => setPartnerFilter('FREELANCE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                partnerFilter === 'FREELANCE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_partner_freelance')}
            </button>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_status_all')}
            </button>
            <button
              onClick={() => setStatusFilter('PAID_OUT')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'PAID_OUT'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_status_paid_out')}
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'COMPLETED'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('revenue_filter_status_completed')}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px] sm:w-80">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('revenue_filter_search_placeholder')}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Detailed DataTable */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-2xs">
        <DataTable
          columns={columns}
          data={settlements}
          loading={isLoading}
          emptyMessage={t('revenue_empty_message')}
          pagination={{
            page: pageInfo.page,
            size: pageInfo.size,
            totalElements: pageInfo.totalElements,
            totalPages: pageInfo.totalPages,
            onPageChange: (newPage1Indexed) => fetchSettlements(newPage1Indexed - 1, pageInfo.size),
            onPageSizeChange: (newSize) => {
              savePageSize(newSize);
              setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
              fetchSettlements(0, newSize);
            },
          }}
        />
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />

      {/* Platform Fee Modal */}
      <PlatformFeeModal
        isOpen={isPlatformFeeOpen}
        onClose={() => setIsPlatformFeeOpen(false)}
        onSuccess={() => {
          setIsPlatformFeeOpen(false);
          handleReloadAll();
        }}
      />
    </div>
  );
};

