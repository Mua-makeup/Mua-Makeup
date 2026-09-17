import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, ExternalLink, User } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Textarea } from '../../base/Textarea';
import { verifyCertificateSchema } from '../../../schemas/super-admin.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const CertificateReviewModal = ({
  isOpen,
  onClose,
  certificate,
  onVerifySuccess,
  superAdminService,
}) => {
  const { t } = useI18nStore();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!certificate) return null;

  const handleAction = async (isVerified) => {
    setError('');

    const finalNotes =
      notes.trim() || (isVerified ? undefined : t('cert_review_unqualified_default'));

    const payload = {
      certIndex: certificate.certIndex ?? 0,
      imageUrl: certificate.imageUrl || '',
      isVerified,
      notes: finalNotes,
    };

    const validation = verifyCertificateSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('check_input_data'));
      return;
    }

    setIsLoading(true);
    try {
      await superAdminService.verifyCertificate(certificate.muaId, payload);
      onVerifySuccess?.({
        muaId: certificate.muaId,
        certIndex: payload.certIndex,
        isVerified,
        status: isVerified ? 'VERIFIED' : 'REJECTED',
        notes: payload.notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || t('action_failed_retry'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Award className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{t('cert_review_title')}</span>
        </div>
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('close')}
          </Button>
          <Button
            variant="danger"
            onClick={() => handleAction(false)}
            isLoading={isLoading}
            icon={XCircle}
          >
            {t('cert_action_reject')}
          </Button>
          <Button
            variant="primary"
            onClick={() => handleAction(true)}
            isLoading={isLoading}
            icon={CheckCircle2}
          >
            {t('cert_action_approve')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Thông tin Thợ MUA */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {certificate.muaName || `MUA #${certificate.muaId}`}
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">ID: {certificate.muaId}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {t('col_phone')}: <span className="font-mono font-medium">{certificate.phoneNumber || 'N/A'}</span> • {t('col_email')}: <span className="font-medium">{certificate.email || 'N/A'}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              {t('cert_experience_label')} <span className="font-semibold text-slate-800 dark:text-slate-100">{certificate.experienceYears || '1+'} {t('unit_years')}</span>
            </p>
          </div>
        </div>

        {/* Ảnh Chứng chỉ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('cert_preview_label')}
            </label>
            {certificate.imageUrl && (
              <a
                href={certificate.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium"
              >
                <span>{t('cert_view_original')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 p-2 flex items-center justify-center min-h-[220px] max-h-[340px] overflow-hidden">
            {certificate.imageUrl ? (
              <img
                src={certificate.imageUrl}
                alt={t('cert_image_alt')}
                className="max-h-[320px] w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-slate-400 p-6">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No image attached</p>
              </div>
            )}
          </div>
        </div>

        {/* Lý do / Ghi chú */}
        <Textarea
          label={t('cert_notes_label')}
          placeholder={t('cert_notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
};
