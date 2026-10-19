import React, { useEffect, useState, useMemo } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Eye,
  X,
  User,
  Sparkles,
  Camera,
  Calendar,
  Phone,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { Modal } from '../../components/base/Modal';
import { Toast } from '../../components/base/Toast';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';
import { formatDate } from '../../utils/formatters';

export const AgencyReviewsPage = () => {
  const { t } = useI18nStore();

  const [reviews, setReviews] = useState([]);
  const [overview, setOverview] = useState({
    averageRating: 5.0,
    totalReviews: 0,
    count5Star: 0,
    count4Star: 0,
    count3Star: 0,
    count2Star: 0,
    count1Star: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState(null);

  // Pagination
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const fetchOverview = async () => {
    setIsOverviewLoading(true);
    try {
      const res = await agencyService.getAgencyReviewOverview();
      const data = res?.data || res || {};
      setOverview({
        averageRating: Number(data.averageRating ?? 5.0),
        totalReviews: Number(data.totalReviews ?? 0),
        count5Star: Number(data.count5Star ?? 0),
        count4Star: Number(data.count4Star ?? 0),
        count3Star: Number(data.count3Star ?? 0),
        count2Star: Number(data.count2Star ?? 0),
        count1Star: Number(data.count1Star ?? 0),
      });
    } catch (err) {
      // Non-blocking for overview
      console.error('Failed to load review overview:', err);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const fetchReviews = async (page = 0, size = pageInfo.size) => {
    setIsLoading(true);
    setApiError('');
    try {
      const ratingParam = selectedRating === 'ALL' ? undefined : Number(selectedRating);
      const res = await agencyService.getAgencyReviews({
        rating: ratingParam,
        keyword: searchQuery.trim() || undefined,
        page,
        size,
      });

      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setReviews(data);
        setPageInfo({
          page: 0,
          size: data.length,
          totalElements: data.length,
          totalPages: 1,
        });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setReviews(data.content || []);
        setPageInfo({
          page: data.page ?? data.number ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchReviews(0, pageInfo.size);
  }, [selectedRating, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(keyword);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < pageInfo.totalPages) {
      fetchReviews(newPage, pageInfo.size);
    }
  };

  const handlePageSizeChange = (newSize) => {
    savePageSize(newSize);
    setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
    fetchReviews(0, newSize);
  };

  // Render Stars Component
  const renderStarRating = (rating) => {
    const score = Number(rating || 5);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            className={
              i <= score
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 dark:fill-slate-800 text-slate-300 dark:text-slate-700'
            }
          />
        ))}
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-1">
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  // Star breakdown calculation
  const starBars = useMemo(() => {
    const total = overview.totalReviews || 1;
    return [
      { stars: 5, count: overview.count5Star, pct: Math.round((overview.count5Star / total) * 100) },
      { stars: 4, count: overview.count4Star, pct: Math.round((overview.count4Star / total) * 100) },
      { stars: 3, count: overview.count3Star, pct: Math.round((overview.count3Star / total) * 100) },
      { stars: 2, count: overview.count2Star, pct: Math.round((overview.count2Star / total) * 100) },
      { stars: 1, count: overview.count1Star, pct: Math.round((overview.count1Star / total) * 100) },
    ];
  }, [overview]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>{t('agency_reviews_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('agency_reviews_subtitle')}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => {
            fetchOverview();
            fetchReviews(pageInfo.page, pageInfo.size);
          }}
          disabled={isLoading || isOverviewLoading}
          className="text-xs font-semibold self-start sm:self-auto"
        >
          {t('reload')}
        </Button>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating Score Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-5">
          <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {overview.averageRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={10}
                  className={
                    i <= Math.round(overview.averageRating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'fill-slate-200 text-slate-300'
                  }
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">/ 5.0</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              {t('agency_reviews_stat_avg')}
            </span>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              {overview.averageRating >= 4.8
                ? t('agency_reviews_tier_excellent')
                : overview.averageRating >= 4.0
                ? t('agency_reviews_tier_very_good')
                : t('agency_reviews_tier_need_improvement')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t('agency_reviews_based_on_count', { count: overview.totalReviews })}
            </p>
          </div>
        </div>

        {/* Total Reviews Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              {t('agency_reviews_stat_total')}
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {overview.totalReviews}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> {t('agency_reviews_completion_rate_hint')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Sparkles size={20} />
          </div>
        </div>

        {/* Star Breakdown Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-center space-y-1.5">
          {starBars.map((item) => (
            <button
              key={item.stars}
              type="button"
              onClick={() => setSelectedRating(String(item.stars))}
              className="flex items-center gap-2 text-xs group hover:opacity-80 transition-opacity w-full text-left"
            >
              <span className="w-10 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                {item.stars} <Star size={10} className="fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-[11px] text-slate-400">
                {item.count} ({item.pct}%)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Star Rating Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: t('agency_reviews_filter_all') },
            { id: '5', label: '5 ★' },
            { id: '4', label: '4 ★' },
            { id: '3', label: '3 ★' },
            { id: '2', label: '2 ★' },
            { id: '1', label: '1 ★' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRating(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedRating === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('agency_reviews_search_placeholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="p-2 flex items-center justify-center shrink-0"
            title={t('search')}
          >
            <Search size={14} />
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setKeyword('');
                setSearchQuery('');
              }}
              className="p-2 flex items-center justify-center shrink-0"
              title={t('clear_search')}
            >
              <X size={14} />
            </Button>
          )}
        </form>
      </div>

      {/* Review List */}
      {isLoading ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">{t('loading')}</p>
        </div>
      ) : apiError ? (
        <div className="p-6 text-center bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{apiError}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchReviews(pageInfo.page, pageInfo.size)}
            className="mt-3 text-xs"
          >
            {t('retry')}
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Star className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
            {t('agency_reviews_empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const hasCustomerImages = Array.isArray(rev.imageUrls) && rev.imageUrls.length > 0;
            const hasCompletionPhoto = Boolean(rev.completionPhotoUrl);

            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-4"
              >
                {/* Header: Booking Info & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      #{rev.bookingCode || rev.bookingId || rev.id}
                    </span>

                    {rev.packageName && (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {rev.packageName}
                      </span>
                    )}

                    {rev.styleName && rev.styleName !== rev.packageName && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                        {rev.styleName}
                      </span>
                    )}

                    {rev.categoryName && (
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        • {rev.categoryName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {renderStarRating(rev.rating)}
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar size={12} />
                      {formatDate(rev.createdAt || rev.bookingDate)}
                    </span>
                  </div>
                </div>

                {/* Details Row: Customer & Staff in Charge */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {/* Customer Block */}
                  <div className="flex items-start gap-3">
                    {rev.customerAvatar ? (
                      <img
                        src={rev.customerAvatar}
                        alt={rev.customerName || 'Customer'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(rev.customerName || 'K').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {t('agency_reviews_customer_info')}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {rev.customerName || t('customer_label')}
                      </p>
                      {rev.customerPhone && (
                        <p className="text-slate-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {rev.customerPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Staff in Charge Block (Thợ chính & Thợ phụ) */}
                  <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {t('agency_reviews_staff_in_charge')}
                    </span>

                    {/* Thợ chính */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex-shrink-0">
                        {t('agency_reviews_primary_staff')}
                      </span>
                      {rev.primaryStaff ? (
                        <div className="flex items-center gap-1.5">
                          {rev.primaryStaff.avatarUrl ? (
                            <img
                              src={rev.primaryStaff.avatarUrl}
                              alt={rev.primaryStaff.name}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold">
                              {(rev.primaryStaff.name || 'M').charAt(0)}
                            </div>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {rev.primaryStaff.name}
                          </span>
                          {rev.primaryStaff.phone && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              ({rev.primaryStaff.phone})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">{t('agency_reviews_studio_primary_fallback')}</span>
                      )}
                    </div>

                    {/* Thợ phụ */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 flex-shrink-0">
                        {t('agency_reviews_assistant_staff')}
                      </span>
                      {Array.isArray(rev.assistantStaff) && rev.assistantStaff.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {rev.assistantStaff.map((as, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              {as.avatarUrl ? (
                                <img
                                  src={as.avatarUrl}
                                  alt={as.name}
                                  className="w-5 h-5 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold">
                                  {(as.name || 'P').charAt(0)}
                                </div>
                              )}
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {as.name}
                              </span>
                              {as.phone && (
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ({as.phone})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {t('agency_reviews_no_assistant')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                {rev.comment ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-3 border-amber-400 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    "{rev.comment}"
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {t('agency_reviews_no_comment')}
                  </p>
                )}

                {/* Clear Images Section */}
                {(hasCustomerImages || hasCompletionPhoto) && (
                  <div className="pt-2 space-y-3">
                    {/* Customer Feedback Photos */}
                    {hasCustomerImages && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                          <Camera size={13} className="text-slate-500" />
                          {t('agency_reviews_feedback_photos')}
                          <span className="text-slate-400 font-normal">
                            ({rev.imageUrls.length} {t('photos_unit')})
                          </span>
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {rev.imageUrls.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: imgUrl,
                                  title: t('agency_reviews_customer_photo_title', {
                                    index: imgIdx + 1,
                                    code: rev.bookingCode,
                                  }),
                                })
                              }
                              className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer shadow-2xs"
                              title={t('agency_reviews_view_original')}
                            >
                              <img
                                src={imgUrl}
                                alt={`Customer review ${imgIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye size={16} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MUA Completion Proof Photo */}
                    {hasCompletionPhoto && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          {t('agency_reviews_completion_photo')}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: rev.completionPhotoUrl,
                                title: t('agency_reviews_staff_photo_title', { code: rev.bookingCode }),
                              })
                            }
                            className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-emerald-500/50 bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer shadow-2xs"
                            title={t('agency_reviews_view_completion_photo')}
                          >
                            <img
                              src={rev.completionPhotoUrl}
                              alt="Staff completion proof"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye size={16} />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-emerald-600 text-white px-1 rounded">
                              ✓ MUA
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && reviews.length > 0 && (
        <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
          <div className="text-slate-500 dark:text-slate-400">
            {t('agency_reviews_pagination_summary', {
              current: reviews.length,
              total: pageInfo.totalElements,
              page: pageInfo.page + 1,
              totalPages: pageInfo.totalPages,
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageInfo.size}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value={10}>{t('per_page_unit', { size: 10 })}</option>
              <option value={20}>{t('per_page_unit', { size: 20 })}</option>
              <option value={50}>{t('per_page_unit', { size: 50 })}</option>
            </select>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pageInfo.page - 1)}
                disabled={pageInfo.page <= 0}
                className="px-2.5 py-1 text-xs"
              >
                {t('prev_page')}
              </Button>
              <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                {pageInfo.page + 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pageInfo.page + 1)}
                disabled={pageInfo.page >= pageInfo.totalPages - 1}
                className="px-2.5 py-1 text-xs"
              >
                {t('next_page')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <Modal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title={previewImage.title || t('view_photo')}
          maxWidth="max-w-3xl"
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={previewImage.url}
              alt="Preview"
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lg border border-slate-200 dark:border-slate-800"
            />
            <div className="mt-4 flex items-center justify-between w-full">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Eye size={14} /> {t('open_original_photo_tab')}
              </a>
              <Button size="sm" variant="secondary" onClick={() => setPreviewImage(null)}>
                {t('close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
