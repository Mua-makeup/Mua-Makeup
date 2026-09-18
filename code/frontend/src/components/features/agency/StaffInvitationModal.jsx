import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Download,
  Trash2,
  Clock,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { agencyService } from '../../../services/agency.service';
import { staffInvitationSchema } from '../../../schemas/agency.schema';
import { formatDate } from '../../../utils/formatters';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffInvitationModal = ({ isOpen, onClose, onStaffAdded }) => {
  const { t } = useI18nStore();
  const [invitations, setInvitations] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [proposedCommissionRate, setProposedCommissionRate] = useState(30);
  const [expireHours, setExpireHours] = useState(72);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  const [activeInvite, setActiveInvite] = useState(null);
  const [cancelingInviteCode, setCancelingInviteCode] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvitations = async () => {
    try {
      const res = await agencyService.getInvitations();
      const list = res.data || res || [];
      setInvitations(list);
      if (list.length > 0 && !activeInvite) {
        setActiveInvite(list[0]);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    const validation = staffInvitationSchema.safeParse({
      proposedCommissionRate: Number(proposedCommissionRate),
      expireHours: Number(expireHours),
      note,
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('invalid_data'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await agencyService.createInvitation({
        proposedCommissionRate: Number(proposedCommissionRate),
        expireHours: Number(expireHours),
        note,
      });
      const newInv = res.data || res;
      setActiveInvite(newInv);
      setIsCreating(false);
      setNote('');
      await loadInvitations();
      onStaffAdded?.();
    } catch (err) {
      setError(err.message || t('qr_create_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCancelInvite = async () => {
    if (!cancelingInviteCode) return;
    setIsCanceling(true);
    try {
      await agencyService.cancelInvitation(cancelingInviteCode);
      if (activeInvite?.inviteCode === cancelingInviteCode) {
        setActiveInvite(null);
      }
      setCancelingInviteCode(null);
      await loadInvitations();
    } catch (err) {
      setError(err.message || t('qr_revoke_error'));
    } finally {
      setIsCanceling(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(''), 2000);
    } else {
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(''), 2000);
    }
  };

  const downloadQrImage = (base64Data, filename) => {
    if (!base64Data) return;
    const a = document.createElement('a');
    a.href = base64Data;
    a.download = filename || 'agency_invite_qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <QrCode className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{t('qr_modal_title')}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Tạo mã mới nếu isCreating */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('qr_form_title')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('qr_field_commission')}
                type="number"
                min="0"
                max="60"
                value={proposedCommissionRate}
                onChange={(e) => setProposedCommissionRate(e.target.value)}
                helperText={t('qr_field_commission_helper')}
                required
              />
              <Input
                label={t('qr_field_expire')}
                type="number"
                min="1"
                max="168"
                value={expireHours}
                onChange={(e) => setExpireHours(e.target.value)}
                helperText={t('qr_field_expire_helper')}
                required
              />
            </div>
            <Input
              label={t('qr_field_note')}
              type="text"
              placeholder={t('qr_field_note_placeholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCreating(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                {t('qr_btn_create')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('qr_hint_zxing')}
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreating(true)}
            >
              {t('qr_create_new')}
            </Button>
          </div>
        )}

        {/* Hiển thị QR chi tiết nếu có activeInvite */}
        {activeInvite ? (
          <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Cột QR Code */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              {activeInvite.qrCodeBase64 ? (
                <img
                  src={activeInvite.qrCodeBase64}
                  alt={t('qr_recruitment_alt')}
                  className="w-44 h-44 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1.5 shadow-xs"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('qr_expires_at')} {formatDate(activeInvite.expiresAt)}</span>
              </div>
            </div>

            {/* Cột Thông tin & Thao tác */}
            <div className="sm:col-span-7 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('qr_invite_code_label')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                    {activeInvite.inviteCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeInvite.inviteCode, 'code')}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    title={t('qr_copy_code')}
                  >
                    {copiedCode === activeInvite.inviteCode ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('qr_direct_link_label')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/join?code=${activeInvite.inviteCode}`}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 select-all"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/join?code=${activeInvite.inviteCode}`,
                        'link'
                      )
                    }
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    title={t('qr_copy_link')}
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('qr_link_hint')}
                </p>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() =>
                    downloadQrImage(activeInvite.qrCodeBase64, `QR_${activeInvite.inviteCode}.png`)
                  }
                >
                  {t('qr_btn_download')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setCancelingInviteCode(activeInvite.inviteCode)}
                >
                  {t('qr_btn_cancel_invite')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
            {t('qr_empty_active')}
          </div>
        )}

        {/* Danh sách các mã mời đã tạo */}
        {invitations.length > 1 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('qr_other_invites_title')} ({invitations.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {invitations.map((inv) => (
                <div
                  key={inv.inviteCode}
                  onClick={() => setActiveInvite(inv)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer text-xs transition-colors ${
                    activeInvite?.inviteCode === inv.inviteCode
                      ? 'border-rose-300 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/40 text-slate-900 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{inv.inviteCode}</span>
                    <span className="text-slate-400">({inv.proposedCommissionRate || 30}%)</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {t('qr_expires_at')} {formatDate(inv.expiresAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>

    <ConfirmDialog
      isOpen={Boolean(cancelingInviteCode)}
      onClose={() => setCancelingInviteCode(null)}
      onConfirm={handleConfirmCancelInvite}
      isLoading={isCanceling}
      title={t('confirm_cancel_invite_title')}
      message={`${t('confirm_cancel_invite_msg')} (${cancelingInviteCode})`}
      confirmText={t('qr_btn_cancel_invite')}
      variant="danger"
    />
  </>
);
};
