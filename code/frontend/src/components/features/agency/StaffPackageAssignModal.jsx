import React, { useState, useEffect } from 'react';
import { Package, Check } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency } from '../../../utils/formatters';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffPackageAssignModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const { t } = useI18nStore();
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
      const packageAssignments = (selectedPackageIds || []).map((pid) => ({
        packageId: Number(pid),
        proficiencyLevel: 'PRIMARY_MUA',
        isQualified: true,
      }));

      await agencyService.assignStaffPackages(staff.staffId || staff.id, {
        staffId: staff.staffId || staff.id,
        packageAssignments,
        packageIds: selectedPackageIds.map(Number),
      });
      onSuccess?.({
        staffId: staff.staffId || staff.id,
        packageIds: selectedPackageIds,
      });
      onClose();
    } catch (err) {
      const respData = err.response?.data?.data;
      const detailErr =
        respData && typeof respData === 'object'
          ? Object.values(respData).join('; ')
          : null;
      setError(
        detailErr ||
          err.response?.data?.message ||
          err.message ||
          t('staff_package_assign_error')
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
          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>{t('staff_pkg_modal_title')}</span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            {t('staff_pkg_save_btn')} ({selectedPackageIds.length})
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
            {t('staff_pkg_modal_desc')}
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {packages.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
              {t('staff_pkg_empty')}
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
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <span className="text-sm block">{pkg.packageName}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                      {formatCurrency(pkg.price)} • {pkg.durationMinutes ?? pkg.estimatedDurationMinutes ?? 60} {t('unit_minutes')}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      isChecked
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
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
