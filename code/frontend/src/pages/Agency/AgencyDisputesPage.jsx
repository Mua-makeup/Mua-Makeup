import { DisputeFinancialSummary } from '../../components/base/DisputeFinancialSummary';
import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Search, Eye, AlertCircle, X, Check, User, UserCheck } from 'lucide-react';
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

  // Realtime update listener when agency receives a dispute alert
  useEffect(() => {
    const handleDisputeAlert = () => {
      fetchDisputes(pageInfo.page);
    };
    window.addEventListener('agency:dispute-alert', handleDisputeAlert);
    return () => {
      window.removeEventListener('agency:dispute-alert', handleDisputeAlert);
    };
  }, [pageInfo.page]);

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
    const isCustomerAccepted =
      typeof rowOrStatus === 'object' &&
      ((rowOrStatus?.cancellationReason || '').includes('[KHACH_DONG_Y_KET_QUA]') ||
        (rowOrStatus?.emergencyReason || '').includes('[KHACH_DONG_Y_KET_QUA]'));

    if (isEscalated) {
      return <Badge variant="danger">{t('status_escalated_admin')}</Badge>;
    }
    if (isRejected && status === 'DISPUTED') {
      return <Badge variant="warning">{t('status_rejected_waiting_customer')}</Badge>;
    }
    if (isCustomerAccepted || status === 'DISPUTE_COMPENSATED' || status === 'PAID_OUT') {
      return <Badge variant="success">{t('status_resolved_internal')}</Badge>;
    }
    switch (status) {
      case 'DISPUTED':
        return <Badge variant="warning">{t('status_waiting_studio')}</Badge>;
      case 'DISPUTE_REFUNDED':
        return <Badge variant="neutral">{t('status_refunded')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">{t('status_cancelled')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      header: t('col_dispute_booking_code'),
      accessor: 'bookingCode',
      render: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">#{row.bookingCode}</span>,
    },
    {
      header: t('col_dispute_customer'),
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.customerName || t('guest_customer')}</p>
          {row.customerPhone && <p className="text-xs text-slate-500">{row.customerPhone}</p>}
        </div>
      ),
    },
    {
      header: t('col_dispute_staff'),
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.staffName || t('unassigned_staff')}</p>
          {row.staffPhone && <p className="text-xs text-slate-500">{row.staffPhone}</p>}
        </div>
      ),
    },
    {
      header: t('col_dispute_appointment'),
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(row.bookingDate)} {row.startTime ? `(${row.startTime.substring(0, 5)})` : ''}
        </span>
      ),
    },
    {
      header: t('col_dispute_reason'),
      render: (row) => (
        <p className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.emergencyReason || row.cancellationReason}>
          {row.emergencyReason || row.cancellationReason || t('no_reason')}
        </p>
      ),
    },
    {
      header: t('status'),
      render: (row) => renderStatusBadge(row),
    },
    {
      header: t('actions'),
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => handleOpenDetail(row)} className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
          <Eye size={13} />
          <span>{t('btn_detail')}</span>
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
    } else if (isMuaOnly) {
      muaStatement = rawReason.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      hasMuaStatement = Boolean(muaStatement);
      customerStatement = t('dispute_customer_no_statement_msg');
      hasCustomerStatement = false;
    } else {
      customerStatement = rawReason.replace(/\[Khách hàng\]:?/, '').trim();
      hasCustomerStatement = Boolean(customerStatement);
      muaStatement = t('dispute_staff_no_statement_msg');
      hasMuaStatement = false;
    }

    // Parse proof images independently of statement dual state
    const hasTaggedProofs = rawProofParts.some(
      (p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]') || p.includes('[Thợ MUA]')
    );
    if (hasTaggedProofs) {
      rawProofParts.forEach((item) => {
        const cleaned = cleanUrl(item);
        if (!cleaned) return;
        if (item.includes('[Khách hàng]')) {
          customerProofUrls.push(cleaned);
        } else if (item.includes('[Chuyên viên MUA]') || item.includes('[Thợ MUA]')) {
          muaProofUrls.push(cleaned);
        } else {
          if (isMuaOnly) {
            muaProofUrls.push(cleaned);
          } else if (isDual) {
            if (muaProofUrls.length === 0) muaProofUrls.push(cleaned);
            else customerProofUrls.push(cleaned);
          } else {
            customerProofUrls.push(cleaned);
          }
        }
      });
    } else {
      if (isDual) {
        customerProofUrls = rawProofParts.slice(0, 1).map(cleanUrl).filter(Boolean);
        muaProofUrls = rawProofParts.slice(1).map(cleanUrl).filter(Boolean);
      } else if (isMuaOnly) {
        muaProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
        customerProofUrls = [];
      } else {
        customerProofUrls = rawProofParts.map(cleanUrl).filter(Boolean);
        muaProofUrls = [];
      }
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('agency_disputes_title')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('agency_disputes_subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchDisputes(pageInfo.page)} className="self-start sm:self-auto flex items-center gap-1.5 text-xs">
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>{t('reload')}</span>
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
            { id: 'ALL', label: t('agency_disputes_tab_all') },
            { id: 'PENDING', label: t('agency_disputes_tab_pending') },
            { id: 'RESOLVED', label: t('agency_disputes_tab_resolved') },
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
              placeholder={t('agency_disputes_search_placeholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs px-3 py-1.5">
            {t('search')}
          </Button>
        </form>
      </div>

      {/* Sorted Disputes: DISPUTED / PENDING on top, then newest date */}
      {(() => {
        const sortedDisputes = [...disputes].sort((a, b) => {
          const isAPending = a.status === 'DISPUTED' || a.status === 'PENDING';
          const isBPending = b.status === 'DISPUTED' || b.status === 'PENDING';
          if (isAPending && !isBPending) return -1;
          if (!isAPending && isBPending) return 1;
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        return (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <DataTable
              columns={columns}
              data={sortedDisputes}
              isLoading={isLoading}
              pagination={{
                page: pageInfo.page,
                size: pageInfo.size,
                totalElements: pageInfo.totalElements,
                totalPages: pageInfo.totalPages,
                onPageChange: (newPage1Indexed) => fetchDisputes(newPage1Indexed - 1, pageInfo.size),
                onPageSizeChange: (newSize) => fetchDisputes(0, newSize),
              }}
              emptyMessage={t('agency_disputes_empty')}
            />
          </div>
        );
      })()}

      {/* Detail & Resolve Modal */}
      {selectedDispute && (() => {
        const isPostCompletion = selectedDispute.completedService === true;
        const disputeInfo = parseDisputeInfo(selectedDispute);

        return (
          <Modal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            title={`${t('agency_dispute_detail_title')} #${selectedDispute.bookingCode}`}
            maxWidth="max-w-4xl"
          >
            <div className="space-y-4 text-xs">
              <DisputeFinancialSummary financials={selectedDispute.financials} />
              {/* Tóm tắt thông tin */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500">{t('customer_label')}:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedDispute.customerName || 'N/A'} ({selectedDispute.customerPhone || 'N/A'})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{t('staff_in_charge')}:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedDispute.staffName || 'N/A'} ({selectedDispute.staffPhone || 'N/A'})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{t('deposit_amount')}:</span>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatVnd(selectedDispute.depositAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{t('total_service_amount')}:</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatVnd(selectedDispute.totalAmount || selectedDispute.depositAmount)}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{t('current_status')}:</span>
                  <div>{renderStatusBadge(selectedDispute)}</div>
                </div>
              </div>

              {/* Hồ sơ Đối Soát 2 Bên (Khách Hàng vs Chuyên Viên MUA) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {t('dispute_dossier_title')}
                  </span>
                  {disputeInfo.hasMuaStatement ? (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {t('dispute_staff_has_statement')}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {t('dispute_staff_no_statement_yet')}
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
                              {selectedDispute.customerName || t('customer_label')}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {selectedDispute.customerPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {t('dispute_customer_side')}
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          {isPostCompletion ? t('dispute_complaint_content') : t('dispute_incident_reason')}
                        </label>
                        <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-200/70 dark:border-blue-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          "{disputeInfo.customerStatement || t('dispute_no_desc')}"
                        </div>
                      </div>
                    </div>

                    {/* Ảnh minh chứng từ khách */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                        {t('dispute_customer_proof')}
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
                        <span className="text-[11px] text-slate-400 italic">{t('dispute_no_proof_attached')}</span>
                      )}
                    </div>
                  </div>

                  {/* Cột 2: Phía Chuyên Viên MUA (Nhân viên Studio) */}
                  <div className="p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/60">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {selectedDispute.staffName || t('staff_in_charge')}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {selectedDispute.staffPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {t('dispute_staff_side')}
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          {t('dispute_staff_statement_title')}
                        </label>
                        {disputeInfo.hasMuaStatement ? (
                          <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            "{disputeInfo.muaStatement}"
                          </div>
                        ) : (
                          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 italic">
                            {t('dispute_staff_no_statement_msg')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ảnh hoàn thành ca & Ảnh minh chứng của Thợ */}
                    <div className="space-y-2">
                      {selectedDispute.completionPhotoUrl && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between mb-1">
                            <span>{t('dispute_staff_checkout_photo')}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">{t('dispute_checkout_completed_badge')}</span>
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
                            <span className="text-slate-500 text-[11px]">{t('dispute_staff_photo_hint')}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                          {t('dispute_staff_proof')}
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
                            {selectedDispute.completionPhotoUrl ? t('dispute_only_checkout_photo') : t('dispute_no_proof_attached')}
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
                      <span>{t('dispute_escalated_admin_title')}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t('dispute_escalated_admin_desc')}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                      {t('close')}
                    </Button>
                  </div>
                </div>
              ) : selectedDispute.isStudioRejected && selectedDispute.status === 'DISPUTED' ? (
                /* Thông báo nếu Studio đã từ chối/bác bỏ và đang chờ khách */
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <AlertCircle size={14} />
                      <span>{isPostCompletion ? t('dispute_studio_rejected_post_title') : t('dispute_studio_rejected_pre_title')}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {isPostCompletion ? t('dispute_studio_rejected_post_desc') : t('dispute_studio_rejected_pre_desc')}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                      {t('close')}
                    </Button>
                  </div>
                </div>
              ) : selectedDispute.status === 'DISPUTED' ? (
                /* Form xử lý khi chưa từ chối, chưa leo thang */
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {isPostCompletion ? t('dispute_resolution_options_post') : t('dispute_resolution_options_pre')}
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
                        {isPostCompletion ? t('dispute_approve_refund_title') : t('dispute_approve_refund_pre_title')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {`Hoàn ${formatVnd(selectedDispute.financials?.paidAmount || 0)} đã thực trả về ví khách.`}
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
                        {isPostCompletion ? t('dispute_reject_title') : t('dispute_reject_pre_title')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isPostCompletion ? t('dispute_reject_post_desc') : t('dispute_reject_pre_desc')}
                      </span>
                    </label>
                  </div>

                  <div>
                    <span className="text-slate-600 dark:text-slate-400">{t('dispute_resolve_note_label')}</span>
                    <Textarea
                      placeholder={t('dispute_resolve_note_placeholder')}
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={2}
                      className="mt-1 text-xs"
                    />
                    {resolveError && <p className="text-red-500 text-[11px] mt-1">{resolveError}</p>}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                      {t('cancel')}
                    </Button>
                    <Button size="sm" onClick={handleResolveSubmit} disabled={isResolving}>
                      {isResolving ? t('loading') : t('btn_confirm_resolution')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  {(selectedDispute.status === 'DISPUTE_COMPENSATED' ||
                    selectedDispute.status === 'PAID_OUT' ||
                    (selectedDispute.cancellationReason || '').includes('[KHACH_DONG_Y_KET_QUA]')) && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <Check size={14} />
                        <span>{t('status_resolved_internal')}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {(selectedDispute.cancellationReason || '').includes('[KHACH_DONG_Y_KET_QUA]')
                          ? t('dispute_customer_accepted_desc')
                          : t('dispute_resolved_compensated_desc')}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                      {t('close')}
                    </Button>
                  </div>
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
              alt={t('dispute_customer_proof')}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3.5 -right-3.5 bg-white text-slate-800 hover:bg-slate-100 p-1.5 rounded-full shadow-lg border border-slate-200 transition-colors cursor-pointer"
              title={t('close')}
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
