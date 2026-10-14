import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Eye, AlertCircle, X, Check } from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { Modal } from '../../components/base/Modal';
import { Textarea } from '../../components/base/Textarea';
import { Toast } from '../../components/base/Toast';
import { getSavedPageSize } from '../../utils/pagination.util';
import { formatDate } from '../../utils/formatters';

export const AgencyDisputesPage = () => {
  const { t } = useI18nStore();

  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [resolutionAction, setResolutionAction] = useState('APPROVE_REFUND_CUSTOMER');
  const [resolveNote, setResolveNote] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const fetchDisputes = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await agencyService.getDisputes({
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
      setApiError(err.message || t('error_api_connection') || 'Không thể tải danh sách khiếu nại.');
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes(0);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDisputes(0);
  };

  const handleOpenDetail = (dispute) => {
    setSelectedDispute(dispute);
    setResolutionAction('APPROVE_REFUND_CUSTOMER');
    setResolveNote('');
    setResolveError('');
    setIsDetailModalOpen(true);
  };

  const handleResolveSubmit = async () => {
    if (!resolveNote.trim()) {
      setResolveError('Vui lòng nhập ghi chú xử lý ngắn gọn.');
      return;
    }
    setResolveError('');
    setIsResolving(true);
    try {
      await agencyService.resolveDispute(selectedDispute.bookingId, {
        resolution: resolutionAction,
        note: resolveNote.trim(),
      });
      setToastMessage('Đã xử lý khiếu nại thành công.');
      setIsDetailModalOpen(false);
      fetchDisputes(pageInfo.page);
    } catch (err) {
      setResolveError(err.response?.data?.message || err.message || 'Không thể xử lý khiếu nại.');
    } finally {
      setIsResolving(false);
    }
  };

  const formatVnd = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const renderStatusBadge = (rowOrStatus) => {
    const status = typeof rowOrStatus === 'string' ? rowOrStatus : rowOrStatus?.status;
    const isEscalated = typeof rowOrStatus === 'object' && rowOrStatus?.isEscalatedToAdmin;
    const isRejected = typeof rowOrStatus === 'object' && rowOrStatus?.isStudioRejected;

    if (isEscalated) {
      return <Badge variant="danger">Leo thang Admin</Badge>;
    }
    if (isRejected && status === 'DISPUTED') {
      return <Badge variant="warning">Đã từ chối (Chờ khách)</Badge>;
    }
    switch (status) {
      case 'DISPUTED':
        return <Badge variant="warning">Chờ Studio xử lý</Badge>;
      case 'DISPUTE_REFUNDED':
        return <Badge variant="neutral">Đã hoàn cọc</Badge>;
      case 'DISPUTE_COMPENSATED':
        return <Badge variant="success">Giải quyết nội bộ</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Đã hủy</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: 'Mã đơn',
      accessor: 'bookingCode',
      render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">#{row.bookingCode}</span>,
    },
    {
      header: 'Khách hàng',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.customerName || 'Khách vãng lai'}</p>
          {row.customerPhone && <p className="text-xs text-slate-500">{row.customerPhone}</p>}
        </div>
      ),
    },
    {
      header: 'Chuyên viên',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.staffName || 'Chưa chỉ định'}</p>
          {row.staffPhone && <p className="text-xs text-slate-500">{row.staffPhone}</p>}
        </div>
      ),
    },
    {
      header: 'Lịch hẹn',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(row.bookingDate)} {row.startTime ? `(${row.startTime.substring(0, 5)})` : ''}
        </span>
      ),
    },
    {
      header: 'Lý do sự cố',
      render: (row) => (
        <p className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.emergencyReason || row.cancellationReason}>
          {row.emergencyReason || row.cancellationReason || 'Không có lý do'}
        </p>
      ),
    },
    {
      header: 'Trạng thái',
      render: (row) => renderStatusBadge(row),
    },
    {
      header: 'Thao tác',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => handleOpenDetail(row)} className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
          <Eye size={13} />
          <span>Chi tiết</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Khiếu Nại & Sự Cố</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý và giải quyết các báo cáo sự cố hoặc khiếu nại liên quan đến đơn hàng của Studio
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchDisputes(pageInfo.page)} className="self-start sm:self-auto flex items-center gap-1.5 text-xs">
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </Button>
      </div>

      {apiError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ xử lý' },
            { id: 'RESOLVED', label: 'Đã giải quyết' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc lý do..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs px-3 py-1.5">
            Tìm
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <DataTable
          columns={columns}
          data={disputes}
          loading={isLoading}
          page={pageInfo.page}
          pageSize={pageInfo.size}
          totalElements={pageInfo.totalElements}
          totalPages={pageInfo.totalPages}
          onPageChange={(newPage) => fetchDisputes(newPage)}
          onPageSizeChange={(newSize) => fetchDisputes(0, newSize)}
          emptyMessage="Không có báo cáo khiếu nại nào."
        />
      </div>

      {/* Detail & Resolve Modal */}
      {selectedDispute && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Chi Tiết Sự Cố #${selectedDispute.bookingCode}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Tóm tắt thông tin */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-500">Khách hàng:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedDispute.customerName || 'N/A'} ({selectedDispute.customerPhone || 'N/A'})
                </p>
              </div>
              <div>
                <span className="text-slate-500">Chuyên viên phụ trách:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedDispute.staffName || 'Chưa có'} ({selectedDispute.staffPhone || 'N/A'})
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tiền cọc:</span>
                <p className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatVnd(selectedDispute.depositAmount)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Trạng thái hiện tại:</span>
                <div className="mt-0.5">{renderStatusBadge(selectedDispute)}</div>
              </div>
            </div>

            {/* Nội dung sự cố */}
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Lý do báo cáo:</span>
              <div className="mt-1 p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-md text-amber-900 dark:text-amber-200 leading-relaxed">
                {selectedDispute.emergencyReason || selectedDispute.cancellationReason || 'Không có mô tả cụ thể.'}
              </div>
            </div>

            {/* Ảnh minh chứng nếu có */}
            {selectedDispute.emergencyProofUrl && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Ảnh minh chứng hiện trường:</span>
                <div className="mt-1 flex items-center gap-2">
                  <img
                    src={selectedDispute.emergencyProofUrl.replace(/^\[.*?\]:/, '')}
                    alt="Minh chứng"
                    onClick={() => setPreviewImageUrl(selectedDispute.emergencyProofUrl.replace(/^\[.*?\]:/, ''))}
                    className="w-20 h-20 object-cover rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90"
                  />
                  <span className="text-slate-500 text-[11px]">(Bấm vào ảnh để xem kích thước lớn)</span>
                </div>
              </div>
            )}

            {/* Thông báo nếu đã Leo thang lên Admin */}
            {selectedDispute.isEscalatedToAdmin ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                    <AlertCircle size={14} />
                    <span>Khách hàng đã chuyển khiếu nại lên Admin Sàn</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Hồ sơ đã được chuyển giao cho Ban Quản Trị Sàn phân xử tối hậu. Quyết định hoàn cọc hoặc giải ngân sẽ do Admin phê duyệt.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
            ) : selectedDispute.isStudioRejected && selectedDispute.status === 'DISPUTED' ? (
              /* Thông báo nếu Studio đã từ chối và đang chờ khách */
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <AlertCircle size={14} />
                    <span>Studio đã từ chối hoàn cọc (Chờ khách hàng phản hồi)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Hệ thống đang chờ khách hàng xác nhận chấp nhận kết quả hoặc lựa chọn chuyển khiếu nại lên Admin Sàn phân xử.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                    Đóng
                  </Button>
                </div>
              </div>
            ) : selectedDispute.status === 'DISPUTED' ? (
              /* Form xử lý khi chưa từ chối, chưa leo thang */
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Phương án xử lý:</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setResolutionAction('APPROVE_REFUND_CUSTOMER')}
                    className={`p-2.5 rounded-md border cursor-pointer flex flex-col gap-1 transition-colors ${
                      resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-semibold text-xs">Đồng ý hoàn cọc cho khách</span>
                    <span className="text-[11px] text-slate-500">Hoàn trả 100% tiền cọc từ Escrow vào ví khách hàng</span>
                  </label>

                  <label
                    onClick={() => setResolutionAction('RESOLVE_INTERNAL')}
                    className={`p-2.5 rounded-md border cursor-pointer flex flex-col gap-1 transition-colors ${
                      resolutionAction === 'RESOLVE_INTERNAL'
                        ? 'border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-semibold text-xs">Từ chối hoàn cọc</span>
                    <span className="text-[11px] text-slate-500">Giữ cọc cho Studio. Khách sẽ nhận thông báo để chấp nhận hoặc chuyển Admin Sàn</span>
                  </label>
                </div>

                <div>
                  <span className="text-slate-600 dark:text-slate-400">Ghi chú xử lý:</span>
                  <Textarea
                    placeholder="Nhập lý do hoặc giải trình gửi tới khách hàng..."
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    rows={2}
                    className="mt-1 text-xs"
                  />
                  {resolveError && <p className="text-red-500 text-[11px] mt-1">{resolveError}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button size="sm" onClick={handleResolveSubmit} disabled={isResolving}>
                    {isResolving ? 'Đang xử lý...' : 'Xác nhận xử lý'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Đóng
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img src={previewImageUrl} alt="Xem minh chứng" className="max-w-full max-h-[85vh] object-contain rounded" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 bg-white text-black p-1 rounded-full shadow hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
