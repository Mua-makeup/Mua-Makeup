import React, { useEffect, useState, useMemo } from 'react';
import {
  Star,
  Search,
  RefreshCw,
  Eye,
  X,


  Camera,
  Calendar,
  Phone,
  CheckCircle2,
  SlidersHorizontal,
  MessageSquareQuote,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { Modal } from '../../components/base/Modal';
import { Toast } from '../../components/base/Toast';
import { AgencyReviewReplyModal } from '../../components/features/agency/AgencyReviewReplyModal';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';
import { formatDate } from '../../utils/formatters';
import { Skeleton, CardSkeleton } from '../../components/base/Skeleton';

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

  // Reply Modal
  const [activeReviewForReply, setActiveReviewForReply] = useState(null);

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
      } else if (data && Array.isArray(data.content)) {
        setReviews(data.content);
        setPageInfo({
          page: data.page ?? page,
          size: data.size ?? size,
          totalElements: data.totalElements ?? data.content.length,
          totalPages: data.totalPages ?? 1,
        });
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to load agency reviews:', err);
      setApiError(err?.response?.data?.message || err?.message || t('agency_reviews_fetch_error'));
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

  const handleResetFilters = () => {
    setSelectedRating('ALL');
    setKeyword('');
    setSearchQuery('');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < pageInfo.totalPages) {
      fetchReviews(newPage, pageInfo.size);
    }
  };

  const handlePageSizeChange = (newSize) => {
    savePageSize(newSize);
    setPageInfo((prev) => ({ ...prev, size: newSize }));
    fetchReviews(0, newSize);
  };

  const distribution = useMemo(() => {
    const total = overview.totalReviews || 1;
    return [
      { stars: 5, count: overview.count5Star, pct: Math.round((overview.count5Star / total) * 100) },
      { stars: 4, count: overview.count4Star, pct: Math.round((overview.count4Star / total) * 100) },
      { stars: 3, count: overview.count3Star, pct: Math.round((overview.count3Star / total) * 100) },
      { stars: 2, count: overview.count2Star, pct: Math.round((overview.count2Star / total) * 100) },
      { stars: 1, count: overview.count1Star, pct: Math.round((overview.count1Star / total) * 100) },
    ];
  }, [overview]);

  const renderStarRating = (rating) => {
    const num = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            className={
              s <= num
                ? 'text-amber-500 fill-amber-500'
                : 'text-slate-300 dark:text-slate-700'
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>{t('agency_reviews_title') || t('reviews_page_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('agency_reviews_subtitle') || t('reviews_page_subtitle')}
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Rating Score Card */}
        <div className="md:col-span-4 flex flex-col justify-center items-center p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            {t('agency_reviews_avg_score')}
          </span>
          {isOverviewLoading ? (
            <div className="flex flex-col items-center py-2 space-y-2">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          ) : (
            <>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                <span>{overview.averageRating.toFixed(1)}</span>
                <span className="text-lg font-normal text-slate-400">/ 5.0</span>
              </div>

              <div className="flex items-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={18}
                    className={
                      s <= Math.round(overview.averageRating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300 dark:text-slate-700'
                    }
                  />
                ))}
              </div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('agency_reviews_based_on', { count: overview.totalReviews })}
              </p>
            </>
          )}
        </div>

        {/* Rating Distribution Histogram */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2 py-1 px-2">
          {distribution.map((item) => (
            <button
              key={item.stars}
              type="button"
              onClick={() => setSelectedRating(String(item.stars))}
              className="flex items-center gap-3 text-xs group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded-md transition-colors w-full text-left"
            >
              <div className="flex items-center gap-1 w-12 font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                <span>{item.stars}</span>
                <Star size={12} className="text-amber-500 fill-amber-500" />
              </div>

              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%` }}
                />
              </div>

              <span className="w-16 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0">
                {item.count}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({item.pct}%)
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Star Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal size={13} /> {t('filter')}:
            </span>

            {[
              { id: 'ALL', label: t('all') },
              { id: '5', label: '5 ★' },
              { id: '4', label: '4 ★' },
              { id: '3', label: '3 ★' },
              { id: '2', label: '2 ★' },
              { id: '1', label: '1 ★' },
            ].map((f) => {
              const active = selectedRating === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedRating(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('agency_reviews_search_placeholder')}
                className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setSearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <Button size="sm" type="submit" className="text-xs">
              {t('search')}
            </Button>
          </form>
        </div>

        {/* Active Filter Indicators */}
        {(selectedRating !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span>{t('filter_active')}:</span>
              {selectedRating !== 'ALL' && (
                <Badge variant="warning">{selectedRating} ★</Badge>
              )}
              {searchQuery && (
                <Badge variant="neutral">"{searchQuery}"</Badge>
              )}
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
            >
              {t('clear_filter')}
            </button>
          </div>
        )}
      </div>

      {/* Review Cards List */}
      {isLoading ? (
        <CardSkeleton count={pageInfo.size || 3} />
      ) : apiError ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs">
          <p>{apiError}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchReviews(pageInfo.page, pageInfo.size)}
            className="mt-3"
          >
            {t('retry')}
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Star size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t('agency_reviews_empty_title')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {selectedRating !== 'ALL' || searchQuery
              ? t('agency_reviews_empty_filter_desc')
              : t('agency_reviews_empty_desc')}
          </p>
          {(selectedRating !== 'ALL' || searchQuery) && (
            <Button size="sm" variant="secondary" onClick={handleResetFilters} className="text-xs">
              {t('clear_filter')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const hasCustomerImages = Array.isArray(rev.imageUrls) && rev.imageUrls.length > 0;
            const hasCompletionPhoto = Boolean(rev.completionPhotoUrl);

            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
              >
                {/* Header: Booking Info & Stars */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded">
                      #{rev.bookingCode || t('booking_code_fallback')}
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
                        alt={rev.customerName || t('customer_label')}
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
                              alt={t('agency_reviews_completion_photo')}
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

                {/* Studio Response Section */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {rev.agencyReply ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                          <span>{t('reviews_agency_replied_badge') || 'Studio đã phản hồi'}</span>
                        </div>
                        <button
                          onClick={() =>
                            setActiveReviewForReply({
                              reviewId: rev.id,
                              bookingCode: rev.bookingCode,
                              customerName: rev.customerName,
                              rating: rev.rating,
                              comment: rev.comment,
                              staffName: rev.primaryStaff?.name,
                              agencyReply: rev.agencyReply,
                              createdAt: rev.createdAt,
                            })
                          }
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
                        >
                          {t('reviews_btn_edit_reply') || 'Sửa Phản Hồi'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        "{rev.agencyReply}"
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {t('reviews_filter_pending_reply') || 'Chưa có phản hồi từ Studio'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setActiveReviewForReply({
                            reviewId: rev.id,
                            bookingCode: rev.bookingCode,
                            customerName: rev.customerName,
                            rating: rev.rating,
                            comment: rev.comment,
                            staffName: rev.primaryStaff?.name,
                            agencyReply: rev.agencyReply,
                            createdAt: rev.createdAt,
                          })
                        }
                        className="text-xs gap-1.5 py-1 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <MessageSquareQuote className="w-3.5 h-3.5" />
                        {t('reviews_btn_reply') || 'Phản Hồi'}
                      </Button>
                    </div>
                  )}
                </div>
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
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              {[5, 10, 20, 50].map((s) => (
                <option key={s} value={s}>
                  {s} / {t('page')}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="outline"
              disabled={pageInfo.page <= 0}
              onClick={() => handlePageChange(pageInfo.page - 1)}
              className="text-xs"
            >
              {t('prev')}
            </Button>

            <span className="text-xs font-semibold px-2">
              {pageInfo.page + 1} / {pageInfo.totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={pageInfo.page >= pageInfo.totalPages - 1}
              onClick={() => handlePageChange(pageInfo.page + 1)}
              className="text-xs"
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <Modal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title={previewImage.title || t('image_preview')}
          maxWidth="max-w-3xl"
        >
          <div className="flex flex-col items-center">
            <div className="max-h-[70vh] overflow-hidden rounded-lg">
              <img
                src={previewImage.url}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
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

      {/* Modal Phản Hồi Review từ Studio */}
      <AgencyReviewReplyModal
        isOpen={Boolean(activeReviewForReply)}
        onClose={() => setActiveReviewForReply(null)}
        review={activeReviewForReply}
        onSuccess={() => {
          setToastMessage(t('reviews_reply_success') || 'Đã gửi phản hồi đánh giá thành công!');
          fetchOverview();
          fetchReviews(pageInfo.page, pageInfo.size);
        }}
      />
    </div>
  );
};
