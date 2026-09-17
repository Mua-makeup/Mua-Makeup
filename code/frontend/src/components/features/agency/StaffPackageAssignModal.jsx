import React, { useState, useEffect } from 'react';
import { Package, Check } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency } from '../../../utils/formatters';

export const StaffPackageAssignModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      setError('');
      // Load agency packages
      agencyService
        .getMyPackages()
        .then((res) => {
          setPackages(res.data || res || []);
        })
        .catch(() => {
          setPackages([]);
        });

      // Load currently assigned packages
      agencyService
        .getStaffPackages(staff.staffId || staff.id)
        .then((res) => {
          const current = res.data || res;
          const ids = current.packageIds || (Array.isArray(current) ? current.map((p) => p.id || p) : []);
          setSelectedPackageIds(ids);
        })
        .catch(() => {
          setSelectedPackageIds(staff.packageIds || []);
        });
    }
  }, [isOpen, staff]);

  if (!staff) return null;

  const togglePackage = (id) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    try {
      await agencyService.assignStaffPackages(staff.staffId || staff.id, {
        staffId: staff.staffId || staff.id,
        packageIds: selectedPackageIds,
      });
      onSuccess?.({
        staffId: staff.staffId || staff.id,
        packageIds: selectedPackageIds,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi gán gói dịch vụ, vui lòng thử lại');
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
          <Package className="w-5 h-5 text-indigo-600" />
          <span>Gán Gói Dịch Vụ Phân Công Cho Thợ</span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Lưu Phân Công ({selectedPackageIds.length})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          Thợ: <strong className="text-slate-900">{staff.fullName || staff.muaName || `#${staff.staffId || staff.id}`}</strong>
          <p className="mt-0.5 text-slate-500">
            Chỉ những gói dịch vụ được tích chọn thợ này mới được quyền nhận ca và thực hiện cho khách hàng.
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {packages.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              Studio chưa có gói dịch vụ nào. Vui lòng tạo gói tại mục Gói Dịch Vụ.
            </p>
          ) : (
            packages.map((pkg) => {
              const isChecked = selectedPackageIds.includes(pkg.id);
              return (
                <div
                  key={pkg.id}
                  onClick={() => togglePackage(pkg.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-sm block">{pkg.packageName}</span>
                    <span className="text-xs text-slate-500 font-normal">
                      {formatCurrency(pkg.price)} • {pkg.durationMinutes || 60} phút
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
