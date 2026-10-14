import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Coins,
  Percent,
  Loader2,
  UserX,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatBookingDateTime, formatCurrency } from '../../../utils/formatters';

export const StaffAssignmentMatrixModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { t } = useI18nStore();
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [primaryStaffId, setPrimaryStaffId] = useState(null);
  const [assistantStaffIds, setAssistantStaffIds] = useState([]);
  const [commissionSplits, setCommissionSplits] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'qualified' | 'unqualified'

  // Helper: check if a staff is fully qualified for this booking
  const isStaffQualified = (s) => {
    if (s?.hasReportedBusy) return false;
    return Boolean(
      (s?.isFullyQualified ?? s?.fullyQualified) ||
      (s?.hasShift && s?.hasPackage && s?.hasStyle && s?.hasCalendarFree)
    );
  };

  // Reject view states
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const cleanEmergencyReason = (reason) => {
    if (!reason) return '';
    return reason.replace(/^\[[^\]]*\]\s*/, '');
  };

  const bookingId = booking?.bookingId || booking?.id;
  const totalBookingAmount = Number(matrixData?.totalAmount || booking?.totalAmount || booking?.totalPrice || 0);

  // Danh sách thợ đã báo bận trong ca này để hiển thị rõ ràng cho Agency
  const reportedBusyStaffList = useMemo(() => {
    const map = new Map();
    (matrixData?.staffList || []).forEach((s) => {
      if (s.hasReportedBusy) {
        map.set(s.staffId, {
          staffId: s.staffId,
          staffName: s.staffName,
          staffPhone: s.staffPhone,
          role: s.currentRole || 'PRIMARY_MUA',
          cancellationReason: s.cancellationReason || matrixData?.emergencyReason || booking?.emergencyReason,
        });
      }
    });
    const allAssignments = [
      ...(matrixData?.currentAssignments || []),
      ...(booking?.assignedStaff || []),
    ];
    allAssignments.forEach((a) => {
      if (a && (a.status === 'EMERGENCY_CANCELLED' || a.hasReportedBusy) && a.staffId) {
        if (!map.has(a.staffId)) {
          map.set(a.staffId, {
            staffId: a.staffId,
            staffName: a.staffName,
            staffPhone: a.staffPhone,
            role: a.role || a.assignmentRole || 'PRIMARY_MUA',
            cancellationReason: a.cancellationReason || matrixData?.emergencyReason || booking?.emergencyReason,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [matrixData, booking]);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadMatrix();
    } else {
      resetState();
    }
  }, [isOpen, bookingId]);

  const resetState = () => {
    setMatrixData(null);
    setPrimaryStaffId(null);
    setAssistantStaffIds([]);
    setCommissionSplits({});
    setDispatchNotes('');
    setErrorMsg('');
    setFilterTab('all');
    setIsSubmitting(false);
    setShowConfirmModal(false);
    setShowRejectForm(false);
    setRejectReason('');
    setRejectNote('');
  };

  const loadMatrix = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await agencyService.getStaffMatrix(bookingId);
      const data = res?.data || res;
      setMatrixData(data);

      // Pre-select existing assignments ONLY IF they are currently qualified and NOT reported busy
      if (data?.staffList) {
        const existingPrimary = data.staffList.find(
          (s) => s.currentRole === 'PRIMARY_MUA' && isStaffQualified(s) && !s.hasReportedBusy
        );
        setPrimaryStaffId(existingPrimary ? existingPrimary.staffId : null);

        const existingAssistants = data.staffList
          .filter((s) => s.currentRole === 'ASSISTANT_MUA' && Boolean(s.hasShift && s.hasCalendarFree) && !s.hasReportedBusy)
          .map((s) => s.staffId);
        setAssistantStaffIds(existingAssistants);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setLoading(false);
    }
  };

  // Helper finding existing configured commission for staff
  const findExistingAssignment = (staffId) => {
    // 1. Kiểm tra từ staffList của matrixData
    const fromStaffList = matrixData?.staffList?.find((s) => s.staffId === staffId);
    if (fromStaffList && fromStaffList.commissionRate !== undefined && fromStaffList.commissionRate !== null) {
      const rate = Number(fromStaffList.commissionRate);
      const amount = fromStaffList.commissionAmount !== undefined && fromStaffList.commissionAmount !== null
        ? Number(fromStaffList.commissionAmount)
        : Math.round((totalBookingAmount * rate) / 100);
      return { rate, amount, note: fromStaffList.commissionNote || '' };
    }
    // 2. Kiểm tra từ currentAssignments của matrixData
    const fromMatrixAssign = matrixData?.currentAssignments?.find((a) => a.staffId === staffId);
    if (fromMatrixAssign && fromMatrixAssign.commissionRate !== undefined && fromMatrixAssign.commissionRate !== null) {
      const rate = Number(fromMatrixAssign.commissionRate);
      const amount = fromMatrixAssign.commissionAmount !== undefined && fromMatrixAssign.commissionAmount !== null
        ? Number(fromMatrixAssign.commissionAmount)
        : Math.round((totalBookingAmount * rate) / 100);
      return { rate, amount, note: fromMatrixAssign.commissionNote || '' };
    }
    // 3. Kiểm tra từ booking.assignedStaff
    const fromBookingAssign = booking?.assignedStaff?.find((a) => a.staffId === staffId || a.id === staffId);
    if (fromBookingAssign && fromBookingAssign.commissionRate !== undefined && fromBookingAssign.commissionRate !== null) {
      const rate = Number(fromBookingAssign.commissionRate);
      const amount = fromBookingAssign.commissionAmount !== undefined && fromBookingAssign.commissionAmount !== null
        ? Number(fromBookingAssign.commissionAmount)
        : Math.round((totalBookingAmount * rate) / 100);
      return { rate, amount, note: fromBookingAssign.commissionNote || '' };
    }
    return null;
  };

  // Automatically synchronize selected staff into commissionSplits state
  useEffect(() => {
    setCommissionSplits((prev) => {
      const next = { ...prev };
      const selectedStaffIds = new Set();
      if (primaryStaffId) selectedStaffIds.add(primaryStaffId);
      assistantStaffIds.forEach((id) => selectedStaffIds.add(id));

      // Remove unselected staff
      Object.keys(next).forEach((idStr) => {
        const id = Number(idStr);
        if (!selectedStaffIds.has(id)) {
          delete next[id];
        }
      });

      // Kiểm tra xem đơn có thợ báo bận không
      const allAssignments = [
        ...(matrixData?.currentAssignments || []),
        ...(booking?.assignedStaff || []),
      ];
      const emergencyStaffMap = new Map();
      allAssignments.forEach((a) => {
        if (a && a.status === 'EMERGENCY_CANCELLED' && a.staffId && a.staffId !== primaryStaffId) {
          emergencyStaffMap.set(a.staffId, a);
        }
      });
      const emergencyStaffList = Array.from(emergencyStaffMap.values());
      const transferredEmergencyRate = emergencyStaffList.reduce(
        (sum, a) => sum + (Number(a.commissionRate) || 0),
        0
      );

      // Synchronize Primary Staff (ưu tiên hoa hồng đã cấu hình)
      if (primaryStaffId) {
        if (!next[primaryStaffId]) {
          const existing = findExistingAssignment(primaryStaffId);
          const staffObj = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
          const configuredRate = staffObj?.agreedCommissionRate || matrixData?.staffCommissionRate || booking?.staffCommissionRate || 50;
          let rate = existing ? existing.rate : Number(configuredRate);
          let note = existing ? existing.note : '';

          // Nếu chỉ có 1 thợ làm hết (không có thợ phụ) và có thợ báo bận: chuyển toàn bộ % hoa hồng của thợ báo bận sang cho thợ solo
          if (assistantStaffIds.length === 0 && transferredEmergencyRate > 0) {
            rate = Math.min(100, rate + transferredEmergencyRate);
            const busyNames = emergencyStaffList.map((s) => s.staffName).filter(Boolean).join(', ');
            note = (note ? note + ' | ' : '') + `Làm Solo: Nhận gộp +${transferredEmergencyRate}% hoa hồng từ thợ báo bận (${busyNames})`;
          }

          let amount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * rate) / 100) : 0;

          // Nếu thợ làm thêm giờ (overtime): tự động cộng phụ cấp ngoài giờ
          if (staffObj?.isOvertime && Number(staffObj?.overtimePay) > 0) {
            const otPay = Number(staffObj.overtimePay);
            amount += otPay;
            note = (note ? note + ' | ' : '') + `Tăng ca ${staffObj.overtimeMinutes}p: +${formatCurrency(otPay)}`;
          }

          next[primaryStaffId] = {
            staffId: primaryStaffId,
            staffRole: 'PRIMARY_MUA',
            commissionRate: rate,
            commissionAmount: amount,
            note: note,
            error: '',
          };
        } else {
          // Nếu đã có nhưng chuyển từ có thợ phụ sang KHÔNG có thợ phụ (làm Solo) và có thợ báo bận
          const currentPrimary = next[primaryStaffId];
          if (assistantStaffIds.length === 0 && transferredEmergencyRate > 0 && !currentPrimary.isCustomEdited) {
            const existing = findExistingAssignment(primaryStaffId);
            const staffObj = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
            const baseRate = existing ? existing.rate : Number(staffObj?.agreedCommissionRate || matrixData?.staffCommissionRate || 50);
            const soloRate = Math.min(100, baseRate + transferredEmergencyRate);
            let soloAmount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * soloRate) / 100) : 0;
            const busyNames = emergencyStaffList.map((s) => s.staffName).filter(Boolean).join(', ');
            let note = `Làm Solo: Nhận gộp +${transferredEmergencyRate}% hoa hồng từ thợ báo bận (${busyNames})`;

            if (staffObj?.isOvertime && Number(staffObj?.overtimePay) > 0) {
              const otPay = Number(staffObj.overtimePay);
              soloAmount += otPay;
              note += ` | Tăng ca ${staffObj.overtimeMinutes}p: +${formatCurrency(otPay)}`;
            }

            next[primaryStaffId] = {
              ...currentPrimary,
              staffRole: 'PRIMARY_MUA',
              commissionRate: soloRate,
              commissionAmount: soloAmount,
              note: note,
            };
          } else {
            next[primaryStaffId] = {
              ...currentPrimary,
              staffRole: 'PRIMARY_MUA',
            };
          }
        }
      }

      // Synchronize Assistant Staff (ưu tiên hoa hồng đã cấu hình)
      assistantStaffIds.forEach((astId) => {
        if (!next[astId]) {
          const existing = findExistingAssignment(astId);
          const astStaffObj = matrixData?.staffList?.find((s) => s.staffId === astId);
          const configuredAstRate = astStaffObj?.agreedCommissionRate || 20;
          const rate = existing ? existing.rate : Number(configuredAstRate);
          let amount = existing
            ? existing.amount
            : (totalBookingAmount > 0 ? Math.round((totalBookingAmount * rate) / 100) : 0);
          let note = existing ? existing.note : '';

          if (astStaffObj?.isOvertime && Number(astStaffObj?.overtimePay) > 0) {
            const otPay = Number(astStaffObj.overtimePay);
            amount += otPay;
            note = (note ? note + ' | ' : '') + `Tăng ca ${astStaffObj.overtimeMinutes}p: +${formatCurrency(otPay)}`;
          }

          next[astId] = {
            staffId: astId,
            staffRole: 'ASSISTANT_MUA',
            commissionRate: rate,
            commissionAmount: amount,
            note: note,
            error: '',
          };
        } else {
          next[astId] = {
            ...next[astId],
            staffRole: 'ASSISTANT_MUA',
          };
        }
      });

      return next;
    });
  }, [primaryStaffId, assistantStaffIds, totalBookingAmount, matrixData, booking]);

  const handleSelectPrimary = (staffId) => {
    const target = matrixData?.staffList?.find((s) => s.staffId === staffId);
    if (!target || !isStaffQualified(target)) return;

    setPrimaryStaffId(staffId);
    // If this staff was previously selected as assistant, remove from assistants
    setAssistantStaffIds((prev) => prev.filter((id) => id !== staffId));
    setErrorMsg('');
  };

  const handleToggleAssistant = (staffId) => {
    if (staffId === primaryStaffId) return;

    if (assistantStaffIds.includes(staffId)) {
      setAssistantStaffIds((prev) => prev.filter((id) => id !== staffId));
      setErrorMsg('');
      return;
    }

    const target = matrixData?.staffList?.find((s) => s.staffId === staffId);
    if (!target || !target.hasShift || !target.hasCalendarFree) {
      setErrorMsg(t('dispatch_err_unqualified_assistant'));
      return;
    }

    if (assistantStaffIds.length >= 2) {
      setErrorMsg(t('dispatch_err_max_assistants'));
      return;
    }
    setAssistantStaffIds((prev) => [...prev, staffId]);
    setErrorMsg('');
  };

  // Commission handlers with dynamic remaining range validation
  const handleCommissionRateChange = (staffId, newRateStr) => {
    const rawVal = newRateStr.trim();
    const newRate = rawVal === '' ? 0 : Math.max(0, Number(rawVal) || 0);

    setCommissionSplits((prev) => {
      const next = { ...prev };
      const currentItem = next[staffId];
      if (!currentItem) return prev;

      let otherRates = 0;
      Object.entries(next).forEach(([id, item]) => {
        if (Number(id) !== staffId) {
          otherRates += Number(item.commissionRate) || 0;
        }
      });

      const maxAllowedRate = Math.max(0, 100 - otherRates);
      const calculatedAmount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * newRate) / 100) : 0;
      const maxAllowedAmount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * maxAllowedRate) / 100) : 0;

      let error = '';
      if (newRate > maxAllowedRate) {
        const tpl = t('dispatch_commission_err_exceed_max') || 'Vượt quá mức cho phép! Thợ này chỉ có thể nhận tối đa {max}% ({amount})';
        error = tpl
          .replace('{max}', maxAllowedRate)
          .replace('{amount}', formatCurrency(maxAllowedAmount));
      }

      next[staffId] = {
        ...currentItem,
        commissionRate: newRate,
        commissionAmount: calculatedAmount,
        error,
      };

      return next;
    });
  };

  const handleCommissionAmountChange = (staffId, newAmountStr) => {
    const rawVal = newAmountStr.trim();
    const newAmount = rawVal === '' ? 0 : Math.max(0, Number(rawVal) || 0);

    setCommissionSplits((prev) => {
      const next = { ...prev };
      const currentItem = next[staffId];
      if (!currentItem) return prev;

      let otherRates = 0;
      Object.entries(next).forEach(([id, item]) => {
        if (Number(id) !== staffId) {
          otherRates += Number(item.commissionRate) || 0;
        }
      });

      const maxAllowedRate = Math.max(0, 100 - otherRates);
      const maxAllowedAmount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * maxAllowedRate) / 100) : 0;
      const calculatedRate = totalBookingAmount > 0 ? Number(((newAmount / totalBookingAmount) * 100).toFixed(2)) : 0;

      let error = '';
      if (newAmount > maxAllowedAmount || calculatedRate > maxAllowedRate) {
        const tpl = t('dispatch_commission_err_exceed_max') || 'Vượt quá mức cho phép! Thợ này chỉ có thể nhận tối đa {max}% ({amount})';
        error = tpl
          .replace('{max}', maxAllowedRate)
          .replace('{amount}', formatCurrency(maxAllowedAmount));
      }

      next[staffId] = {
        ...currentItem,
        commissionRate: calculatedRate,
        commissionAmount: newAmount,
        error,
      };

      return next;
    });
  };

  const handleCommissionNoteChange = (staffId, note) => {
    setCommissionSplits((prev) => {
      if (!prev[staffId]) return prev;
      return {
        ...prev,
        [staffId]: {
          ...prev[staffId],
          note,
        },
      };
    });
  };

  const selectedStaffList = useMemo(() => {
    const list = [];
    if (primaryStaffId) {
      const staff = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
      if (staff) list.push({ ...staff, role: 'PRIMARY_MUA' });
    }
    assistantStaffIds.forEach((id) => {
      const staff = matrixData?.staffList?.find((s) => s.staffId === id);
      if (staff) list.push({ ...staff, role: 'ASSISTANT_MUA' });
    });
    return list;
  }, [primaryStaffId, assistantStaffIds, matrixData]);

  const totalAllocatedRate = useMemo(() => {
    return Object.values(commissionSplits).reduce((sum, item) => sum + (Number(item.commissionRate) || 0), 0);
  }, [commissionSplits]);

  const totalAllocatedAmount = useMemo(() => {
    return Object.values(commissionSplits).reduce((sum, item) => sum + (Number(item.commissionAmount) || 0), 0);
  }, [commissionSplits]);

  const remainingRate = Math.max(0, 100 - totalAllocatedRate);
  const remainingAmount = Math.max(0, totalBookingAmount - totalAllocatedAmount);
  const isCommissionExceeded = totalAllocatedRate > 100;
  const hasCommissionErrors = Object.values(commissionSplits).some((item) => Boolean(item.error));

  const handleInitiateDispatch = () => {
    if (!primaryStaffId) {
      setErrorMsg(t('dispatch_err_select_primary') || 'Vui lòng chọn 1 thợ chính đủ điều kiện');
      return;
    }

    const selectedPrimary = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
    if (!selectedPrimary || !isStaffQualified(selectedPrimary)) {
      setErrorMsg(t('dispatch_err_unqualified_primary'));
      setPrimaryStaffId(null);
      return;
    }

    const invalidAssistant = assistantStaffIds.find((id) => {
      const ast = matrixData?.staffList?.find((s) => s.staffId === id);
      return !ast || !ast.hasShift || !ast.hasCalendarFree;
    });
    if (invalidAssistant) {
      setErrorMsg(t('dispatch_err_unqualified_assistant'));
      setAssistantStaffIds((prev) => prev.filter((id) => {
        const ast = matrixData?.staffList?.find((s) => s.staffId === id);
        return Boolean(ast && ast.hasShift && ast.hasCalendarFree);
      }));
      return;
    }

    if (isCommissionExceeded) {
      const msg = (t('dispatch_commission_err_total_exceeded') || 'Tổng hoa hồng của các thợ ({total}%) đã vượt quá 100% giá trị đơn hàng!')
        .replace('{total}', totalAllocatedRate);
      setErrorMsg(msg);
      return;
    }

    if (hasCommissionErrors) {
      setErrorMsg(t('commission_err_exceeds_total') || 'Có thợ được chia hoa hồng vượt mức cho phép. Vui lòng kiểm tra lại.');
      return;
    }

    setErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleExecuteDispatch = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const splitsPayload = Object.values(commissionSplits).map((item) => ({
        staffId: item.staffId,
        staffRole: item.staffRole,
        commissionRate: Number(item.commissionRate) || 0,
        commissionAmount: Number(item.commissionAmount) || 0,
        commissionNote: item.note?.trim() || item.commissionNote?.trim() || undefined,
        note: item.note?.trim() || item.commissionNote?.trim() || undefined,
      }));

      await agencyService.assignStaff(bookingId, {
        primaryStaffId,
        assistantStaffIds,
        dispatchNotes: dispatchNotes.trim() || undefined,
        commissionSplits: splitsPayload.length > 0 ? splitsPayload : undefined,
      });

      setShowConfirmModal(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setShowConfirmModal(false);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMsg(t('dispatch_reject_reason_placeholder'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await agencyService.rejectDispatchBooking(bookingId, {
        rejectionReason: rejectReason.trim(),
        rejectionNote: rejectNote.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={showRejectForm ? t('dispatch_reject_title') : t('dispatch_modal_title')}
      subtitle={showRejectForm ? booking?.bookingCode : t('dispatch_modal_subtitle')}
      size="5xl"
      height="h-[90vh] max-h-[90vh]"
      footer={
        showRejectForm ? (
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setShowRejectForm(false);
                setErrorMsg('');
              }}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmReject}
              isLoading={isSubmitting}
            >
              {t('dispatch_reject_confirm_btn')}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setShowRejectForm(true);
                setErrorMsg('');
              }}
              disabled={isSubmitting || loading}
            >
              {t('dispatch_btn_reject')}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleInitiateDispatch}
              disabled={!primaryStaffId || isSubmitting || loading || isCommissionExceeded || hasCommissionErrors}
              isLoading={isSubmitting}
            >
              {t('dispatch_btn_confirm')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {/* Booking Brief Card */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-amber-700 dark:text-gold-400">
                #{booking?.bookingCode}
              </span>
              <Badge variant="purple" size="sm">
                {matrixData?.packageName || booking?.servicePackageName || booking?.packageName || t('package_label')}
              </Badge>
              {matrixData?.styleName && (
                <Badge variant="pink" size="sm">
                  {matrixData.styleName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
              <span>{formatBookingDateTime(booking?.startTime, booking?.bookingDate)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{booking?.destinationAddress}</span>
          </div>

          {/* Banner & Danh Sách Thợ Đã Báo Bận */}
          {(matrixData?.needsEmergencyReassignment || reportedBusyStaffList.length > 0) && (
            <div className="rounded-xl border-2 border-rose-500/80 bg-rose-50/70 dark:bg-rose-950/40 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold text-xs uppercase tracking-wide">
                  <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>{t('dispatch_busy_staff_card_title') || 'Thợ Đã Báo Bận (Cần Thay Thế)'}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                  {t('dispatch_badge_reported_busy')}
                </span>
              </div>

              {reportedBusyStaffList.length > 0 && (
                <div className="space-y-1.5">
                  {reportedBusyStaffList.map((st) => (
                    <div
                      key={st.staffId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                          {st.staffName?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {st.staffName}
                            </span>
                            <Badge variant={st.role === 'PRIMARY_MUA' ? 'gold' : 'neutral'} size="sm">
                              {st.role === 'PRIMARY_MUA' ? t('dispatch_badge_primary') : t('dispatch_badge_assistant')}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {st.staffPhone}
                          </span>
                          {st.cancellationReason && (
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 block mt-0.5">
                              Lý do: {cleanEmergencyReason(st.cancellationReason)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        {t('dispatch_badge_reported_busy')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(matrixData?.emergencyReason || booking?.emergencyReason) && (
                <div className="text-xs text-rose-800 dark:text-rose-200 font-medium pt-1 border-t border-rose-200 dark:border-rose-900/60">
                  <p>
                    <strong className="text-rose-900 dark:text-rose-100">{t('dispatch_emergency_reason_label')}</strong>{' '}
                    {cleanEmergencyReason(matrixData?.emergencyReason || booking?.emergencyReason)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-gold-400" />
            <p className="text-xs">{t('loading')}</p>
          </div>
        ) : showRejectForm ? (
          /* REJECT FORM VIEW */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_reject_reason')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {[
                  t('dispatch_reject_reason_full'),
                  t('dispatch_reject_reason_outside'),
                  t('dispatch_reject_reason_skill'),
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setRejectReason(reason);
                      setErrorMsg('');
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      rejectReason === reason
                        ? 'border-rose-300 dark:border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 font-medium'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('dispatch_reject_reason_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_reject_note')}
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                placeholder={t('dispatch_reject_note_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-2xs"
              />
            </div>
          </div>
        ) : (
          /* MATRIX SELECTION VIEW */
          <div className="space-y-5">
            {/* Guide & Summary */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {t('dispatch_filter_all')} ({matrixData?.totalStaffCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('qualified')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'qualified'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  {t('dispatch_filter_qualified')} ({matrixData?.qualifiedCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('unqualified')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'unqualified'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                  }`}
                >
                  {t('dispatch_filter_unqualified')} ({Math.max(0, (matrixData?.totalStaffCount || 0) - (matrixData?.qualifiedCount || 0))})
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{t('dispatch_assistants_count')}</span>
                <span className="font-bold text-amber-600 dark:text-gold-400">
                  {assistantStaffIds.length} / 2
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 max-h-[380px] overflow-y-auto shadow-xs">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 normal-case tracking-normal backdrop-blur font-semibold text-xs">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">{t('dispatch_table_col_staff')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_shift')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_package')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_style')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_calendar')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_status')}</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">{t('dispatch_table_col_primary')}</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">{t('dispatch_table_col_assistant')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(() => {
                    const displayedStaff = (matrixData?.staffList || []).filter((staff) => {
                      const qualified = isStaffQualified(staff);
                      if (filterTab === 'qualified') return qualified;
                      if (filterTab === 'unqualified') return !qualified;
                      return true;
                    });

                    if (displayedStaff.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            {t('no_data')}
                          </td>
                        </tr>
                      );
                    }

                    return displayedStaff.map((staff) => {
                      const isQualified = isStaffQualified(staff);
                      const isPrimary = primaryStaffId === staff.staffId && isQualified;
                      const isAssistant = assistantStaffIds.includes(staff.staffId);

                      return (
                        <tr
                          key={staff.staffId}
                          className={`transition-colors ${
                            staff.hasReportedBusy
                              ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/20'
                              : isPrimary
                              ? 'bg-amber-50/80 dark:bg-gold-500/10'
                              : isAssistant
                              ? 'bg-indigo-50/80 dark:bg-indigo-500/10'
                              : isQualified
                              ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                              : 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40'
                          }`}
                        >
                          {/* Staff Info */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              {staff.staffAvatarUrl ? (
                                <img
                                  src={staff.staffAvatarUrl}
                                  alt={staff.staffName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  {staff.staffName?.charAt(0) || 'M'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-200 line-clamp-1">
                                  {staff.staffName}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {staff.staffPhone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 1. Shift */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.isOvertime ? (
                              <div
                                title={`Làm thêm giờ ngoài ca (+${staff.overtimeMinutes} phút)`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs mx-auto"
                              >
                                <span>+{staff.overtimeMinutes}p</span>
                              </div>
                            ) : staff.hasShift ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 2. Package */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasPackage ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 3. Style */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasStyle ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 4. Calendar */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasCalendarFree ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* Overall Eligibility */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasReportedBusy ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                                {t('dispatch_badge_reported_busy')}
                              </span>
                            ) : isQualified ? (
                              staff.isOvertime ? (
                                <span
                                  title={`Tăng ca ${staff.overtimeMinutes} phút (Phụ cấp: +${formatCurrency(staff.overtimePay || 0)})`}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-2xs"
                                >
                                  Tăng ca (+{staff.overtimeMinutes}p)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                  {t('dispatch_badge_qualified')}
                                </span>
                              )
                            ) : (
                              <span
                                title={staff.disqualificationReason}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 cursor-help"
                              >
                                {t('dispatch_badge_unqualified')}
                              </span>
                            )}
                          </td>

                          {/* Select Primary MUA (Radio) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <input
                              type="radio"
                              name="primaryStaff"
                              checked={isPrimary}
                              disabled={!isQualified || staff.hasReportedBusy}
                              onChange={() => {
                                if (isQualified && !staff.hasReportedBusy) {
                                  handleSelectPrimary(staff.staffId);
                                }
                              }}
                              className="w-4 h-4 text-amber-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>

                          {/* Select Assistant MUA (Checkbox) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isAssistant}
                              disabled={
                                staff.hasReportedBusy ||
                                isPrimary ||
                                (!isAssistant && (!staff.hasShift || !staff.hasCalendarFree)) ||
                                (!isAssistant && assistantStaffIds.length >= 2)
                              }
                              onChange={() => handleToggleAssistant(staff.staffId)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* 4.5. Commission Distribution Section (Thợ chính & Thợ phụ) */}
            {selectedStaffList.length > 0 && (
              <div className="rounded-xl border border-amber-200/80 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/20 p-4 space-y-4 shadow-2xs">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {t('dispatch_commission_section_title') || 'Phân Bổ Hoa Hồng Cho Thợ'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('dispatch_commission_section_desc') || 'Chủ động điều chỉnh tỷ lệ hoa hồng hoặc số tiền chia cho thợ chính và thợ phụ'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Tổng giá trị đơn</span>
                      <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                        {formatCurrency(totalBookingAmount)}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">{t('dispatch_commission_remaining') || 'Doanh thu giữ lại'}</span>
                      <span className={`text-xs font-bold font-mono ${isCommissionExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {remainingRate}% ({formatCurrency(remainingAmount)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Visualizer Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {t('dispatch_commission_allocated') || 'Đã phân bổ'}:{' '}
                      <strong className={isCommissionExceeded ? 'text-rose-600 font-bold' : 'text-slate-900 dark:text-white'}>
                        {totalAllocatedRate}% / 100%
                      </strong>{' '}
                      ({formatCurrency(totalAllocatedAmount)})
                    </span>
                    {isCommissionExceeded && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {(t('dispatch_commission_err_total_exceeded') || 'Tổng hoa hồng của các thợ ({total}%) đã vượt quá 100% giá trị đơn hàng!')
                          .replace('{total}', totalAllocatedRate)}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                    {selectedStaffList.map((st, idx) => {
                      const split = commissionSplits[st.staffId];
                      const rate = Number(split?.commissionRate) || 0;
                      if (rate <= 0) return null;
                      const colors = [
                        'bg-amber-500',
                        'bg-indigo-500',
                        'bg-violet-500',
                      ];
                      return (
                        <div
                          key={st.staffId}
                          title={`${st.staffName}: ${rate}%`}
                          style={{ width: `${Math.min(100, rate)}%` }}
                          className={`h-full transition-all duration-300 ${isCommissionExceeded ? 'bg-rose-500' : colors[idx % colors.length]}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Staff Commission Cards / Rows */}
                <div className="grid grid-cols-1 gap-3">
                  {selectedStaffList.map((st) => {
                    const split = commissionSplits[st.staffId] || {};
                    const isPrimary = st.role === 'PRIMARY_MUA';
                    
                    let otherRates = 0;
                    Object.entries(commissionSplits).forEach(([id, item]) => {
                      if (Number(id) !== st.staffId) {
                        otherRates += Number(item.commissionRate) || 0;
                      }
                    });
                    const maxAllowedRate = Math.max(0, 100 - otherRates);
                    const maxAllowedAmount = totalBookingAmount > 0 ? Math.round((totalBookingAmount * maxAllowedRate) / 100) : 0;
                    const hasError = Boolean(split.error);

                    return (
                      <div
                        key={st.staffId}
                        className={`p-3 rounded-xl border transition-all ${
                          hasError
                            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Staff Info */}
                          <div className="flex items-center gap-2.5 min-w-[200px]">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPrimary
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                            }`}>
                              {st.staffName ? st.staffName.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                  {st.staffName}
                                </span>
                                <Badge variant={isPrimary ? 'warning' : 'info'} size="xs">
                                  {isPrimary ? t('col_role_primary') || 'Thợ chính' : t('col_role_assistant') || 'Thợ phụ'}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {st.staffPhone}
                              </span>
                            </div>
                          </div>

                          {/* Inputs: Rate & Amount & Note */}
                          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
                            {/* Commission Rate (%) */}
                            <div className="w-28 sm:w-32">
                              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                Tỷ lệ (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={split.commissionRate ?? ''}
                                  onChange={(e) => handleCommissionRateChange(st.staffId, e.target.value)}
                                  className={`w-full pl-2.5 pr-7 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 transition-colors ${
                                    hasError
                                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-amber-500'
                                  }`}
                                  placeholder="0"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                                  <Percent className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>

                            {/* Commission Amount (VND) */}
                            <div className="w-36 sm:w-40">
                              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                Thành tiền (VNĐ)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={split.commissionAmount ?? ''}
                                  onChange={(e) => handleCommissionAmountChange(st.staffId, e.target.value)}
                                  className={`w-full pl-2.5 pr-7 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-none focus:ring-1 transition-colors ${
                                    hasError
                                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-amber-500'
                                  }`}
                                  placeholder="0"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                                  đ
                                </div>
                              </div>
                            </div>

                            {/* Note */}
                            <div className="w-full sm:w-48">
                              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                Ghi chú hoa hồng
                              </label>
                              <input
                                type="text"
                                value={split.note || ''}
                                onChange={(e) => handleCommissionNoteChange(st.staffId, e.target.value)}
                                placeholder="Ghi chú phân chia..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Validation & Range Hint Footer */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-400">
                              {t('dispatch_commission_max_allowed') || 'Mức tối đa có thể nhận'}:{' '}
                              <strong className="text-slate-600 dark:text-slate-300">
                                {maxAllowedRate}% ({formatCurrency(maxAllowedAmount)})
                              </strong>
                            </span>
                            {st.isOvertime && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Tăng ca +{st.overtimeMinutes}p: +{formatCurrency(st.overtimePay || 0)} (theo quy chế Studio)
                              </span>
                            )}
                          </div>

                          {hasError ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-3 h-3" />
                              {split.error}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {split.commissionRate > 0 ? `Đã gán ${split.commissionRate}% hoa hồng` : 'Chưa gán hoa hồng'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_notes')}
              </label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                rows={2}
                placeholder={t('dispatch_notes_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>

    {/* Pop-up Confirmation Dialog for Dispatch */}
    <ConfirmDialog
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={handleExecuteDispatch}
      title={t('dispatch_confirm_dialog_title') || 'Xác Nhận Điều Phối Thợ'}
      message={
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
            {(() => {
              const primary = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
              const primaryName = primary?.staffName || '';
              const assistantNames = assistantStaffIds
                .map((id) => matrixData?.staffList?.find((s) => s.staffId === id)?.staffName)
                .filter(Boolean);
              const assistantText = assistantNames.length > 0 ? ` cùng thợ phụ (${assistantNames.join(', ')})` : '';
              return t('dispatch_confirm_dialog_msg')
                ?.replace('{primaryName}', primaryName)
                ?.replace('{assistantText}', assistantText)
                ?.replace('{bookingCode}', booking?.bookingCode || '') ||
                `Bạn có chắc chắn muốn phân công thợ ${primaryName}${assistantText} cho đơn #${booking?.bookingCode}?`;
            })()}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('col_booking_code')}:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">#{booking?.bookingCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('col_role_primary')}:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {matrixData?.staffList?.find((s) => s.staffId === primaryStaffId)?.staffName} ({matrixData?.staffList?.find((s) => s.staffId === primaryStaffId)?.staffPhone})
              </span>
            </div>
            {assistantStaffIds.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('col_role_assistant')}:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {assistantStaffIds
                    .map((id) => matrixData?.staffList?.find((s) => s.staffId === id)?.staffName)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            {selectedStaffList.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('dispatch_commission_section_title') || 'Hoa hồng phân chia'}:
                </span>
                {selectedStaffList.map((st) => {
                  const split = commissionSplits[st.staffId];
                  return (
                    <div key={st.staffId} className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        {st.staffName} ({st.role === 'PRIMARY_MUA' ? t('col_role_primary') || 'Thợ chính' : t('col_role_assistant') || 'Thợ phụ'}):
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {split?.commissionRate || 0}% (~{formatCurrency(split?.commissionAmount || 0)})
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center text-xs pt-1 font-semibold text-emerald-600 dark:text-emerald-400 border-t border-dashed border-slate-200 dark:border-slate-700">
                  <span>{t('dispatch_commission_remaining') || 'Doanh thu giữ lại Studio'}:</span>
                  <span>{remainingRate}% (~{formatCurrency(remainingAmount)})</span>
                </div>
              </div>
            )}
            {dispatchNotes?.trim() && (
              <div className="flex justify-between items-start gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('field_notes')}:</span>
                <span className="text-right text-slate-700 dark:text-slate-300 font-medium break-words">
                  {dispatchNotes}
                </span>
              </div>
            )}
          </div>
        </div>
      }
      confirmText={t('dispatch_btn_confirm')}
      cancelText={t('cancel')}
      variant="primary"
      isLoading={isSubmitting}
      zIndex="z-[10000]"
    />
    </>
  );
};
