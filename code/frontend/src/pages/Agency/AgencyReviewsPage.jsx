import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquareQuote,
  CheckCircle2,
  Clock,
  Filter,
  User,
  RotateCw,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { Toast } from '../../components/base/Toast';
import { AgencyReviewReplyModal } from '../../components/features/agency/AgencyReviewReplyModal';
import { useI18nStore } from '../../store/useI18nStore';
import { formatBookingDateTime } from '../../utils/formatters';
import { parseApiError } from '../../utils/error';

export const AgencyReviewsPage = () => {
  const { t } = useI18nStore();

  // State Dữ liệu
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    csatPercentage: 0,
    pendingReplyCount: 0,
    starCounts: {},
  });
  const [reviews, setReviews] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedHasReply, setSelectedHasReply] = useState('');

  // Reply Modal & Toast
  const [activeReviewForReply, setActiveReviewForReply] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Tải danh sách thợ active để làm bộ lọc
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await agencyService.getStaffList('ACTIVE');
        const staffData = res?.data || res || [];
        setStaffList(Array.isArray(staffData) ? staffData : []);
      } catch (err) {
        console.error('Failed to load active staff for review filter:', err);
      }
    };
    fetchStaff();
  }, []);

  // 2. Tải thống kê KPI
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await agencyService.getAgencyReviewSummary();
      const data = res?.data || res;
      if (data) {
        setSummary({
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
          csatPercentage: data.csatPercentage || 0,
          pendingReplyCount: data.pendingReplyCount || 0,
          starCounts: data.starCounts || {},
        });
      }
    } catch (err) {
      console.error('Failed to fetch agency review summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // 3. Tải danh sách reviews theo filter & pagination
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
      };
      if (selectedStaffId) params.staffId = selectedStaffId;
      if (selectedRating) params.rating = Number(selectedRating);
      if (selectedHasReply === 'true') params.hasReply = true;
      if (selectedHasReply === 'false') params.hasReply = false;

      const res = await agencyService.getAgencyReviews(params);
      const data = res?.data || res;

      if (data) {
        setReviews(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      const parsed = parseApiError(err);
      setToastMessage(parsed.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedStaffId, selectedRating, selectedHasReply, t]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleResetFilters = () => {
    setSelectedStaffId('');
    setSelectedRating('');
    setSelectedHasReply('');
    setCurrentPage(0);
  };

  const handleReplySuccess = () => {
    setToastMessage(t('reviews_reply_success'));
    fetchReviews();
    fetchSummary();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/20">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('reviews_page_title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('reviews_page_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchSummary();
            fetchReviews();
          }}
          className="self-start md:self-auto gap-2"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* 4 Thẻ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Điểm Đánh Giá TB */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('reviews_kpi_avg_rating')}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary.averageRating ? summary.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-xs font-medium text-slate-400">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${
                    s <= Math.round(summary.averageRating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="ml-1 text-slate-500 dark:text-slate-400">
              ({summary.totalReviews} {t('reviews_kpi_total_reviews').toLowerCase()})
            </span>
          </div>
        </div>

        {/* KPI 2: Tổng số đánh giá */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('reviews_kpi_total_reviews')}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {summary.totalReviews}
            </span>
            <span className="text-xs font-medium text-slate-400">lượt</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Phản hồi thực tế từ khách đã hoàn thành ca
          </p>
        </div>

        {/* KPI 3: Tỷ Lệ CSAT */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('reviews_kpi_csat_rate')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {summary.csatPercentage ? summary.csatPercentage.toFixed(1) : '100'}%
            </span>
            <span className="text-xs font-medium text-emerald-500">tích cực</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Tỷ lệ đánh giá 4 sao và 5 sao từ khách hàng
          </p>
        </div>

        {/* KPI 4: Chờ Phản Hồi */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('reviews_kpi_pending_reply')}
            </span>
            <div
              className={`p-2 rounded-xl ${
                summary.pendingReplyCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tracking-tight ${
                summary.pendingReplyCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {summary.pendingReplyCount}
            </span>
            <span className="text-xs font-medium text-slate-400">cần trả lời</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Khách hàng mong nhận được sự tri ân từ Studio
          </p>
        </div>
      </div>

      {/* Thanh Bộ Lọc */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('filter')}:</span>
            </div>

            {/* Filter 1: Thợ */}
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">{t('reviews_filter_all_staff')}</option>
              {staffList.map((st) => (
                <option key={st.staffId || st.id} value={st.staffId || st.id}>
                  {st.fullName || st.staffName || st.staffCode}
                </option>
              ))}
            </select>

            {/* Filter 2: Số sao */}
            <select
              value={selectedRating}
              onChange={(e) => {
                setSelectedRating(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">{t('reviews_filter_all_ratings')}</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
              <option value="4">⭐⭐⭐⭐ (4 sao)</option>
              <option value="3">⭐⭐⭐ (3 sao)</option>
              <option value="2">⭐⭐ (2 sao)</option>
              <option value="1">⭐ (1 sao)</option>
            </select>

            {/* Filter 3: Trạng thái phản hồi */}
            <select
              value={selectedHasReply}
              onChange={(e) => {
                setSelectedHasReply(e.target.value);
                setCurrentPage(0);
              }}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">{t('reviews_filter_all_status')}</option>
              <option value="false">{t('reviews_filter_pending_reply')}</option>
              <option value="true">{t('reviews_filter_replied')}</option>
            </select>
          </div>

          {(selectedStaffId || selectedRating || selectedHasReply) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium self-end lg:self-auto"
            >
              {t('clear_filter')}
            </button>
          )}
        </div>
      </div>

      {/* Danh Sách Reviews */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="w-3/4 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t('reviews_empty_title')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {t('reviews_empty_desc')}
          </p>
          {(selectedStaffId || selectedRating || selectedHasReply) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4"
            >
              {t('clear_filter')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.reviewId}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
            >
              {/* Header của Review: Khách hàng + Điểm sao + Thợ */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  {/* Customer Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                    {rev.customerAvatar ? (
                      <img
                        src={rev.customerAvatar}
                        alt={rev.customerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (rev.customerName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {rev.customerName || 'Khách hàng'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        #{rev.bookingCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>{rev.createdAt ? formatBookingDateTime(rev.createdAt) : ''}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <User className="w-3 h-3 text-rose-500" />
                        {t('reviews_staff_label')}:{' '}
                        <strong className="font-semibold text-slate-800 dark:text-slate-200">
                          {rev.staffName || 'Studio Staff'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stars Badge */}
                <div className="flex items-center gap-1 self-start sm:self-auto bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= (rev.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                    {rev.rating}.0
                  </span>
                </div>
              </div>

              {/* Comment Content */}
              <div className="pl-0 sm:pl-[52px]">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {rev.comment || (
                    <span className="italic text-slate-400">{t('no_comment')}</span>
                  )}
                </p>

                {/* Photos if any */}
                {Array.isArray(rev.photoUrls) && rev.photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {rev.photoUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={url}
                          alt="Review attachment"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Studio Response Section */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {rev.agencyReply ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t('reviews_agency_replied_badge')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {rev.agencyRepliedAt
                              ? formatBookingDateTime(rev.agencyRepliedAt)
                              : ''}
                          </span>
                          <button
                            onClick={() => setActiveReviewForReply(rev)}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
                          >
                            {t('reviews_btn_edit_reply')}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        "{rev.agencyReply}"
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        ⏳ Chưa có phản hồi từ Studio
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveReviewForReply(rev)}
                        className="text-xs gap-1.5 py-1 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {t('reviews_btn_reply')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị trang {currentPage + 1} / {totalPages} (Tổng {totalElements} đánh giá)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="gap-1 px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="gap-1 px-2.5"
                >
                  Tiếp
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Phản hồi Review */}
      <AgencyReviewReplyModal
        isOpen={Boolean(activeReviewForReply)}
        onClose={() => setActiveReviewForReply(null)}
        review={activeReviewForReply}
        onSuccess={handleReplySuccess}
      />
    </div>
  );
};
