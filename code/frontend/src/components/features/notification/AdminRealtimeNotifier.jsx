import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { Award, X, ArrowRight, User, FileText } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { USER_ROLES } from '../../../constants/roles.constant';
import { useNotificationStore, mapServerNotification } from '../../../store/useNotificationStore';
import { useI18nStore } from '../../../store/useI18nStore';
import { notificationService } from '../../../services/notification.service';
import { notificationSound } from '../../../utils/notificationSound';

export const AdminRealtimeNotifier = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useI18nStore();
  const { addNotification } = useNotificationStore();
  const [activeToast, setActiveToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (role !== USER_ROLES.SUPER_ADMIN) return;

    let isMounted = true;
    let stompClient = null;

    // Check unread certificate verifications on login / mount
    const checkUnreadOnLogin = async () => {
      try {
        const notifRes = await notificationService.getNotifications(0, 15);
        const notifData = notifRes?.data || notifRes || {};
        const list = Array.isArray(notifData) ? notifData : notifData.content || [];
        const unreadList = list
          .filter((item) => !item.isRead && item.type === 'CERTIFICATE_VERIFICATION')
          .map(mapServerNotification);

        if (isMounted && unreadList.length > 0) {
          let dismissedIds = [];
          try {
            const raw = sessionStorage.getItem('admin_dismissed_toast_ids');
            dismissedIds = raw ? JSON.parse(raw) : [];
          } catch {
            dismissedIds = [];
          }

          const candidateList = unreadList.filter((item) => !dismissedIds.includes(String(item.id)));
          if (candidateList.length > 0) {
            const targetItem = candidateList[0];
            const otherCount = candidateList.length - 1;
            const toastData = {
              ...targetItem,
              otherCount: otherCount > 0 ? otherCount : 0,
            };

            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(toastData);
            notificationSound.playBookingChime();
            toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 10000);
          }
        }
      } catch (err) {
        console.warn('[AdminRealtimeNotifier] Failed to check unread certificates on login:', err);
      }
    };

    checkUnreadOnLogin();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const brokerURL = `${wsProtocol}//${wsHost}:8080/ws-makeup`;

    const handleMessage = (message) => {
      if (!isMounted) return;
      try {
        const payload = JSON.parse(message.body);
        if (!payload) return;

        if (payload.type === 'CERTIFICATE_VERIFICATION') {
          const notifItem = addNotification({
            id: payload.id,
            type: 'CERTIFICATE_VERIFICATION',
            title: payload.title || t('notification_cert_verification_title'),
            content: payload.content,
            muaName: payload.muaName,
            certName: payload.certName,
            imageUrl: payload.imageUrl,
            timestamp: payload.timestamp || Date.now(),
          });

          if (!notifItem) return;

          window.dispatchEvent(
            new CustomEvent('admin:certificate-uploaded', { detail: payload })
          );

          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          setActiveToast(notifItem);
          notificationSound.playBookingChime();
          toastTimeoutRef.current = setTimeout(() => setActiveToast(null), 8000);
        }
      } catch (e) {
        console.warn('[AdminRealtimeNotifier] Error parsing message:', e);
      }
    };

    stompClient = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        stompClient.subscribe('/topic/admin/notifications', handleMessage);
      },
      onStompError: (frame) => {
        console.warn('[AdminRealtimeNotifier] STOMP Error:', frame.headers?.message);
      },
    });

    stompClient.activate();

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

  return (
    <aside
      aria-label="Admin Certificate Verification Alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-amber-500/40 dark:border-amber-500/30 ring-4 ring-amber-500/10 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md animate-bounce shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>{t('notification_cert_verification_title')}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                {t('new_badge')}
              </span>
              {activeToast.otherCount > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  +{activeToast.otherCount} chứng chỉ khác
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('cert_review_request')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeToast?.id) {
              try {
                const raw = sessionStorage.getItem('admin_dismissed_toast_ids');
                const dismissed = raw ? JSON.parse(raw) : [];
                if (!dismissed.includes(String(activeToast.id))) {
                  dismissed.push(String(activeToast.id));
                  sessionStorage.setItem('admin_dismissed_toast_ids', JSON.stringify(dismissed));
                }
              } catch {
                // ignore
              }
            }
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(null);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-500" />
            {t('artist_label')}
          </span>
          <span className="font-bold truncate max-w-[180px]">{activeToast.muaName}</span>
        </div>

        <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {t('certificate_label')}
          </span>
          <span className="font-medium truncate max-w-[180px] text-amber-600 dark:amber-400">
            {activeToast.certName}
          </span>
        </div>

        {activeToast.imageUrl && (
          <div className="pt-2 flex items-center gap-2">
            <img
              src={activeToast.imageUrl}
              alt={activeToast.certName}
              className="w-12 h-12 object-cover rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('cert_image_preview')}
            </span>
          </div>
        )}

        {activeToast.content && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            "{activeToast.content}"
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (activeToast?.id) {
              try {
                const raw = sessionStorage.getItem('admin_dismissed_toast_ids');
                const dismissed = raw ? JSON.parse(raw) : [];
                if (!dismissed.includes(String(activeToast.id))) {
                  dismissed.push(String(activeToast.id));
                  sessionStorage.setItem('admin_dismissed_toast_ids', JSON.stringify(dismissed));
                }
                notificationService.markAsRead(activeToast.id).catch(() => {});
              } catch {
                // ignore
              }
            }
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setActiveToast(null);
            navigate('/admin/muas/credentials');
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
        >
          <span>{t('btn_verify_certificate')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
