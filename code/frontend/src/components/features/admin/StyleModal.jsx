import React, { useState, useEffect } from 'react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Textarea } from '../../base/Textarea';
import { Button } from '../../base/Button';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const StyleModal = ({ isOpen, onClose, styleItem, onSuccess }) => {
  const { t } = useI18nStore();
  const isEdit = !!styleItem?.id;

  const [formData, setFormData] = useState({
    styleCode: '',
    styleName: '',
    description: '',
    sortOrder: 1,
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (styleItem) {
      setFormData({
        styleCode: styleItem.styleCode || '',
        styleName: styleItem.styleName || '',
        description: styleItem.description || '',
        sortOrder: styleItem.sortOrder ?? 1,
        isActive: styleItem.isActive !== false,
      });
    } else {
      setFormData({
        styleCode: '',
        styleName: '',
        description: '',
        sortOrder: 1,
        isActive: true,
      });
    }
    setErrors({});
    setApiError('');
  }, [styleItem, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.styleCode.trim()) {
      errs.styleCode = t('err_style_code_required');
    }
    if (!formData.styleName.trim()) {
      errs.styleName = t('err_style_name_required');
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
        styleCode: formData.styleCode.trim(),
        styleName: formData.styleName.trim(),
        description: formData.description?.trim() || null,
        sortOrder: Number(formData.sortOrder) || 1,
        isActive: formData.isActive,
      };

      if (isEdit) {
        await superAdminService.updateMakeupStyle(styleItem.id, payload);
      } else {
        await superAdminService.createMakeupStyle(payload);
      }

      const successMsg = isEdit
        ? t('style_updated_success')
        : t('style_created_success');
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
      title={isEdit ? t('style_modal_edit_title') : t('style_modal_create_title')}
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

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label={t('col_code')}
              placeholder="e.g. KOREAN_NATURAL, SMOKEY_GLAM"
              value={formData.styleCode}
              onChange={(e) => setFormData({ ...formData, styleCode: e.target.value.toUpperCase() })}
              error={errors.styleCode}
              required
            />
          </div>
          <div className="col-span-1">
            <Input
              label={t('col_sort_order') || 'Thứ Tự'}
              type="number"
              min="1"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
            />
          </div>
        </div>

        <Input
          label={t('col_styles')}
          placeholder={t('style_name_placeholder')}
          value={formData.styleName}
          onChange={(e) => setFormData({ ...formData, styleName: e.target.value })}
          error={errors.styleName}
          required
        />

        <Textarea
          label={t('col_description')}
          placeholder={t('style_desc_placeholder')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </form>
    </Modal>
  );
};
