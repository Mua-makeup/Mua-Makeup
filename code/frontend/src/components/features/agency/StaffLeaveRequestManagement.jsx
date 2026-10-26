import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../base/Button';
import { Modal } from '../../base/Modal';
import { Toast } from '../../base/Toast';
import { agencyService } from '../../../services/agency.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffLeaveRequestManagement = ({ onLeaveApproved }) => {
  const { t } = useI18nStore();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  // Modal từ chối
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal xác nhận phê duyệt
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await agencyService.getAgencyLeaveRequests(params);
      const data = res.data?.data?.content || res.data?.content || res.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setToastMessage(t('error_api_connection') || 'Không thể tải danh sách đơn xin nghỉ.');
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Lắng nghe sự kiện realtime khi thợ gửi đơn xin nghỉ từ Mobile App
  useEffect(() => {
    const handleRealtimeLeaveRequest = () => {
      fetchRequests();
    };
    window.addEventListener('agency:leave-request', handleRealtimeLeaveRequest);
    return () => {
      window.removeEventListener('agency:leave-request', handleRealtimeLeaveRequest);
    };
  }, [fetchRequests]);

  const handleOpenApproveModal = (req) => {
    setSelectedRequest(req);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      await agencyService.reviewLeaveRequest(selectedRequest.id, {
        status: 'APPROVED',
      });
      setToastMessage(t('leave_request_approved_success') || 'Đã duyệt đơn xin nghỉ ca! Ca trực tương ứng đã được xóa khỏi lịch.');
      setToastType('success');
      setApproveModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
      if (onLeaveApproved) {
        onLeaveApproved();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi duyệt đơn.';
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRejectModal = (req) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      await agencyService.reviewLeaveRequest(selectedRequest.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      setToastMessage(t('leave_request_rejected_success') || 'Đã từ chối đơn xin nghỉ ca.');
      setToastType('info');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi từ chối đơn.';
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Đã từ chối
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Thợ đã hủy
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Thanh Điều Hướng & Bộ Lọc Trạng Thái - Tối Ưu Tối Giản */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING', label: `Chờ duyệt ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'REJECTED', label: 'Đã từ chối' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={isLoading}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto cursor-pointer"
        >
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Nội dung danh sách đơn */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Đang tải danh sách đơn xin nghỉ...
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Không có đơn xin nghỉ nào trong mục này.
        </div>
      ) : (
        <>
          {/* Giao diện Desktop Table (Ẩn trên màn hình nhỏ) */}
          <div className="hidden md:block overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                  <th className="py-3 px-4">Thợ Make-up</th>
                  <th className="py-3 px-4">Ngày xin nghỉ</th>
                  <th className="py-3 px-4">Ca / Khung giờ</th>
                  <th className="py-3 px-4">Lý do xin nghỉ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày gửi đơn</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{req.staffName || `Thợ #${req.staffId}`}</div>
                      {req.staffPhone && (
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          {req.staffPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formatDateDisplay(req.leaveDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {req.shiftName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {formatTimeDisplay(req.startTime)} - {formatTimeDisplay(req.endTime)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                      <div>{req.reason}</div>
                      {req.rejectionReason && (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                          Lý do từ chối: {req.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDateDisplay(req.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {req.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(req)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(req)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer transition-colors"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Giao diện Mobile Cards (Hiển thị trên điện thoại / tablet nhỏ) */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {req.staffName || `Thợ #${req.staffId}`}
                    </h3>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Ngày nghỉ: {formatDateDisplay(req.leaveDate)}
                    </div>
                  </div>
                  <div>{renderStatusBadge(req.status)}</div>
                </div>

                <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Ca: </span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {req.shiftName} ({formatTimeDisplay(req.startTime)} - {formatTimeDisplay(req.endTime)})
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Lý do: </span>
                    <span className="text-slate-700 dark:text-slate-300">{req.reason}</span>
                  </div>
                  {req.rejectionReason && (
                    <div className="text-rose-600 dark:text-rose-400 font-medium pt-0.5">
                      Lý do từ chối: {req.rejectionReason}
                    </div>
                  )}
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenApproveModal(req)}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 transition-colors text-center"
                    >
                      Duyệt nghỉ ca
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(req)}
                      className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer transition-colors text-center"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Xác Nhận Duyệt Đơn */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setApproveModalOpen(false);
            setSelectedRequest(null);
          }
        }}
        title="Xác nhận phê duyệt đơn nghỉ ca"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Bạn có chắc chắn muốn phê duyệt đơn xin nghỉ ca của thợ{' '}
            <strong className="text-slate-900 dark:text-white">
              {selectedRequest?.staffName}
            </strong>{' '}
            vào ngày{' '}
            <strong className="text-slate-900 dark:text-white">
              {formatDateDisplay(selectedRequest?.leaveDate)}
            </strong>{' '}
            ({selectedRequest?.shiftName})?
          </p>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Lưu ý:</strong> Khi được duyệt, hệ thống sẽ <strong>tự động xóa ca trực tương ứng</strong> của thợ này trên ma trận lịch làm việc của Studio để đảm bảo không gán đơn vào khung giờ nghỉ.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setApproveModalOpen(false);
                setSelectedRequest(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={handleConfirmApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Từ Chối Đơn */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setRejectModalOpen(false);
            setSelectedRequest(null);
          }
        }}
        title="Từ chối đơn xin nghỉ ca"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Từ chối đơn của thợ{' '}
            <strong className="text-slate-900 dark:text-white">
              {selectedRequest?.staffName}
            </strong>{' '}
            vào ngày {formatDateDisplay(selectedRequest?.leaveDate)} ({selectedRequest?.shiftName}).
            Ca làm việc của thợ sẽ được <strong>giữ nguyên</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do từ chối (Gửi thông báo tới thợ):
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Studio đang có ca tiệc gấp cần đủ nhân sự..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setRejectModalOpen(false);
                setSelectedRequest(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
