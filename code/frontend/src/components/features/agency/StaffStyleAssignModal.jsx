import React, { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { superAdminService } from '../../../services/super-admin.service';

export const StaffStyleAssignModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [styles, setStyles] = useState([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      setError('');
      // Load all active styles
      superAdminService
        .getMakeupStyles()
        .then((res) => {
          setStyles(res.data || res || []);
        })
        .catch(() => {
          setStyles([]);
        });

      // Load current styles of this staff
      agencyService
        .getStaffStyles(staff.staffId || staff.id)
        .then((res) => {
          const current = res.data || res || [];
          // current may be array of styleIds or array of objects with id / styleId
          const ids = current.map((s) => s.styleId || s.id || s);
          setSelectedStyleIds(ids);
        })
        .catch(() => {
          setSelectedStyleIds(staff.styleIds || []);
        });
    }
  }, [isOpen, staff]);

  if (!staff) return null;

  const toggleStyle = (id) => {
    setSelectedStyleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    try {
      await agencyService.assignStaffStyles(staff.staffId || staff.id, {
        styleIds: selectedStyleIds,
      });
      onSuccess?.({
        staffId: staff.staffId || staff.id,
        styleIds: selectedStyleIds,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi gán tone phong cách, vui lòng thử lại');
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
          <Sparkles className="w-5 h-5 text-rose-600" />
          <span>Gán Tone Phong Cách Sở Trường Cho Thợ</span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Lưu Phong Cách ({selectedStyleIds.length})
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
            Chọn các Tone make-up mà thợ này có thế mạnh để tối ưu thuật toán ghép đơn thông minh.
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {styles.map((st) => {
            const isChecked = selectedStyleIds.includes(st.id);
            return (
              <div
                key={st.id}
                onClick={() => toggleStyle(st.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="text-sm block">{st.styleName}</span>
                  {st.description && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      {st.description}
                    </span>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    isChecked
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
