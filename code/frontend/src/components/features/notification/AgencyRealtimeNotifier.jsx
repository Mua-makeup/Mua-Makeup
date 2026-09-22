import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { Sparkles, X, ArrowRight, Clock, Bell, User } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { USER_ROLES } from '../../../constants/roles.constant';
import { agencyService } from '../../../services/agency.service';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyRealtimeNotifier = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
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
      let agencyId = null;
      try {
        const res = await agencyService.getMyProfile();
        const profile = res?.data || res;
        agencyId = profile?.id;
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
          if (payload && payload.type === 'NEW_BOOKING') {
            // Check if this booking belongs to this agency
            if (agencyId && payload.agencyId && payload.agencyId !== agencyId) {
              return;
            }

            // 1. Add to Zustand store (automatically plays sound chime if enabled, returns null if duplicate)
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

            if (!notifItem) {
              // Duplicate notification, ignore
              return;
            }

            // 2. Dispatch custom event so pages like AgencyBookingsPage can auto-refresh
            window.dispatchEvent(
              new CustomEvent('agency:new-booking', { detail: payload })
            );

            // 3. Show floating toast popup
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
            }
            setActiveToast(notifItem);
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 8000);
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
          } else {
            stompClient.subscribe('/topic/agency/bookings', handleMessage);
          }
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
  }, [role, addNotification, t]);

  if (!activeToast) return null;

  const formatPrice = (val) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <aside
      aria-label="New Booking Alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-rose-500/40 dark:border-rose-500/30 animate-in slide-in-from-bottom-5 duration-300 ring-4 ring-rose-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {studioLogo ? (
            <img
              src={studioLogo}
              alt="Studio"
              className="w-10 h-10 rounded-xl object-cover border border-rose-200 dark:border-rose-800 shadow-md shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shadow-md animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{t('notification_new_booking_title')}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                {t('new_badge')}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              #{activeToast.bookingCode}
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
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            {t('package_label')}
          </span>
          <span className="font-medium truncate max-w-[180px]">{activeToast.servicePackageName}</span>
        </div>

        {activeToast.bookingDate && (
          <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Lịch hẹn:
            </span>
            <span className="font-mono text-[11px]">
              {activeToast.startTime} {activeToast.bookingDate}
            </span>
          </div>
        )}

        {activeToast.totalAmount && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">{t('total_amount_label')}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatPrice(activeToast.totalAmount)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveToast(null);
            navigate('/agency/bookings');
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
        >
          <span>{t('btn_view_booking_detail')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
