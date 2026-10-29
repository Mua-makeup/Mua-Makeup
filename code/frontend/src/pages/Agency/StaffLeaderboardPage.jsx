import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Medal,
  Star,

  TrendingUp,
  User,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Calendar,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { useI18nStore } from '../../store/useI18nStore';
import { parseApiError } from '../../utils/error';
import { Skeleton, SkeletonCircle, TableSkeleton } from '../../components/base/Skeleton';

export const StaffLeaderboardPage = () => {
  const { t } = useI18nStore();
  const navigate = useNavigate();

  const [period, setPeriod] = useState('ALL_TIME'); // 'ALL_TIME' | 'THIS_MONTH' | 'LAST_MONTH'
  const [data, setData] = useState({
    period: 'ALL_TIME',
    totalStaff: 0,
    agencyAverageRating: 5.0,
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await agencyService.getStaffLeaderboard(period);
      const resData = res?.data || res;
      if (resData) {
        setData({
          period: resData.period || period,
          totalStaff: resData.totalStaff || 0,
          agencyAverageRating: resData.agencyAverageRating || 5.0,
          items: Array.isArray(resData.items) ? resData.items : [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch staff leaderboard:', err);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const top1 = data.items.length > 0 ? data.items[0] : null;
  const top2 = data.items.length > 1 ? data.items[1] : null;
  const top3 = data.items.length > 2 ? data.items[2] : null;

  const renderBadge = (badgeCode, labelKey) => {
    switch (badgeCode) {
      case 'CHAMPION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            {t(labelKey) || 'Quán Quân'}
          </span>
        );
      case 'RUNNER_UP_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            {t(labelKey) || 'Á Quân 1'}
          </span>
        );
      case 'RUNNER_UP_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            {t(labelKey) || 'Á Quân 2'}
          </span>
        );
      case 'SUPER_STAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {t(labelKey) || 'Ngôi Sao Studio'}
          </span>
        );
      case 'RELIABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {t(labelKey) || 'Chắc Tay & Ổn Định'}
          </span>
        );
      case 'NEED_IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            {t(labelKey) || 'Cần Cải Thiện'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {t(labelKey) || 'Thợ Mới'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Bộ chọn Period */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('leaderboard_page_title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('leaderboard_page_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Period Filter Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setPeriod('ALL_TIME')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'ALL_TIME'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('leaderboard_period_all_time')}
            </button>
            <button
              onClick={() => setPeriod('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'THIS_MONTH'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('leaderboard_period_this_month')}
            </button>
            <button
              onClick={() => setPeriod('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'LAST_MONTH'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('leaderboard_period_last_month')}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            className="gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Top 3 Bục Vinh Danh (The Podium) */}
      {isLoading ? (
        <div className="relative pt-6 pb-6 px-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="text-center mb-6">
            <Skeleton className="h-6 w-44 rounded-full mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
            {/* Rank 2 Skeleton */}
            <div className="order-2 md:order-1 flex flex-col items-center space-y-3">
              <SkeletonCircle size="w-16 h-16" />
              <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Skeleton className="h-4 w-28 rounded mx-auto" />
                <Skeleton className="h-3 w-16 rounded mx-auto" />
                <Skeleton className="h-4 w-20 rounded mx-auto" />
              </div>
            </div>
            {/* Rank 1 Skeleton */}
            <div className="order-1 md:order-2 flex flex-col items-center space-y-3">
              <SkeletonCircle size="w-20 h-20" />
              <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-sm">
                <Skeleton className="h-5 w-32 rounded mx-auto" />
                <Skeleton className="h-3.5 w-20 rounded mx-auto" />
                <Skeleton className="h-5 w-24 rounded mx-auto" />
              </div>
            </div>
            {/* Rank 3 Skeleton */}
            <div className="order-3 flex flex-col items-center space-y-3">
              <SkeletonCircle size="w-16 h-16" />
              <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Skeleton className="h-4 w-28 rounded mx-auto" />
                <Skeleton className="h-3 w-16 rounded mx-auto" />
                <Skeleton className="h-4 w-20 rounded mx-auto" />
              </div>
            </div>
          </div>
        </div>
      ) : data.items.length > 0 && (
        <div className="relative pt-6 pb-2 px-4 rounded-3xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/80 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/10 dark:bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80">
              {t('leaderboard_top_badge')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
            {/* Rank 2 (Á Quân 1 - Trái) */}
            {top2 ? (
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-slate-300 to-slate-400 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
                      {top2.avatarUrl ? (
                        <img
                          src={top2.avatarUrl}
                          alt={top2.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (top2.fullName || '2').charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-black text-xs shadow-md border border-white dark:border-slate-800">
                    #2
                  </div>
                </div>

                <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {top2.fullName}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {top2.staffCode}
                  </span>
                  <div className={`mt-2 flex items-center justify-center gap-1 font-bold text-sm ${top2.averageRating != null && top2.totalReviews > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Star className={`w-4 h-4 ${top2.averageRating != null && top2.totalReviews > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span>{top2.averageRating != null && top2.totalReviews > 0 ? top2.averageRating.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex justify-around">
                    <span>{top2.completedJobs} {t('leaderboard_jobs_unit')}</span>
                    <span>•</span>
                    <span>{top2.fiveStarRate.toFixed(0)}% 5★</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-2 md:order-1" />
            )}

            {/* Rank 1 (Quán Quân - Giữa - Bục Cao Nhất) */}
            {top1 ? (
              <div className="order-1 md:order-2 flex flex-col items-center -mt-4">
                <div className="relative mb-3 pt-9">
                  <Crown className="w-8 h-8 text-amber-500 absolute top-0.5 left-1/2 -translate-x-1/2" />
                  <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-xl shadow-amber-500/30">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-base text-amber-700 dark:text-amber-300">
                      {top1.avatarUrl ? (
                        <img
                          src={top1.avatarUrl}
                          alt={top1.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (top1.fullName || '1').charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs shadow-md border-2 border-white dark:border-slate-900">
                    #1
                  </div>
                </div>

                <div className="w-full p-5 rounded-2xl bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-800/90 border-2 border-amber-300/80 dark:border-amber-600/60 text-center shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {t('leaderboard_rank_gold')}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate mt-0.5">
                    {top1.fullName}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {top1.staffCode}
                  </span>
                  <div className={`mt-2.5 flex items-center justify-center gap-1.5 font-black text-base ${top1.averageRating != null && top1.totalReviews > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Star className={`w-5 h-5 ${top1.averageRating != null && top1.totalReviews > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span>{top1.averageRating != null && top1.totalReviews > 0 ? top1.averageRating.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/60 text-xs text-slate-600 dark:text-slate-300 flex justify-around font-medium">
                    <span>
                      <strong className="text-slate-900 dark:text-white font-bold">{top1.completedJobs}</strong> {t('leaderboard_jobs_unit')}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{top1.fiveStarRate.toFixed(0)}%</strong> 5★
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Rank 3 (Á Quân 2 - Phải) */}
            {top3 ? (
              <div className="order-3 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-amber-600 to-amber-700 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-amber-900 dark:text-amber-200">
                      {top3.avatarUrl ? (
                        <img
                          src={top3.avatarUrl}
                          alt={top3.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (top3.fullName || '3').charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-700 text-white font-black text-xs shadow-md border border-white dark:border-slate-800">
                    #3
                  </div>
                </div>

                <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {top3.fullName}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {top3.staffCode}
                  </span>
                  <div className={`mt-2 flex items-center justify-center gap-1 font-bold text-sm ${top3.averageRating != null && top3.totalReviews > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Star className={`w-4 h-4 ${top3.averageRating != null && top3.totalReviews > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span>{top3.averageRating != null && top3.totalReviews > 0 ? top3.averageRating.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex justify-around">
                    <span>{top3.completedJobs} {t('leaderboard_jobs_unit')}</span>
                    <span>•</span>
                    <span>{top3.fiveStarRate.toFixed(0)}% 5★</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden md:block order-3" />
            )}
          </div>
        </div>
      )}

      {/* Bảng Chi Tiết Toàn Bộ Nhân Sự */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('leaderboard_summary_table_title', { count: data.items.length })}
            </h2>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t('leaderboard_agency_avg_score')}: <strong className="text-amber-500 font-bold">{data.agencyAverageRating.toFixed(1)} / 5.0</strong>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton
            columns={[
              { header: t('leaderboard_col_rank'), align: 'center' },
              { header: t('leaderboard_col_staff') },
              { header: t('leaderboard_col_rating') },
              { header: t('leaderboard_col_five_star_rate') },
              { header: t('leaderboard_col_completed_jobs'), align: 'center' },
              { header: t('leaderboard_col_total_reviews'), align: 'center' },
              { header: t('leaderboard_col_status') },
              { header: t('leaderboard_col_actions'), align: 'right' },
            ]}
            rows={5}
            hasPagination={false}
          />
        ) : data.items.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {t('leaderboard_empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                  <th className="py-3 px-4 w-14 text-center">{t('leaderboard_col_rank')}</th>
                  <th className="py-3 px-4">{t('leaderboard_col_staff')}</th>
                  <th className="py-3 px-4">{t('leaderboard_col_rating')}</th>
                  <th className="py-3 px-4">{t('leaderboard_col_five_star_rate')}</th>
                  <th className="py-3 px-4 text-center">{t('leaderboard_col_completed_jobs')}</th>
                  <th className="py-3 px-4 text-center">{t('leaderboard_col_total_reviews')}</th>
                  <th className="py-3 px-4">{t('leaderboard_col_status')}</th>
                  <th className="py-3 px-4 text-right">{t('leaderboard_col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((item) => (
                  <tr
                    key={item.staffId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {item.rank === 1 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-white font-black flex items-center justify-center mx-auto shadow-sm">
                          1
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-bold flex items-center justify-center mx-auto">
                          2
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center mx-auto">
                          3
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-500 font-mono">
                          #{item.rank}
                        </span>
                      )}
                    </td>

                    {/* Staff Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 font-bold text-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (item.fullName || 'S').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.staffCode} {item.phone ? `• ${item.phone}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Avg Rating */}
                    <td className="py-3.5 px-4">
                      <div className={`flex items-center gap-1 font-bold ${item.averageRating != null && item.totalReviews > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        <Star className={`w-4 h-4 ${item.averageRating != null && item.totalReviews > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                        <span>{item.averageRating != null && item.totalReviews > 0 ? item.averageRating.toFixed(1) : 'N/A'}</span>
                      </div>
                    </td>

                    {/* 5-Star Rate Progress */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.fiveStarRate.toFixed(0)}%
                        </span>
                        <span className="text-slate-400">
                          {item.fiveStarCount}/{item.totalReviews}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, item.fiveStarRate)}%` }}
                        />
                      </div>
                    </td>

                    {/* Completed Jobs */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                      {item.completedJobs}
                    </td>

                    {/* Total Reviews */}
                    <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">
                      {item.totalReviews}
                    </td>

                    {/* Badge */}
                    <td className="py-3.5 px-4">
                      {renderBadge(item.performanceBadge, item.badgeLabel)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/agency/staff/${item.staffId}`)}
                        className="p-1.5 h-auto text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                        title={t('leaderboard_view_staff_profile')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
