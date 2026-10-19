import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, Eye, AlertCircle, X, Check, User, Sparkles } from 'lucide-react';
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

  // Close image lightbox on Escape key without bubbling to parent modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImageUrl) {
        e.stopPropagation();
        setPreviewImageUrl(null);
      }
    };
    if (previewImageUrl) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [previewImageUrl]);

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

  // Helper to parse dispute origin, statements and evidence between Customer and MUA
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
    let hasCustomerStatement = false;
    let hasMuaStatement = false;
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
          hasCustomerStatement = true;
        } else if (trimmed.includes('[Chuyên viên MUA]')) {
          muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
          hasMuaStatement = true;
        } else {
          if (!muaStatement) {
            muaStatement = trimmed;
            hasMuaStatement = true;
          } else if (!customerStatement) {
            customerStatement = trimmed;
            hasCustomerStatement = true;
          }
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
        customerProofUrls = rawProofParts.slice(0, 1).map(cleanUrl).filter(Boolean);
        muaProofUrls = rawProofParts.slice(1).map(cleanUrl).filter(Boolean);
      }
    } else if (isMuaOnly) {
      muaStatement = rawReason.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      hasMuaStatement = Boolean(muaStatement);
      customerStatement = 'Khách hàng chưa gửi lời khai riêng';
      hasCustomerStatement = false;
      muaProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
      customerProofUrls = [];
    } else {
      customerStatement = rawReason.replace(/\[Khách hàng\]:?/, '').trim();
      hasCustomerStatement = Boolean(customerStatement);
      muaStatement = 'Chuyên viên chưa gửi lời khai giải trình riêng qua ứng dụng';
      hasMuaStatement = false;
      customerProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
      muaProofUrls = [];
    }

    return {
      disputeOrigin,
      customerStatement,
      muaStatement,
      hasCustomerStatement,
      hasMuaStatement,
      customerProofUrls,
      muaProofUrls,
    };
  };

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
      {selectedDispute && (() => {
        const isPostCompletion = Boolean(
          selectedDispute.completionPhotoUrl ||
          (selectedDispute.totalAmount && selectedDispute.depositAmount && Number(selectedDispute.totalAmount) > Number(selectedDispute.depositAmount)) ||
          selectedDispute.status === 'COMPLETED' ||
          selectedDispute.status === 'PAID_OUT'
        );
        const disputeInfo = parseDisputeInfo(selectedDispute);

        return (
          <Modal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title={`Chi Tiết Sự Cố #${selectedDispute.bookingCode}`}
            maxWidth="max-w-4xl"
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
                  <span className="text-slate-500">Tổng tiền dịch vụ:</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatVnd(selectedDispute.totalAmount || selectedDispute.depositAmount)}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Trạng thái hiện tại:</span>
                  <div>{renderStatusBadge(selectedDispute)}</div>
                </div>
              </div>

              {/* Hồ sơ Đối Soát 2 Bên (Khách Hàng vs Chuyên Viên MUA) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Hồ sơ đối soát & Lời khai 2 bên:
                  </span>
                  {disputeInfo.hasMuaStatement ? (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ✓ Đã có giải trình từ thợ
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Chuyên viên chưa gửi giải trình
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Cột 1: Phía Khách Hàng */}
                  <div className="p-3 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60 dark:border-blue-900/60">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {selectedDispute.customerName || 'Khách hàng'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {selectedDispute.customerPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Phía Khách Hàng
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          {isPostCompletion ? 'Nội dung khiếu nại chất lượng ca làm:' : 'Lý do báo cáo sự cố:'}
                        </label>
                        <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-200/70 dark:border-blue-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          "{disputeInfo.customerStatement || 'Không có mô tả chi tiết'}"
                        </div>
                      </div>
                    </div>

                    {/* Ảnh minh chứng từ khách */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        Ảnh minh chứng hiện trường (Khách):
                      </label>
                      {disputeInfo.customerProofUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {disputeInfo.customerProofUrls.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={url}
                                alt={`Minh chứng khách #${idx + 1}`}
                                onClick={() => setPreviewImageUrl(url)}
                                className="w-16 h-16 object-cover rounded border border-blue-200 dark:border-blue-800 cursor-pointer hover:opacity-90 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(url)}
                                className="absolute inset-0 bg-black/40 text-white rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Không có ảnh minh chứng đính kèm</span>
                      )}
                    </div>
                  </div>

                  {/* Cột 2: Phía Chuyên Viên MUA (Nhân viên Studio) */}
                  <div className="p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {selectedDispute.staffName || 'Chuyên viên MUA'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {selectedDispute.staffPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Phía Chuyên Viên (Thợ)
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          Lời khai giải trình của thợ:
                        </label>
                        {disputeInfo.hasMuaStatement ? (
                          <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            "{disputeInfo.muaStatement}"
                          </div>
                        ) : (
                          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 italic">
                            Chuyên viên chưa gửi lời khai giải trình riêng qua ứng dụng.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ảnh hoàn thành ca & Ảnh minh chứng của Thợ */}
                    <div className="space-y-2">
                      {selectedDispute.completionPhotoUrl && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between mb-1">
                            <span>Ảnh check-out hoàn thành ca:</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">đã chụp hoàn tất</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative group">
                              <img
                                src={selectedDispute.completionPhotoUrl}
                                alt="Ảnh hoàn thành ca"
                                onClick={() => setPreviewImageUrl(selectedDispute.completionPhotoUrl)}
                                className="w-16 h-16 object-cover rounded border border-emerald-400 dark:border-emerald-600 cursor-pointer hover:opacity-90 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(selectedDispute.completionPhotoUrl)}
                                className="absolute inset-0 bg-black/40 text-white rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-slate-500 text-[11px]">(Ảnh thợ chụp sau ca)</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          Ảnh minh chứng đối soát của Thợ:
                        </label>
                        {disputeInfo.muaProofUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {disputeInfo.muaProofUrls.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Minh chứng thợ #${idx + 1}`}
                                  onClick={() => setPreviewImageUrl(url)}
                                  className="w-16 h-16 object-cover rounded border border-amber-200 dark:border-amber-800 cursor-pointer hover:opacity-90 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(url)}
                                  className="absolute inset-0 bg-black/40 text-white rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {selectedDispute.completionPhotoUrl ? 'Chỉ có ảnh hoàn thành ca ở trên' : 'Không có ảnh minh chứng đính kèm'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông báo nếu đã Leo thang lên Admin */}
              {selectedDispute.isEscalatedToAdmin ? (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                      <AlertCircle size={14} />
                      <span>Khách hàng đã chuyển khiếu nại lên Admin Sàn</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Hồ sơ đã được chuyển giao cho Ban Quản Trị Sàn phân xử tối hậu. Quyết định hoàn tiền hoặc bảo lưu doanh thu sẽ do Admin phê duyệt.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                      Đóng
                    </Button>
                  </div>
                </div>
              ) : selectedDispute.isStudioRejected && selectedDispute.status === 'DISPUTED' ? (
                /* Thông báo nếu Studio đã từ chối/bác bỏ và đang chờ khách */
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <AlertCircle size={14} />
                      <span>{isPostCompletion ? 'Studio đã bác bỏ khiếu nại sau ca (Chờ khách phản hồi)' : 'Studio đã từ chối hoàn cọc (Chờ khách phản hồi)'}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {isPostCompletion
                        ? 'Hệ thống đang chờ khách hàng xác nhận chấp nhận kết quả bác bỏ khiếu nại hoặc lựa chọn chuyển khiếu nại lên Ban Quản Trị Sàn phân xử tối hậu.'
                        : 'Hệ thống đang chờ khách hàng xác nhận chấp nhận kết quả hoặc lựa chọn chuyển khiếu nại lên Ban Quản Trị Sàn phân xử.'}
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
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {isPostCompletion ? 'Phương án giải quyết khiếu nại sau ca:' : 'Phương án xử lý sự cố cọc:'}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label
                      onClick={() => setResolutionAction('APPROVE_REFUND_CUSTOMER')}
                      className={`p-2.5 rounded-md border cursor-pointer flex flex-col gap-1 transition-colors ${
                        resolutionAction === 'APPROVE_REFUND_CUSTOMER'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-semibold text-xs">
                        {isPostCompletion ? 'Chấp thuận khiếu nại (Hoàn 100% tiền đơn)' : 'Đồng ý hoàn cọc cho khách'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isPostCompletion
                          ? `Hoàn trả 100% chi phí dịch vụ (${formatVnd(selectedDispute.totalAmount)}) vào ví khách hàng. Ca làm không phát sinh doanh thu.`
                          : `Hoàn trả 100% tiền cọc (${formatVnd(selectedDispute.depositAmount)}) từ Escrow vào ví khách hàng.`}
                      </span>
                    </label>

                    <label
                      onClick={() => setResolutionAction('RESOLVE_INTERNAL')}
                      className={`p-2.5 rounded-md border cursor-pointer flex flex-col gap-1 transition-colors ${
                        resolutionAction === 'RESOLVE_INTERNAL'
                          ? 'border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-semibold text-xs">
                        {isPostCompletion ? 'Bác bỏ khiếu nại (Bảo lưu thù lao dịch vụ)' : 'Từ chối hoàn cọc'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isPostCompletion
                          ? 'Bảo lưu doanh thu cho Studio & Thợ. Khách hàng sẽ nhận thông báo để chấp nhận hoặc chuyển lên Admin Sàn.'
                          : 'Giữ cọc cho Studio. Khách sẽ nhận thông báo để chấp nhận hoặc chuyển Admin Sàn.'}
                      </span>
                    </label>
                  </div>

                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Ghi chú giải trình của Studio:</span>
                    <Textarea
                      placeholder={isPostCompletion ? 'Nhập giải trình lý do chấp thuận hoặc bác bỏ khiếu nại chất lượng...' : 'Nhập lý do hoặc giải trình gửi tới khách hàng...'}
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
        );
      })()}

      {/* Image Preview Modal (Z-Index cao hơn Modal chính z-[100010] để không bị che khuất) */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[100010] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Xem minh chứng"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3.5 -right-3.5 bg-white text-slate-800 hover:bg-slate-100 p-1.5 rounded-full shadow-lg border border-slate-200 transition-colors cursor-pointer"
              title="Đóng xem ảnh"
            >
              <X size={18} />
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
