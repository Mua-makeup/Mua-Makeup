import React, { useState, useEffect } from 'react';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Badge } from '../../base/Badge';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency } from '../../../utils/formatters';
import { packageItemSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const PackageItemManager = ({ isOpen, onClose, pkg }) => {
  const { t } = useI18nStore();
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('COMPONENT');
  const [extraPrice, setExtraPrice] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isRequired, setIsRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState(1);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItems = async () => {
    if (!pkg?.id) return;
    try {
      const res = await agencyService.getPackageItems(pkg.id);
      setItems(res.data || res || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (isOpen && pkg) {
      loadItems();
      setIsAdding(false);
      setError('');
    }
  }, [isOpen, pkg]);

  if (!pkg) return null;

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      itemName: itemName.trim(),
      itemType,
      itemPrice: itemType === 'ADD_ON' ? Number(extraPrice) : 0,
      extraPrice: itemType === 'ADD_ON' ? Number(extraPrice) : 0,
      stepOrder: Number(sortOrder) || 1,
      sortOrder: Number(sortOrder) || 1,
      durationMinutes: Number(durationMinutes),
      isRequired: Boolean(isRequired),
    };

    const validation = packageItemSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('invalid_data'));
      return;
    }

    setIsLoading(true);
    try {
      await agencyService.addPackageItem(pkg.id, payload);
      setItemName('');
      setExtraPrice(0);
      setDurationMinutes(15);
      setIsAdding(false);
      await loadItems();
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
          t('pkg_item_add_error')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await agencyService.deletePackageItem(pkg.id, deletingItem.id);
      setDeletingItem(null);
      await loadItems();
    } catch (err) {
      setError(err.message || t('pkg_item_delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <ListPlus className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{t('pkg_item_title')}: {pkg.packageName}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('pkg_item_title')}
          </p>
          {!isAdding && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsAdding(true)}
            >
              {t('pkg_item_btn_add')}
            </Button>
          )}
        </div>

        {/* Add Form */}
        {isAdding && (
          <form
            onSubmit={handleAddItem}
            className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5"
          >
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t('pkg_item_btn_add')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('pkg_item_name')}
                required
                placeholder={t('pkg_item_placeholder')}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />

              <Select
                label={t('pkg_item_type')}
                required
                options={[
                  { value: 'COMPONENT', label: t('pkg_item_type_step') },
                  { value: 'ADD_ON', label: t('pkg_item_type_addon') },
                ]}
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {itemType === 'ADD_ON' && (
                <Input
                  label={t('pkg_item_price')}
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                />
              )}

              <Input
                label={t('pkg_item_duration')}
                type="number"
                min="0"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />

              <Input
                label={t('pkg_item_step_order')}
                type="number"
                min="1"
                required
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              />
              <label htmlFor="isRequired" className="text-xs text-slate-700 dark:text-slate-300 select-none">
                {t('pkg_item_is_required')}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="secondary" size="sm" onClick={() => setIsAdding(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                {t('pkg_item_btn_add')}
              </Button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
              {t('pkg_item_empty')}
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    {item.sortOrder || idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.itemName}
                      </span>
                      {item.itemType === 'ADD_ON' ? (
                        <Badge variant="brand" size="sm">
                          Add-on (+{formatCurrency(item.extraPrice)})
                        </Badge>
                      ) : (
                        <Badge variant="active" size="sm">
                          {t('pkg_item_required_tag')}
                        </Badge>
                      )}
                      {item.isRequired && (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">
                          {t('pkg_item_required_tag')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('pkg_item_duration_label')}: {item.durationMinutes != null ? item.durationMinutes : 15} {t('unit_minutes')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDeletingItem(item)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>

    <ConfirmDialog
      isOpen={Boolean(deletingItem)}
      onClose={() => setDeletingItem(null)}
      onConfirm={handleConfirmDelete}
      isLoading={isDeleting}
      title={t('confirm_delete_package_item_title')}
      message={`${t('confirm_delete_package_item_msg')} (${deletingItem?.itemName})`}
      confirmText={t('delete')}
      variant="danger"
    />
  </>
);
};
