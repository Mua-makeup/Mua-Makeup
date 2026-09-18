import React, { useState, useEffect } from 'react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Textarea } from '../../base/Textarea';
import { Button } from '../../base/Button';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const CategoryModal = ({ isOpen, onClose, category, onSuccess }) => {
  const { t } = useI18nStore();
  const isEdit = !!category?.id;

  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    description: '',
    iconUrl: '',
    sortOrder: 1,
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        categoryCode: category.categoryCode || '',
        categoryName: category.categoryName || '',
        description: category.description || '',
        iconUrl: category.iconUrl || '',
        sortOrder: category.sortOrder ?? 1,
        isActive: category.isActive !== false,
      });
    } else {
      setFormData({
        categoryCode: '',
        categoryName: '',
        description: '',
        iconUrl: '',
        sortOrder: 1,
        isActive: true,
      });
    }
    setErrors({});
    setApiError('');
  }, [category, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.categoryCode.trim()) {
      errs.categoryCode = t('err_category_code_required');
    }
    if (!formData.categoryName.trim()) {
      errs.categoryName = t('err_category_name_required');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError('');

    try {
      const payload = {
        categoryCode: formData.categoryCode.trim(),
        categoryName: formData.categoryName.trim(),
        description: formData.description?.trim() || null,
        iconUrl: formData.iconUrl?.trim() || null,
        sortOrder: Number(formData.sortOrder) || 1,
        isActive: formData.isActive,
      };

      if (isEdit) {
        await superAdminService.updateMasterCategory(category.id, payload);
      } else {
        await superAdminService.createMasterCategory(payload);
      }

      const successMsg = isEdit
        ? t('category_updated_success')
        : t('category_created_success');
      onSuccess?.(successMsg);
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('category_modal_edit_title') : t('category_modal_create_title')}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('modal_cancel_btn')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEdit ? t('btn_save_changes') : t('btn_create')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs">
            {apiError}
          </div>
        )}

        <Input
          label={t('col_code')}
          placeholder="e.g. BRIDAL, EVENT, DAILY"
          value={formData.categoryCode}
          onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value.toUpperCase() })}
          error={errors.categoryCode}
          required
        />

        <Input
          label={t('col_category')}
          placeholder={t('category_name_placeholder')}
          value={formData.categoryName}
          onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
          error={errors.categoryName}
          required
        />

        <Textarea
          label={t('col_description')}
          placeholder={t('category_desc_placeholder')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('col_sort_order')}
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
          />

          <div className="flex flex-col justify-center pt-5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('status_active')}
              </span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
