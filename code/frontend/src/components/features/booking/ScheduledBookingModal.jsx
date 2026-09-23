import React, { useState, useEffect } from 'react';
import { useI18nStore } from '../../../store/useI18nStore';
import { useToastStore } from '../../../store/useToastStore';
import { bookingService } from '../../../services/booking.service';
import { scheduledBookingSchema } from '../../../schemas/booking.schema';
import { parseApiError } from '../../../utils/error';
import { TimeSlotGrid } from './TimeSlotGrid';
import { DepositCountdownTimer } from './DepositCountdownTimer';
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
} from 'lucide-react';

export const ScheduledBookingModal = ({
  isOpen,
  onClose,
  servicePackage,
  muaProfile,
  agencyProfile,
  bookingPartner = 'FREELANCER_DIRECT',
  onBookingSuccess,
}) => {
  const { t } = useI18nStore();
  const { addToast } = useToastStore();

  // State các bước
  // step 1: Chọn ngày, slot, địa chỉ -> Tạo đơn
  // step 2: Đếm ngược 15 phút & thanh toán cọc
  // step 3: Hoàn tất chốt lịch
  const [step, setStep] = useState(1);

  // Form State
  const [bookingDate, setBookingDate] = useState(() => {
    // Mặc định ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoords] = useState({ lat: 10.7769, lng: 106.7009 }); // Mặc định trung tâm TP.HCM
  const [note, setNote] = useState('');

  // Status & Error States
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDeposit, setIsConfirmingDeposit] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Booking result sau khi tạo
  const [createdBooking, setCreatedBooking] = useState(null);

  // Load danh sách slots khi đổi ngày hoặc đối tác MUA
  useEffect(() => {
    if (!isOpen || !bookingDate) return;

    if (bookingPartner === 'FREELANCER_DIRECT' && muaProfile?.id) {
      loadSlots(muaProfile.id, bookingDate);
    }
  }, [isOpen, bookingDate, bookingPartner, muaProfile?.id]);

  const loadSlots = async (muaId, date) => {
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await bookingService.getAvailableTimeSlots(muaId, date);
      setAvailableSlots(res.data || []);
    } catch (err) {
      const parsed = parseApiError(err);
      addToast(parsed.message, 'error');
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Submit tạo đơn đặt lịch hẹn trước
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      packageId: servicePackage?.id,
      bookingPartner,
      muaId: bookingPartner === 'FREELANCER_DIRECT' ? muaProfile?.id : null,
      agencyId: bookingPartner === 'AGENCY_DISPATCH' ? agencyProfile?.id : null,
      bookingDate,
      startTime: selectedSlot?.slotStartTime ? selectedSlot.slotStartTime.substring(0, 5) : '',
      destinationAddress,
      destinationLatitude: destinationCoords.lat,
      destinationLongitude: destinationCoords.lng,
      note,
    };

    // Client Zod Validation
    const validation = scheduledBookingSchema.safeParse(payload);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookingService.createScheduledBooking(payload);
      setCreatedBooking(res.data);
      setStep(2); // Chuyển sang bước đếm ngược 15 phút
      addToast(t('booking.scheduled_created_success'), 'success');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        setFormErrors(parsed.fieldErrors);
      }
      addToast(parsed.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khách bấm thanh toán cọc 30%
  const handleConfirmDeposit = async () => {
    if (!createdBooking?.bookingId) return;

    setIsConfirmingDeposit(true);
    try {
      await bookingService.confirmDepositPayment(createdBooking.bookingId);
      setStep(3); // Hoàn tất
      addToast(t('msg_deposit_confirmed'), 'success');
      if (onBookingSuccess) onBookingSuccess(createdBooking);
    } catch (err) {
      const parsed = parseApiError(err);
      addToast(parsed.message, 'error');
    } finally {
      setIsConfirmingDeposit(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{t('scheduled_booking_title')}</h3>
              <p className="text-xs text-slate-400">{t('scheduled_booking_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Thông tin gói dịch vụ & MUA */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">
                Gói Dịch Vụ
              </span>
              <h4 className="text-sm font-bold text-slate-100">{servicePackage?.name || 'Gói Trang Điểm'}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {bookingPartner === 'FREELANCER_DIRECT'
                  ? `Thợ: ${muaProfile?.fullName || 'Chuyên gia MUA'}`
                  : `Studio: ${agencyProfile?.agencyName || 'Agency Partner'}`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">{t('field_total_amount')}</span>
              <div className="text-base font-bold text-amber-400 font-mono">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  servicePackage?.price || 0,
                )}
              </div>
            </div>
          </div>

          {/* BƯỚC 1: FORM CHỌN NGÀY, SLOT VÀ ĐỊA CHỈ */}
          {step === 1 && (
            <form onSubmit={handleCreateBooking} className="space-y-5">
              {/* Chọn Ngày Hẹn */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                  {t('field_booking_date')}
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500/70"
                />
                {formErrors.bookingDate && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.bookingDate}</span>
                )}
              </div>

              {/* Lưới Khung Giờ Làm Việc (TimeSlotGrid) */}
              {bookingPartner === 'FREELANCER_DIRECT' ? (
                <div>
                  <TimeSlotGrid
                    slots={availableSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={setSelectedSlot}
                    isLoading={isLoadingSlots}
                  />
                  {formErrors.startTime && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.startTime}</span>
                  )}
                </div>
              ) : (
                /* Agency Dispatch: Chọn giờ trực tiếp */
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {t('field_start_time')}
                  </label>
                  <input
                    type="time"
                    onChange={(e) =>
                      setSelectedSlot({
                        slotStartTime: e.target.value,
                        isAvailable: true,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500/70"
                  />
                  {formErrors.startTime && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.startTime}</span>
                  )}
                </div>
              )}

              {/* Địa chỉ làm đẹp */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Địa Chỉ Phục Vụ Tận Nơi
                </label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Nhập số nhà, tên đường, phường, quận..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500/70"
                />
                {formErrors.destinationAddress && (
                  <span className="text-xs text-rose-400 mt-1 block">
                    {formErrors.destinationAddress}
                  </span>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Ghi Chú Yêu Cầu (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Da nhạy cảm, tone makeup tự nhiên..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500/70 resize-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || (bookingPartner === 'FREELANCER_DIRECT' && !selectedSlot)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('loading') : t('btn_confirm_booking_deposit')}
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 2: BỘ ĐẾM NGƯỢC 15 PHÚT & THANH TOÁN CỌC 30% */}
          {step === 2 && createdBooking && (
            <div className="space-y-4">
              <DepositCountdownTimer
                depositExpiredAt={createdBooking.depositExpiredAt}
                depositAmount={createdBooking.depositAmount}
                bookingCode={createdBooking.bookingCode}
                onConfirmDeposit={handleConfirmDeposit}
                onExpired={() => {
                  addToast(t('msg_deposit_expired'), 'error');
                }}
                isConfirming={isConfirmingDeposit}
              />
            </div>
          )}

          {/* BƯỚC 3: ĐẶT LỊCH THÀNH CÔNG */}
          {step === 3 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-100">{t('msg_deposit_confirmed')}</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Đơn đặt lịch của bạn đã được chốt chính thức. Thợ trang điểm sẽ đến phục vụ đúng khung
                giờ đã hẹn!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold transition-colors"
              >
                {t('close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
