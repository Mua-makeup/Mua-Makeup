import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Textarea } from '../../base/Textarea';
import { agencyService } from '../../../services/agency.service';
import { superAdminService } from '../../../services/super-admin.service';
import { servicePackageSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const PackageFormModal = ({ isOpen, onClose, editingPackage, onSuccess }) => {
  const { t } = useI18nStore();
  const [packageName, setPackageName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [categoryId, setCategoryId] = useState('');
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);

  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      setErrors({});

      // Load master taxonomy
      superAdminService.getMasterCategories().then((res) => {
        setCategories(res.data || res || []);
      }).catch(() => setCategories([]));

      superAdminService.getMakeupStyles().then((res) => {
        setStyles(res.data || res || []);
      }).catch(() => setStyles([]));

      if (editingPackage) {
        setPackageName(editingPackage.packageName || '');
        setDescription(editingPackage.description || '');
        setPrice(editingPackage.price || '');
        setDurationMinutes(editingPackage.durationMinutes ?? editingPackage.estimatedDurationMinutes ?? 60);
        setCategoryId(editingPackage.masterCategoryId || editingPackage.categoryId || editingPackage.category?.id || '');
        setSelectedStyleIds(
          editingPackage.styleIds ||
            editingPackage.styles?.map((s) => s.id || s) ||
            []
        );
      } else {
        setPackageName('');
        setDescription('');
        setPrice('');
        setDurationMinutes(60);
        setCategoryId('');
        setSelectedStyleIds([]);
      }
    }
  }, [isOpen, editingPackage]);

  const toggleStyle = (id) => {
    setSelectedStyleIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const payload = {
      packageName: packageName.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      masterCategoryId: Number(categoryId),
      categoryId: Number(categoryId),
      estimatedDurationMinutes: Number(durationMinutes),
      durationMinutes: Number(durationMinutes),
      styleIds: selectedStyleIds.map(Number),
    };

    const validation = servicePackageSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      if (editingPackage?.id) {
        await agencyService.updatePackage(editingPackage.id, payload);
      } else {
        await agencyService.createPackage(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const respData = err.response?.data?.data;
      const detailErr =
        respData && typeof respData === 'object'
          ? Object.values(respData).join('; ')
          : null;
      setServerError(
        detailErr ||
          err.response?.data?.message ||
          err.message ||
          t('error_general')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.categoryName,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Package className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{editingPackage ? t('pkg_modal_edit_title') : t('pkg_modal_create_title')}</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label={t('pkg_field_name')}
          required
          placeholder={t('pkg_field_name_placeholder')}
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          error={errors.packageName}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('pkg_field_category')}
            required
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            error={errors.categoryId}
            placeholder={t('pkg_field_category_placeholder')}
          />

          <Input
            label={t('pkg_field_duration')}
            type="number"
            min="15"
            max="480"
            step="15"
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            error={errors.durationMinutes}
          />
        </div>

        <Input
          label={t('pkg_field_price')}
          type="number"
          min="10000"
          step="10000"
          required
          placeholder="500000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          helperText={t('pkg_field_price_helper')}
        />

        {/* Tone Styles Multi-select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {t('pkg_field_styles')} <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/60">
            {styles.map((s) => {
              const isChecked = selectedStyleIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStyle(s.id)}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                    isChecked
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-200 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {s.styleName}
                </button>
              );
            })}
          </div>
          {errors.styleIds && (
            <p className="mt-1 text-xs text-red-600 font-medium">{errors.styleIds}</p>
          )}
        </div>

        <Textarea
          label={t('pkg_field_desc')}
          placeholder={t('pkg_field_desc_placeholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="pt-3 grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="col-span-1 w-full">
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="col-span-2 w-full">
            {editingPackage ? t('pkg_btn_save_edit') : t('pkg_btn_save_create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
