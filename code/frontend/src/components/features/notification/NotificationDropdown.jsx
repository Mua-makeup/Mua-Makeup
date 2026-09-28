import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Building2,
  ExternalLink,
  Clock,
  UserPlus,
  Award,
  ShieldAlert,
} from 'lucide-react';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useI18nStore } from '../../../store/useI18nStore';
import { formatCurrency, formatDate, formatBookingDateTime } from '../../../utils/formatters';

export const NotificationDropdown = ({ agencyLogo }) => {
  const navigate = useNavigate();
  const { t, language } = useI18nStore();
  const {
    notifications,
    isLoading,
    isSoundEnabled,
    fetchNotifications,
    toggleSound,
    markAsRead,
    toggleRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationTitle = (notif) => {
    if (notif.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
      return t('notification_emergency_title');
    }
    if (notif.type === 'STAFF_APPLICATION') {
      return t('notification_staff_application_title');
    }
    if (notif.type === 'CERTIFICATE_VERIFICATION') {
      return t('notification_cert_verification_title');
    }
    if (notif.type === 'NEW_BOOKING') {
      return t('notification_new_booking_title');
    }
    if (notif.title === 'Có Đơn Đặt Lịch Mới!' || notif.title === 'New Booking Request!') {
      return t('notification_new_booking_title');
    }
    if (notif.title === 'Đơn Gia Nhập Mới!' || notif.title === 'New Staff Application!') {
      return t('notification_staff_application_title');
    }
    if (notif.title === 'Chứng Chỉ Mới Cần Duyệt!' || notif.title === 'New Certificate to Verify!') {
      return t('notification_cert_verification_title');
    }
    if (notif.title === 'Cảnh Báo Báo Bận Đột Xuất!' || notif.title === 'Emergency Unavailability Alert!') {
      return t('notification_emergency_title');
    }
    return notif.title || t('notifications_title');
  };

  const getNotificationContent = (notif) => {
    if (notif.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
      const staffName = notif.staffName || (notif.metadata && notif.metadata.staffName) || 'Thợ';
      const bookingCode = notif.bookingCode || (notif.metadata && notif.metadata.bookingCode) || '';
      return t('notification_emergency_desc', { staffName, bookingCode }) || notif.content;
    }
    if (notif.type === 'STAFF_APPLICATION') {
      const name = notif.muaName || notif.customerName || 'MUA';
      return t('notif_staff_joined_desc', { name });
    }
    if (notif.type === 'CERTIFICATE_VERIFICATION') {
      const name = notif.muaName || notif.customerName || 'MUA';
      return t('notif_cert_uploaded_desc', { name });
    }
    return notif.content;
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return t('just_now');
    const diffSeconds = Math.floor((Date.now() - Number(ts)) / 1000);
    if (diffSeconds < 60) return t('just_now');
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) {
      return language === 'vi'
        ? `${minutes} ${t('time_minutes_ago')}`
        : `${minutes}${t('time_minutes_ago')}`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return language === 'vi'
        ? `${hours} ${t('time_hours_ago')}`
        : `${hours}${t('time_hours_ago')}`;
    }
    return formatDate(ts);
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
      navigate('/agency/bookings');
    } else if (notif.type === 'STAFF_APPLICATION') {
      navigate('/agency/staff');
    } else if (notif.type === 'CERTIFICATE_VERIFICATION') {
      navigate('/admin/muas/credentials');
    } else {
      navigate('/agency/bookings');
    }
  };

  const renderNotifIcon = (notif) => {
    if (notif.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-rose-200 dark:border-rose-800 flex items-center justify-center bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'STAFF_APPLICATION') {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <UserPlus className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'CERTIFICATE_VERIFICATION') {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-amber-200 dark:border-amber-800 flex items-center justify-center bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
          <Award className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-rose-200 dark:border-rose-700 flex items-center justify-center bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
        {agencyLogo ? (
          <img src={agencyLogo} alt="Studio" className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) fetchNotifications();
            return next;
          });
        }}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative focus:outline-none focus:ring-2 focus:ring-rose-500/20"
        title={t('notifications_title')}
      >
        <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1150] bg-slate-950/20 backdrop-blur-2xs sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-[68px] sm:inset-x-auto sm:right-0 sm:top-full sm:absolute sm:mt-2 w-auto sm:w-96 max-w-none sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-[1200] animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[calc(100vh-84px)]">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {t('notifications_title')}
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                  {unreadCount} {t('new_badge').toLowerCase()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Mute/Unmute Toggle Button */}
              <button
                type="button"
                onClick={toggleSound}
                className={`p-1.5 rounded-md transition-colors ${
                  isSoundEnabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isSoundEnabled ? t('notification_sound_on') : t('notification_sound_off')}
              >
                {isSoundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </button>

              {/* Mark All As Read Button */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={t('mark_all_read')}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Clear All Notifications */}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title={t('clear_all_notifications')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[calc(100vh-180px)] sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">{t('loading')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('notifications_empty')}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-4 py-3 cursor-pointer transition-colors relative flex gap-3 ${
                    !notif.isRead
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {!notif.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute left-2 top-4" />
                  )}

                  {renderNotifIcon(notif)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!notif.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {getNotificationTitle(notif)}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mr-0.5 whitespace-nowrap">
                          {formatTimeAgo(notif.timestamp)}
                        </span>

                        {/* Toggle Read/Unread per item */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRead(notif.id);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            notif.isRead
                              ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                              : 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/50'
                          }`}
                          title={notif.isRead ? t('mark_as_unread') : t('mark_as_read')}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete this notification item */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={t('delete_notification')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content details depending on notification type */}
                    {notif.type === 'STAFF_APPLICATION' ? (
                      <>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                          {getNotificationContent(notif)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] flex-wrap">
                          {notif.inviteCode && (
                            <span className="font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                              {notif.inviteCode}
                            </span>
                          )}
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {t('btn_review_application')}
                          </span>
                        </div>
                      </>
                    ) : notif.type === 'CERTIFICATE_VERIFICATION' ? (
                      <>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                          {getNotificationContent(notif)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] flex-wrap">
                          {notif.certName && (
                            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium truncate max-w-[150px]">
                              {notif.certName}
                            </span>
                          )}
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {t('btn_verify_certificate')}
                          </span>
                        </div>
                      </>
                    ) : notif.type === 'EMERGENCY_REASSIGNMENT_ALERT' ? (
                      <>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-snug line-clamp-2 font-medium">
                          {getNotificationContent(notif)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] flex-wrap">
                          {notif.bookingCode && (
                            <span className="font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              #{notif.bookingCode}
                            </span>
                          )}
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {t('notification_emergency_reassign_btn')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                          <span className="font-semibold">{notif.customerName}</span> • {notif.servicePackageName}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {notif.bookingCode && (
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              #{notif.bookingCode}
                            </span>
                          )}
                          {notif.bookingDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {formatBookingDateTime(notif.startTime, notif.bookingDate)}
                            </span>
                          )}
                          {notif.totalAmount && (
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              {formatCurrency(notif.totalAmount)}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/agency/bookings');
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-center gap-1.5 w-full py-1 transition-colors cursor-pointer"
              >
                <span>{t('view_all_bookings')}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
