import React, { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffStyleAssignModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const { t } = useI18nStore();
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

      // Load currently assigned styles for this staff
      agencyService
        .getStaffStyles(staff.staffId || staff.id)
        .then((res) => {
          const list = res.data || res || [];
          setSelectedStyleIds(list.map((s) => s.styleId || s.id));
        })
        .catch(() => {
          setSelectedStyleIds([]);
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
    try {
      setIsLoading(true);
      setError('');
      await agencyService.assignStaffStyles(
        staff.staffId || staff.id,
        selectedStyleIds.map(Number)
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('error_general')
      );
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
          <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{t('staff_style_modal_title')}</span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            {t('staff_style_save_btn')} ({selectedStyleIds.length})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300">
          {t('staff_label')} <strong className="text-slate-900 dark:text-white">{staff.fullName || staff.muaName || `#${staff.staffId || staff.id}`}</strong>
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
            {t('staff_style_modal_desc')}
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
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-600 text-rose-900 dark:text-rose-200 font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <span className="text-sm block">{st.styleName}</span>
                  {st.description && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      {st.description}
                    </span>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    isChecked
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
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
