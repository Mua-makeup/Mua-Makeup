import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { Sparkles, X, ArrowRight, Clock, Bell, User, UserPlus, Phone, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { USER_ROLES } from '../../../constants/roles.constant';
import { agencyService } from '../../../services/agency.service';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useI18nStore } from '../../../store/useI18nStore';
import { formatCurrency, formatBookingDateTime } from '../../../utils/formatters';
import { notificationSound } from '../../../utils/notificationSound';

export const AgencyRealtimeNotifier = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { t } = useI18nStore();
  const { addNotification } = useNotificationStore();
  const [activeToast, setActiveToast] = useState(null);
  const [studioLogo, setStudioLogo] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (role !== USER_ROLES.AGENCY_ADMIN) return;

    let isMounted = true;
    let stompClient = null;

    const setupRealtime = async () => {
      let agencyId = user?.agencyId || null;
      try {
        const res = await agencyService.getMyProfile();
        const profile = res?.data || res;
        if (profile?.id) {
          agencyId = profile.id;
        }
        if (profile?.logoUrl) {
          setStudioLogo(profile.logoUrl);
        }
      } catch (err) {
        console.warn('[AgencyRealtimeNotifier] Failed to load agency profile:', err);
      }

      if (!isMounted) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname || 'localhost';
      const brokerURL = `${wsProtocol}//${wsHost}:8080/ws-makeup`;

      const handleMessage = (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (!payload) return;

          // Check if belongs to this agency
          if (agencyId && payload.agencyId && String(payload.agencyId) !== String(agencyId)) {
            return;
          }

          if (payload.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
            // 1. Dispatch window events IMMEDIATELY so table and detail views auto-reload without user clicking
            window.dispatchEvent(
              new CustomEvent('agency:emergency-dispatch', { detail: payload })
            );
            window.dispatchEvent(
              new CustomEvent('agency:dispatch-alert', { detail: payload })
            );
            window.dispatchEvent(
              new CustomEvent('agency:new-booking', { detail: payload })
            );

            // 2. Play distinct emergency sound alarm
            notificationSound.playEmergencyAlert();

            // 3. Add to notification store
            const notifItem = addNotification({
              id: payload.id,
              type: 'EMERGENCY_REASSIGNMENT_ALERT',
              title: t('notification_emergency_title'),
              bookingId: payload.bookingId,
              bookingCode: payload.bookingCode,
              staffId: payload.staffId,
              staffName: payload.staffName,
              emergencyReason: payload.emergencyReason,
              emergencyTier: payload.emergencyTier,
              proofDocumentUrl: payload.proofDocumentUrl,
              timestamp: payload.timestamp || Date.now(),
            });

            // 4. Always show floating toast for emergency
            const toastData = notifItem || {
              id: payload.id || `emerg_${Date.now()}`,
              type: 'EMERGENCY_REASSIGNMENT_ALERT',
              title: t('notification_emergency_title'),
              bookingId: payload.bookingId,
              bookingCode: payload.bookingCode,
              staffName: payload.staffName,
              emergencyReason: payload.emergencyReason,
              emergencyTier: payload.emergencyTier,
              proofDocumentUrl: payload.proofDocumentUrl,
              timestamp: Date.now(),
            };

            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(toastData);
            toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 12000);
          } else if (payload.type === 'NEW_BOOKING') {
            window.dispatchEvent(
              new CustomEvent('agency:new-booking', { detail: payload })
            );

            notificationSound.playBookingChime();

            const notifItem = addNotification({
              id: payload.id,
              type: 'NEW_BOOKING',
              title: t('notification_new_booking_title'),
              bookingId: payload.bookingId,
              bookingCode: payload.bookingCode,
              customerName: payload.customerName || 'Khách hàng',
              customerPhone: payload.customerPhone,
              servicePackageName: payload.servicePackageName || 'Gói dịch vụ',
              totalAmount: payload.totalAmount,
              bookingDate: payload.bookingDate,
              startTime: payload.startTime,
              timestamp: payload.timestamp || Date.now(),
            });

            const toastData = notifItem || {
              id: payload.id || `book_${Date.now()}`,
              type: 'NEW_BOOKING',
              title: t('notification_new_booking_title'),
              bookingId: payload.bookingId,
              bookingCode: payload.bookingCode,
              customerName: payload.customerName || 'Khách hàng',
              customerPhone: payload.customerPhone,
              servicePackageName: payload.servicePackageName || 'Gói dịch vụ',
              totalAmount: payload.totalAmount,
              timestamp: Date.now(),
            };

            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(toastData);
            toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 8000);
          } else if (payload.type === 'STAFF_APPLICATION') {
            window.dispatchEvent(
              new CustomEvent('agency:staff-application', { detail: payload })
            );

            notificationSound.playBookingChime();

            const notifItem = addNotification({
              id: payload.id,
              type: 'STAFF_APPLICATION',
              title: payload.title || t('notification_staff_application_title'),
              content: payload.content,
              muaName: payload.muaName,
              muaPhone: payload.muaPhone,
              inviteCode: payload.inviteCode,
              staffId: payload.staffId,
              timestamp: payload.timestamp || Date.now(),
            });

            const toastData = notifItem || {
              id: payload.id || `app_${Date.now()}`,
              type: 'STAFF_APPLICATION',
              title: payload.title || t('notification_staff_application_title'),
              muaName: payload.muaName,
              muaPhone: payload.muaPhone,
              inviteCode: payload.inviteCode,
              timestamp: Date.now(),
            };

            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(toastData);
            toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 8000);
          }
        } catch (e) {
          console.warn('[AgencyRealtimeNotifier] Error parsing message:', e);
        }
      };

      stompClient = new Client({
        brokerURL,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          if (agencyId) {
            stompClient.subscribe(`/topic/agency/${agencyId}/bookings`, handleMessage);
            stompClient.subscribe(`/topic/agency/${agencyId}/staff-applications`, handleMessage);
            stompClient.subscribe(`/topic/agency/${agencyId}/dispatch-alerts`, handleMessage);
          }
          // Also subscribe to non-parameterized topics as fallback
          stompClient.subscribe('/topic/agency/bookings', handleMessage);
          stompClient.subscribe('/topic/agency/staff-applications', handleMessage);
          stompClient.subscribe('/topic/agency/dispatch-alerts', handleMessage);
        },
        onStompError: (frame) => {
          console.warn('[AgencyRealtimeNotifier] STOMP Error:', frame.headers['message']);
        },
      });

      stompClient.activate();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [role, user?.agencyId, addNotification, t]);

  if (!activeToast) return null;

  const isEmergency = activeToast.type === 'EMERGENCY_REASSIGNMENT_ALERT';
  const isStaffApp = activeToast.type === 'STAFF_APPLICATION';

  return (
    <aside
      aria-label={isEmergency ? 'Emergency Alert' : isStaffApp ? 'Staff Application Alert' : 'New Booking Alert'}
      className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[1250] sm:max-w-sm w-auto sm:w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-2xl border-2 duration-300 ring-4 animate-in slide-in-from-bottom-5 ${
        isEmergency
          ? 'border-2 border-red-600 ring-red-500/25'
          : isStaffApp
          ? 'border-indigo-500/40 dark:border-indigo-500/30 ring-indigo-500/10'
          : 'border-amber-500/40 dark:border-amber-500/30 ring-amber-500/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {studioLogo && !isEmergency ? (
            <img
              src={studioLogo}
              alt="Studio"
              className={`w-10 h-10 rounded-xl object-cover border shadow-md shrink-0 ${
                isStaffApp
                  ? 'border-indigo-200 dark:border-indigo-800'
                  : 'border-rose-200 dark:border-rose-800'
              }`}
            />
          ) : isEmergency ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
          ) : isStaffApp ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>
                {isEmergency
                  ? t('notification_emergency_title')
                  : isStaffApp
                  ? t('notification_staff_application_title')
                  : t('notification_new_booking_title')}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                  isEmergency ? 'bg-red-600' : isStaffApp ? 'bg-indigo-500' : 'bg-amber-500'
                }`}
              >
                {isEmergency ? t('emergency_badge') : t('new_badge')}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              #{isStaffApp ? activeToast.inviteCode : activeToast.bookingCode}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveToast(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isEmergency ? (
        <div className="mt-3 bg-red-50 dark:bg-red-950/70 rounded-xl p-3 border-2 border-red-500 space-y-1.5 text-xs shadow-xs">
          <div className="flex items-center justify-between text-slate-900 dark:text-white">
            <span className="text-red-700 dark:text-red-300 flex items-center gap-1 font-bold">
              <User className="w-3.5 h-3.5" />
              {t('artist_label')}:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">{activeToast.staffName}</span>
          </div>

          <div className="text-xs text-slate-900 dark:text-white font-semibold leading-relaxed pt-1.5 border-t border-red-200 dark:border-red-800">
            <p>
              <strong className="text-red-800 dark:text-red-200">{t('dispatch_emergency_reason_label')}:</strong>{' '}
              {activeToast.emergencyReason}
            </p>
          </div>
        </div>
      ) : isStaffApp ? (
        <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              {t('artist_label')}
            </span>
            <span className="font-bold truncate max-w-[180px]">{activeToast.muaName}</span>
          </div>

          {activeToast.muaPhone && (
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {t('phone_label')}
              </span>
              <span className="font-mono text-[11px]">{activeToast.muaPhone}</span>
            </div>
          )}

          {activeToast.content && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              "{activeToast.content}"
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {t('customer_label')}
            </span>
            <span className="font-bold truncate max-w-[180px]">{activeToast.customerName}</span>
          </div>

          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t('package_label')}
            </span>
            <span className="font-medium truncate max-w-[180px]">{activeToast.servicePackageName}</span>
          </div>

          {activeToast.bookingDate && (
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {t('appointment_time')}
              </span>
              <span className="font-mono text-[11px]">
                {formatBookingDateTime(activeToast.startTime, activeToast.bookingDate)}
              </span>
            </div>
          )}

          {activeToast.totalAmount && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">{t('total_amount_label')}</span>
              <span className="font-bold text-amber-600 dark:text-gold-400">
                {formatCurrency(activeToast.totalAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveToast(null);
            navigate(isStaffApp ? '/agency/staff' : '/agency/bookings');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
            isEmergency
              ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/20'
              : isStaffApp
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/20'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-amber-500/20'
          }`}
        >
          <span>
            {isEmergency
              ? t('notification_emergency_reassign_btn')
              : isStaffApp
              ? t('btn_review_application')
              : t('btn_view_booking_detail')}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
