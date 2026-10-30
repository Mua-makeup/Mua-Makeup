import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { useI18nStore } from '../../store/useI18nStore';
import { StatsGridSkeleton, TableSkeleton } from '../../components/base/Skeleton';

export const AgencyWalletPage = () => {
  const { t } = useI18nStore();
  const [walletData, setWalletData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchWallet = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setApiError(null);

    try {
      const res = await agencyService.getAgencyWallet();
      const data = res?.data || res || {};
      setWalletData(data);
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const formatVND = (val) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(val) || 0);
  };

  const filteredTransactions = useMemo(() => {
    const list = walletData?.recentTransactions || [];
    return list.filter((item) => {
      // 1. Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.bookingCode && item.bookingCode.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.referenceType && item.referenceType.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Type filter
      if (typeFilter === 'CREDIT') return item.entryType === 'CREDIT';
      if (typeFilter === 'DEBIT') return item.entryType === 'DEBIT';
      if (typeFilter === 'CLAWBACK') return item.referenceType === 'BOOKING_CLAWBACK';
      if (typeFilter === 'OVERTIME') return item.referenceType === 'OVERTIME_PAYMENT';
      if (typeFilter === 'SETTLEMENT') return item.referenceType === 'BOOKING_SETTLEMENT';
      return true;
    });
  }, [walletData, searchQuery, typeFilter]);

  const getTxBadge = (item) => {
    const ref = item.referenceType || '';
    if (ref === 'BOOKING_SETTLEMENT') {
      return {
        label: t('tx_settlement') || 'Quyết Toán Ca Hẹn',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        icon: ArrowUpRight,
      };
    }
    if (ref === 'BOOKING_CLAWBACK') {
      return {
        label: t('tx_clawback') || 'Thu Hồi Do Khiếu Nại',
        bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
        icon: AlertTriangle,
      };
    }
    if (ref === 'OVERTIME_PAYMENT') {
      return {
        label: t('tx_overtime') || 'Chi Phụ Cấp Tăng Ca',
        bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
        icon: Clock,
      };
    }
    if (ref === 'BOOKING_COMPENSATION') {
      return {
        label: t('tx_compensation') || 'Bồi Thường Hủy Cọc',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
        icon: ShieldCheck,
      };
    }
    if (ref === 'WITHDRAWAL') {
      return {
        label: t('tx_withdrawal') || 'Rút Tiền Về Ngân Hàng',
        bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        icon: ArrowDownLeft,
      };
    }
    return {
      label: item.entryType === 'CREDIT' ? (t('tx_credit') || 'Tiền Vào') : (t('tx_debit') || 'Tiền Ra'),
      bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
      icon: Layers,
    };
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('agency_wallet_title') || 'Ví Doanh Thu & Sổ Cái Studio'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {walletData?.agencyName
                  ? `${walletData.agencyName} • ${t('agency_wallet_subtitle') || 'Minh bạch dòng tiền giữa Studio, Khách hàng và Thợ'}`
                  : (t('agency_wallet_subtitle') || 'Minh bạch dòng tiền')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchWallet(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? (t('syncing') || 'Đang đồng bộ...') : (t('reload') || 'Làm mới')}
          </Button>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {apiError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={() => fetchWallet()}
            className="underline text-xs font-semibold hover:text-rose-900 ml-4 shrink-0"
          >
            {t('retry') || 'Thử lại'}
          </button>
        </div>
      )}

      {/* STATS CARDS */}
      {isLoading ? (
        <StatsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Số dư khả dụng */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('stat_available_balance') || 'Số Dư Khả Dụng'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatVND(walletData?.availableBalance)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('stat_available_balance_desc') || 'Số dư khả dụng trong ví của Chủ Studio'}
            </p>
          </div>

          {/* Card 2: Cọc Escrow đang giữ */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('stat_pending_escrow') || 'Cọc Đang Giữ (Escrow)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
              {formatVND(walletData?.pendingEscrowAmount)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('stat_pending_escrow_desc') || 'Các ca hẹn đang thực hiện, chờ nghiệm thu'}
            </p>
          </div>

          {/* Card 3: Thu hồi do khiếu nại */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('stat_total_clawback') || 'Thu Hồi Do Khiếu Nại'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatVND(walletData?.totalClawback)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('stat_total_clawback_desc') || 'Tổng tiền đã hoàn trả cho khách qua khiếu nại'}
            </p>
          </div>

          {/* Card 4: Phụ cấp tăng ca đã chi */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('stat_total_overtime') || 'Phụ Cấp Tăng Ca Đã Chi'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              {formatVND(walletData?.totalOvertimePaid)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('stat_total_overtime_desc') || 'Tổng chi trả thêm giờ cho nhân viên Studio'}
            </p>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('wallet_search_placeholder') || 'Tìm theo mã đơn (MK-...), nội dung...'}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('filter_all_tx') || 'Tất Cả'}
          </button>
          <button
            onClick={() => setTypeFilter('CREDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              typeFilter === 'CREDIT'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            {t('filter_credit_tx') || 'Tiền Vào (+)'}
          </button>
          <button
            onClick={() => setTypeFilter('DEBIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              typeFilter === 'DEBIT'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            {t('filter_debit_tx') || 'Tiền Ra (-)'}
          </button>
          <button
            onClick={() => setTypeFilter('CLAWBACK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              typeFilter === 'CLAWBACK'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            {t('filter_clawback_tx') || 'Khiếu Nại'}
          </button>
          <button
            onClick={() => setTypeFilter('OVERTIME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              typeFilter === 'OVERTIME'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
            }`}
          >
            {t('filter_overtime_tx') || 'Tăng Ca'}
          </button>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('wallet_ledger_history_title') || 'Sổ Cái Biến Động Số Dư Studio'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredTransactions.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton
            columns={[
              { header: t('col_tx_time') || 'Thời Gian' },
              { header: t('col_tx_ref') || 'Mã Đơn / Bút Toán' },
              { header: t('col_tx_type') || 'Nghiệp Vụ' },
              { header: t('col_tx_desc') || 'Diễn Giải' },
              { header: t('col_tx_amount') || 'Biến Động', align: 'right' },
              { header: t('col_tx_balance_after') || 'Số Dư Sau GD', align: 'right' },
            ]}
            rows={5}
            hasPagination={false}
          />
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('wallet_ledger_empty_title') || 'Chưa có giao dịch biến động nào'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {t('wallet_ledger_empty_desc') || 'Khi Studio quyết toán đơn hàng, phát sinh thu hồi khiếu nại hoặc chi trả tăng ca, lịch sử sẽ tự động ghi sổ tại đây.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="py-3.5 px-4 sm:px-6 whitespace-nowrap">{t('col_tx_time') || 'Thời Gian'}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_tx_ref') || 'Mã Đơn / Bút Toán'}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_tx_type') || 'Nghiệp Vụ'}</th>
                  <th className="py-3.5 px-4 min-w-[240px] whitespace-nowrap">{t('col_tx_desc') || 'Diễn Giải'}</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">{t('col_tx_amount') || 'Biến Động'}</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">{t('col_tx_balance_after') || 'Số Dư Sau GD'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTransactions.map((tx) => {
                  const badge = getTxBadge(tx);
                  const isCredit = tx.entryType === 'CREDIT';
                  const dateStr = tx.createdAt
                    ? new Date(tx.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '---';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Thời gian */}
                      <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </div>
                      </td>

                      {/* Mã đơn */}
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {tx.bookingCode ? (
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-emerald-700 dark:text-emerald-400">
                            #{tx.bookingCode}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">#BT-{tx.id}</span>
                        )}
                      </td>

                      {/* Nghiệp vụ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}
                        >
                          <badge.icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Diễn giải */}
                      <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {tx.description || t('tx_default_desc') || 'Giao dịch biến động số dư hệ thống'}
                      </td>

                      {/* Biến động */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`text-sm font-extrabold ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatVND(tx.amount)}
                        </span>
                      </td>

                      {/* Số dư sau GD */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap text-xs font-bold text-slate-900 dark:text-slate-200">
                        {formatVND(tx.balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
