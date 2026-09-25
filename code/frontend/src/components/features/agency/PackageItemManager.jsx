import React, { useState, useEffect } from 'react';
import { ListPlus, Plus, Trash2, Pencil, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const [editingItem, setEditingItem] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('COMPONENT');
  const [extraPrice, setExtraPrice] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isRequired, setIsRequired] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tính toán thời lượng tổng và thời lượng đã phân bổ
  const totalDuration = Number(pkg?.durationMinutes ?? pkg?.estimatedDurationMinutes ?? 60);
  const configuredDuration = items
    .filter((it) => it.itemType === 'COMPONENT')
    .reduce((sum, it) => sum + (Number(it.durationMinutes) || 0), 0);
  const remainingMinutes = totalDuration - configuredDuration;

  const loadItems = async () => {
    if (!pkg?.id) return;
    try {
      const res = await agencyService.getPackageItems(pkg.id);
      setItems(res.data || res || []);
    } catch {
      setItems([]);
    }
  };

  const getNextStepOrder = (currentItems) => {
    if (!currentItems || currentItems.length === 0) return 1;
    return Math.max(...currentItems.map((it) => Number(it.stepOrder || it.sortOrder) || 0)) + 1;
  };

  const resetForm = () => {
    setItemName('');
    setItemType('COMPONENT');
    setExtraPrice(0);
    setDurationMinutes(15);
    setIsRequired(true);
    setSortOrder(getNextStepOrder(items));
    setIsAdding(false);
    setEditingItem(null);
    setError('');
  };

  const handleStartAdd = () => {
    const nextOrder = getNextStepOrder(items);
    const suggestedDuration = remainingMinutes > 0 ? remainingMinutes : 15;

    setItemName('');
    setItemType('COMPONENT');
    setExtraPrice(0);
    setDurationMinutes(suggestedDuration);
    setIsRequired(true);
    setSortOrder(nextOrder);
    setEditingItem(null);
    setIsAdding(true);
    setError('');
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setIsAdding(false);
    setItemName(item.itemName || '');
    const currentType = item.itemType || 'COMPONENT';
    setItemType(currentType);
    setExtraPrice(
      item.itemPrice != null
        ? Number(item.itemPrice)
        : item.extraPrice != null
        ? Number(item.extraPrice)
        : 0
    );
    setDurationMinutes(item.durationMinutes != null ? Number(item.durationMinutes) : 15);
    setSortOrder(item.stepOrder || item.sortOrder || 1);
    setIsRequired(currentType === 'COMPONENT' ? true : Boolean(item.isRequired));
    setError('');
  };

  const handleTypeChange = (newType) => {
    setItemType(newType);
    if (newType === 'COMPONENT') {
      setIsRequired(true);
      setExtraPrice(0);
      if (!editingItem && remainingMinutes > 0 && durationMinutes === 0) {
        setDurationMinutes(remainingMinutes);
      }
    } else {
      setIsRequired(false);
    }
  };

  useEffect(() => {
    if (isOpen && pkg) {
      loadItems();
      resetForm();
    }
  }, [isOpen, pkg]);

  if (!pkg) return null;

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      itemName: itemName.trim(),
      itemType,
      itemPrice: itemType === 'ADD_ON' ? Number(extraPrice) : 0,
      extraPrice: itemType === 'ADD_ON' ? Number(extraPrice) : 0,
      stepOrder: Number(sortOrder) || 1,
      sortOrder: Number(sortOrder) || 1,
      durationMinutes: Number(durationMinutes) || 0,
      isRequired: itemType === 'COMPONENT' ? true : Boolean(isRequired),
    };

    const validation = packageItemSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('invalid_data'));
      return;
    }

    // 1. Chặn trùng thứ tự bước (stepOrder)
    const targetOrder = Number(sortOrder) || 1;
    const isDuplicateOrder = items.some(
      (it) =>
        (!editingItem || it.id !== editingItem.id) &&
        (Number(it.stepOrder || it.sortOrder) === targetOrder)
    );
    if (isDuplicateOrder) {
      setError(t('pkg_step_order_duplicate'));
      return;
    }

    // 2. Chặn vượt quá thời lượng đối với bước quy trình bắt buộc (COMPONENT)
    if (itemType === 'COMPONENT') {
      const otherComponentDuration = items
        .filter((it) => it.itemType === 'COMPONENT' && (!editingItem || it.id !== editingItem.id))
        .reduce((sum, it) => sum + (Number(it.durationMinutes) || 0), 0);
      const newDuration = Number(durationMinutes) || 0;
      if (otherComponentDuration + newDuration > totalDuration) {
        const remainingAllowed = Math.max(0, totalDuration - otherComponentDuration);
        setError(
          t('pkg_step_duration_exceeded', {
            total: totalDuration,
            remaining: remainingAllowed,
          })
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        await agencyService.updatePackageItem(pkg.id, editingItem.id, payload);
      } else {
        await agencyService.addPackageItem(pkg.id, payload);
      }
      resetForm();
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
          (editingItem ? t('pkg_item_update_error') : t('pkg_item_add_error'))
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
      if (editingItem?.id === deletingItem.id) {
        resetForm();
      }
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
        <div className="space-y-5">
          {!isAdding && !editingItem && error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Duration & Progress Summary Bar */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{t('pkg_duration_overview')}</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                {configuredDuration} / {totalDuration} {t('unit_minutes')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  remainingMinutes === 0
                    ? 'bg-emerald-500'
                    : remainingMinutes > 0
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((configuredDuration / (totalDuration || 1)) * 100))}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span>
                  {t('pkg_total_duration')}: <strong className="text-slate-700 dark:text-slate-300">{totalDuration} {t('unit_minutes')}</strong>
                </span>
                <span>•</span>
                <span>
                  {t('pkg_configured_duration')}: <strong className="text-slate-700 dark:text-slate-300">{configuredDuration} {t('unit_minutes')}</strong>
                </span>
              </div>
              <div>
                {remainingMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50">
                    {t('pkg_remaining_duration')}: <strong>{remainingMinutes} {t('unit_minutes')}</strong>
                  </span>
                )}
                {remainingMinutes === 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('pkg_duration_matched')}
                  </span>
                )}
                {remainingMinutes < 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('pkg_duration_exceeded')}: {Math.abs(remainingMinutes)} {t('unit_minutes')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('pkg_item_list_title')} ({items.length})
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleStartAdd}
            >
              {t('pkg_item_btn_add')}
            </Button>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
                {t('pkg_item_empty')}
              </div>
            ) : (
              items.map((item, idx) => {
                const isCurrentEditing = editingItem?.id === item.id;
                return (
                  <div
                    key={item.id || idx}
                    className={`p-3 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-between shadow-xs transition-all ${
                      isCurrentEditing
                        ? 'border-amber-400 ring-2 ring-amber-400/30 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                        {item.stepOrder || item.sortOrder || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.itemName}
                          </span>
                          {item.itemType === 'ADD_ON' ? (
                            <Badge variant="brand" size="sm">
                              Add-on (+{formatCurrency(item.itemPrice ?? item.extraPrice ?? 0)})
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              {t('pkg_item_type_step')}
                            </Badge>
                          )}
                          {item.itemType === 'ADD_ON' && item.isRequired && (
                            <Badge variant="active" size="sm">
                              {t('pkg_item_required_tag')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t('pkg_item_duration_label')}: {item.durationMinutes != null ? item.durationMinutes : 15} {t('unit_minutes')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isCurrentEditing
                            ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                        title={t('edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Popup Thêm / Chỉnh Sửa Bước Quy Trình hoặc Dịch Vụ Add-on */}
      <Modal
        isOpen={isAdding || Boolean(editingItem)}
        onClose={resetForm}
        zIndex="z-[60]"
        maxWidth="max-w-lg"
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            {editingItem ? (
              <>
                <Pencil className="w-5 h-5 text-amber-500" />
                <span className="truncate max-w-sm">
                  {t('pkg_item_edit_title')}: <span className="text-amber-600 dark:text-amber-400 font-semibold">{editingItem.itemName}</span>
                </span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-rose-500" />
                <span>{t('pkg_item_btn_add')}</span>
              </>
            )}
          </div>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

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
              onChange={(e) => handleTypeChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {itemType === 'ADD_ON' && (
              <Input
                label={t('pkg_item_price')}
                type="number"
                min="0"
                step="any"
                required
                value={extraPrice}
                onChange={(e) => setExtraPrice(e.target.value)}
              />
            )}

            <div>
              <Input
                label={t('pkg_item_duration')}
                type="number"
                min="0"
                step="any"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              {itemType === 'COMPONENT' && remainingMinutes > 0 && !editingItem && durationMinutes !== remainingMinutes && (
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('pkg_remaining_duration')}: <strong>{remainingMinutes}p</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDurationMinutes(remainingMinutes)}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    {t('pkg_duration_fill_remaining')}
                  </button>
                </div>
              )}
            </div>

            <div>
              <Input
                label={t('pkg_item_step_order')}
                type="number"
                min="1"
                step="1"
                required
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Tự động gợi ý bước tiếp theo
              </p>
            </div>
          </div>

          {/* Checkbox bắt buộc: Tự động xử lý cho COMPONENT vs ADD_ON */}
          {itemType === 'COMPONENT' ? (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('pkg_step_component_mandatory_note')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <label htmlFor="isRequired" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                {t('pkg_addon_required_label')}
              </label>
            </div>
          )}

          <div className="pt-3 grid grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetForm}
              className="col-span-1 w-full"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              className="col-span-2 w-full"
            >
              {editingItem ? t('pkg_item_btn_update') : t('pkg_item_btn_add')}
            </Button>
          </div>
        </form>
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


