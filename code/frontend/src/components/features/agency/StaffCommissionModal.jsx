import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { agencyService } from '../../../services/agency.service';
import { commissionRateSchema } from '../../../schemas/agency.schema';

export const StaffCommissionModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [rate, setRate] = useState(30);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (staff) {
      setRate(staff.commissionRateCustom ?? staff.commissionRate ?? 30);
      setError('');
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validation = commissionRateSchema.safeParse({
      commissionRate: Number(rate),
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Tỷ lệ hoa hồng không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      await agencyService.updateStaffCommission(staff.staffId || staff.id, {
        commissionRateCustom: Number(rate),
      });
      onSuccess?.({
        staffId: staff.staffId || staff.id,
        commissionRate: Number(rate),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật hoa hồng, vui lòng thử lại');
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
          <Percent className="w-5 h-5 text-rose-600" />
          <span>Đàm Phán Hoa Hồng Cá Nhân Cho Thợ</span>
        </div>
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-800">
            Thợ: {staff.fullName || staff.muaName || `Thợ #${staff.staffId || staff.id}`}
          </p>
          <p className="text-slate-500">
            Hoa hồng cá nhân sẽ ghi đè lên mức hoa hồng mặc định của Studio đối với các đơn hàng do thợ này hoàn thành.
          </p>
        </div>

        <Input
          label="Tỷ lệ hoa hồng chi trả cho thợ (%)"
          type="number"
          min="0"
          max="60"
          step="0.5"
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          helperText="Mức quy định: từ 0% đến 60%"
        />

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Lưu Thay Đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
