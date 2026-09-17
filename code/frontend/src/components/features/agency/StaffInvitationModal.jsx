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
import { agencyService } from '../../../services/agency.service';
import { staffInvitationSchema } from '../../../schemas/agency.schema';
import { formatDate } from '../../../utils/formatters';

export const StaffInvitationModal = ({ isOpen, onClose, onStaffAdded }) => {
  const [invitations, setInvitations] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [proposedCommissionRate, setProposedCommissionRate] = useState(30);
  const [expireHours, setExpireHours] = useState(72);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  const [activeInvite, setActiveInvite] = useState(null);
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
      setError(validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
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
      setError(err.message || 'Không thể tạo mã mời, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async (inviteCode) => {
    try {
      await agencyService.cancelInvitation(inviteCode);
      if (activeInvite?.inviteCode === inviteCode) {
        setActiveInvite(null);
      }
      await loadInvitations();
    } catch (err) {
      setError(err.message || 'Lỗi khi hủy mã mời');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <QrCode className="w-5 h-5 text-rose-600" />
          <span>Tuyển Dụng Thợ Make-up Mới (Mã Mời & QR Code 72h)</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Tạo mã mới nếu isCreating */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Cấu Hình Lời Mời Gia Nhập Studio</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hoa hồng đề xuất cho thợ (%)"
                type="number"
                min="0"
                max="60"
                value={proposedCommissionRate}
                onChange={(e) => setProposedCommissionRate(e.target.value)}
                helperText="Tỷ lệ % Studio chi trả cho thợ (0% - 60%)"
                required
              />
              <Input
                label="Thời hạn hiệu lực mã (giờ)"
                type="number"
                min="1"
                max="168"
                value={expireHours}
                onChange={(e) => setExpireHours(e.target.value)}
                helperText="Mặc định: 72 giờ lưu trên Redis"
                required
              />
            </div>
            <Input
              label="Ghi chú tuyển dụng (Tùy chọn)"
              type="text"
              placeholder="VD: Đợt tuyển thợ tone Douyin mùa cưới 2026..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCreating(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                Tạo Mã Mời & Sinh Ảnh QR
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Mã mời được mã hóa bằng Google ZXing 72h, thợ có thể quét trực tiếp bằng camera điện thoại.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreating(true)}
            >
              Sinh Mã Mời Mới
            </Button>
          </div>
        )}

        {/* Hiển thị QR chi tiết nếu có activeInvite */}
        {activeInvite ? (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Cột QR Code */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              {activeInvite.qrCodeBase64 ? (
                <img
                  src={activeInvite.qrCodeBase64}
                  alt="QR Tuyển Dụng"
                  className="w-44 h-44 object-contain rounded-lg border border-slate-200 bg-white p-1.5 shadow-xs"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-200 rounded-lg text-slate-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Clock className="w-3.5 h-3.5" />
                <span>Hết hạn: {formatDate(activeInvite.expiresAt)}</span>
              </div>
            </div>

            {/* Cột Thông tin & Thao tác */}
            <div className="sm:col-span-7 space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mã Mời Tham Gia (Invite Code)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-lg font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    {activeInvite.inviteCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(activeInvite.inviteCode, 'code')}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    title="Sao chép mã"
                  >
                    {copiedCode === activeInvite.inviteCode ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Đường Dẫn Đăng Ký Trực Tiếp
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={activeInvite.inviteUrl || `https://app.makeup.vn/join?code=${activeInvite.inviteCode}`}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 select-all"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        activeInvite.inviteUrl || `https://app.makeup.vn/join?code=${activeInvite.inviteCode}`,
                        'link'
                      )
                    }
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    title="Sao chép link"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
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
                  Tải Ảnh QR (.png)
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleCancelInvite(activeInvite.inviteCode)}
                >
                  Hủy Mã Mời Này
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
            Chưa có mã mời nào đang hoạt động. Nhấn "Sinh Mã Mời Mới" để tạo mã tuyển thợ.
          </div>
        )}

        {/* Danh sách các mã mời đã tạo */}
        {invitations.length > 1 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Các Mã Mời Khác Đang Mở ({invitations.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {invitations.map((inv) => (
                <div
                  key={inv.inviteCode}
                  onClick={() => setActiveInvite(inv)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer text-xs transition-colors ${
                    activeInvite?.inviteCode === inv.inviteCode
                      ? 'border-rose-300 bg-rose-50/40 text-slate-900 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{inv.inviteCode}</span>
                    <span className="text-slate-400">({inv.proposedCommissionRate || 30}%)</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    Hết hạn: {formatDate(inv.expiresAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
