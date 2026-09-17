import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, ExternalLink, User } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Textarea } from '../../base/Textarea';
import { verifyCertificateSchema } from '../../../schemas/super-admin.schema';

export const CertificateReviewModal = ({
  isOpen,
  onClose,
  certificate,
  onVerifySuccess,
  superAdminService,
}) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!certificate) return null;

  const handleAction = async (isVerified) => {
    setError('');

    const payload = {
      certIndex: certificate.certIndex ?? 0,
      imageUrl: certificate.imageUrl || '',
      isVerified,
      notes: notes.trim() || undefined,
    };

    const validation = verifyCertificateSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    setIsLoading(true);
    try {
      await superAdminService.verifyCertificate(certificate.muaId, payload);
      onVerifySuccess?.({
        muaId: certificate.muaId,
        isVerified,
        notes: payload.notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Thao tác thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <Award className="w-5 h-5 text-rose-600" />
          <span>Kiểm Duyệt Chứng Chỉ Hành Nghề MUA</span>
        </div>
      }
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Đóng
          </Button>
          <Button
            variant="danger"
            onClick={() => handleAction(false)}
            isLoading={isLoading}
            icon={XCircle}
          >
            Từ Chối Hồ Sơ
          </Button>
          <Button
            variant="primary"
            onClick={() => handleAction(true)}
            isLoading={isLoading}
            icon={CheckCircle2}
          >
            Phê Duyệt Chứng Chỉ
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Thông tin Thợ MUA */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                {certificate.muaName || `MUA #${certificate.muaId}`}
              </span>
              <span className="font-mono text-slate-500">ID: {certificate.muaId}</span>
            </div>
            <p className="text-slate-600">
              SĐT: <span className="font-mono font-medium">{certificate.phoneNumber || 'N/A'}</span> • Email: <span className="font-medium">{certificate.email || 'N/A'}</span>
            </p>
            <p className="text-slate-600">
              Kinh nghiệm: <span className="font-semibold text-slate-800">{certificate.experienceYears || '1+'} năm</span>
            </p>
          </div>
        </div>

        {/* Ảnh Chứng chỉ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ảnh Chứng Chỉ Đính Kèm
            </label>
            {certificate.imageUrl && (
              <a
                href={certificate.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                <span>Xem ảnh gốc</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 flex items-center justify-center min-h-[220px] max-h-[340px] overflow-hidden">
            {certificate.imageUrl ? (
              <img
                src={certificate.imageUrl}
                alt="Chứng chỉ MUA"
                className="max-h-[320px] w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-slate-400 p-6">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Không có hình ảnh chứng chỉ đính kèm</p>
              </div>
            )}
          </div>
        </div>

        {/* Lý do / Ghi chú */}
        <Textarea
          label="Ghi chú thẩm định / Lý do từ chối"
          helperText="Bắt buộc nhập lý do nếu chọn 'Từ Chối Hồ Sơ' (tối thiểu 5 ký tự)."
          placeholder="Nhập ghi chú phản hồi cho thợ make-up..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
};
