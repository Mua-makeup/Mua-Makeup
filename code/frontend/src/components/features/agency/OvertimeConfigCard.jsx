import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Badge } from '../../base/Badge';
import { Modal } from '../../base/Modal';
import { Textarea } from '../../base/Textarea';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { overtimeRuleSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const OvertimeConfigCard = () => {
  const { t } = useI18nStore();
  const [ratePerHour, setRatePerHour] = useState(100000);
  const [maxOvertimeHours, setMaxOvertimeHours] = useState(4);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setApiError(null);
    try {
      // Load rules
      const rulesRes = await agencyService.getOvertimeRules().catch(() => null);
      const rules = rulesRes?.data || rulesRes || [];
      if (Array.isArray(rules) && rules.length > 0) {
        if (rules[0].ratePerHour) setRatePerHour(rules[0].ratePerHour);
        if (rules[0].maxOvertimeHours) setMaxOvertimeHours(rules[0].maxOvertimeHours);
      }

      // Load reports
      const reportsRes = await agencyService.getOvertimeReports().catch((err) => {
        setApiError(err.message || t('error_api_connection'));
        return null;
      });
      const repList =
        reportsRes?.data?.content ||
        reportsRes?.data ||
        reportsRes?.content ||
        reportsRes ||
        [];
      setReports(Array.isArray(repList) ? repList : []);
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = overtimeRuleSchema.safeParse({
      ratePerHour: Number(ratePerHour),
      maxOvertimeHours: Number(maxOvertimeHours),
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      await agencyService.createOrUpdateOvertimeRule({
        ratePerHour: Number(ratePerHour),
        maxOvertimeHours: Number(maxOvertimeHours),
      });
      setSuccess('Đã cập nhật quy tắc phụ phí tăng ca thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu quy tắc tăng ca');
    } finally {
      setIsLoading(false);
    }
  };

  const openReview = (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewNote('');
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      await agencyService.reviewOvertimeReport(selectedReport.id, {
        status: reviewAction,
        reviewNote: reviewNote.trim() || undefined,
      });
      setIsReviewModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Lỗi khi duyệt báo cáo tăng ca');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {t('error_api_connection')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Thử Lại
          </Button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Cấu hình Quy tắc Overtime */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Quy Tắc Phụ Phí Làm Thêm Giờ (Overtime Rules)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Định mức phụ phí tính cho thợ khi ca make-up bị kéo dài do yêu cầu phát sinh từ khách hàng
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input
            label="Đơn giá làm thêm (VNĐ / giờ)"
            type="number"
            min="10000"
            step="10000"
            required
            value={ratePerHour}
            onChange={(e) => setRatePerHour(e.target.value)}
            helperText="VD: 100.000 đ cho mỗi 60 phút phát sinh"
          />

          <Input
            label="Giới hạn tối đa (giờ / ngày)"
            type="number"
            min="1"
            max="12"
            required
            value={maxOvertimeHours}
            onChange={(e) => setMaxOvertimeHours(e.target.value)}
            helperText="Tối đa giờ được tính tăng ca mỗi ca làm"
          />

          <div>
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Lưu Quy Tắc Tăng Ca
            </Button>
          </div>
        </form>
      </div>

      {/* Bảng Xét Duyệt Báo Cáo Overtime Từ Thợ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Báo Cáo Tăng Ca Chờ Xét Duyệt ({reports.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thợ gửi báo cáo tăng ca sau khi hoàn thành đơn; Studio duyệt để giải ngân phụ thu
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-3">Thợ Báo Cáo</th>
                <th className="px-5 py-3">Mã Đơn / Thời Gian</th>
                <th className="px-5 py-3">Phát Sinh</th>
                <th className="px-5 py-3">Lý Do Chi Tiết</th>
                <th className="px-5 py-3">Trạng Thái</th>
                <th className="px-5 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    Chưa có báo cáo tăng ca nào trong cơ sở dữ liệu.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white block">{r.staffName || `Thợ #${r.staffId}`}</span>
                      <span className="text-xs text-slate-400 font-mono">Staff ID: {r.staffId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">Đơn #{r.bookingId}</span>
                      <span className="text-slate-400 font-mono">{formatDateTime(r.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">+{r.actualOvertimeMinutes} phút</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(r.calculatedAmount)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs max-w-xs">
                      <p className="text-slate-600 dark:text-slate-400 truncate" title={r.reason}>
                        {r.reason || 'Khách yêu cầu thêm dịch vụ'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === 'PENDING' && <Badge variant="pending">Chờ Duyệt</Badge>}
                      {r.status === 'APPROVED' && <Badge variant="active">Đã Duyệt</Badge>}
                      {r.status === 'REJECTED' && <Badge variant="rejected">Từ Chối</Badge>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => openReview(r, 'APPROVED')}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() => openReview(r, 'REJECTED')}
                          >
                            Từ Chối
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Duyệt / Từ chối Overtime */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>
              {reviewAction === 'APPROVED' ? 'Phê Duyệt Tăng Ca' : 'Từ Chối Báo Cáo Tăng Ca'}
            </span>
          </div>
        }
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              variant={reviewAction === 'APPROVED' ? 'primary' : 'danger'}
              onClick={handleConfirmReview}
              isLoading={isLoading}
            >
              {reviewAction === 'APPROVED' ? 'Xác Nhận Phê Duyệt' : 'Xác Nhận Từ Chối'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
            <p className="text-slate-700 dark:text-slate-300">
              Thợ: <strong className="text-slate-900 dark:text-white">{selectedReport?.staffName}</strong> • Đơn: <strong className="text-slate-900 dark:text-white">#{selectedReport?.bookingId}</strong>
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              Thời gian phát sinh: <strong className="text-slate-900 dark:text-white">+{selectedReport?.actualOvertimeMinutes} phút</strong> ({formatCurrency(selectedReport?.calculatedAmount)})
            </p>
            <p className="text-slate-500 dark:text-slate-400 italic mt-1">"{selectedReport?.reason}"</p>
          </div>

          <Textarea
            label="Ghi chú thẩm định của Studio"
            placeholder="Nhập lý do hoặc lời nhắn cho thợ..."
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
