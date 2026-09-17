import React, { useState, useEffect } from 'react';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Badge } from '../../base/Badge';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency } from '../../../utils/formatters';
import { packageItemSchema } from '../../../schemas/agency.schema';

export const PackageItemManager = ({ isOpen, onClose, pkg }) => {
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
      setError(validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
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
          'Lỗi khi thêm bước/dịch vụ'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await agencyService.deletePackageItem(pkg.id, itemId);
      await loadItems();
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa bước/dịch vụ');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <ListPlus className="w-5 h-5 text-rose-600" />
          <span>Cấu Hình Quy Trình & Add-ons: {pkg.packageName}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Quản lý các bước make-up tiêu chuẩn (Component) và các dịch vụ mua thêm tính phí (Add-on).
          </p>
          {!isAdding && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsAdding(true)}
            >
              Thêm Bước / Add-on
            </Button>
          )}
        </div>

        {/* Add Form */}
        {isAdding && (
          <form
            onSubmit={handleAddItem}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5"
          >
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Thêm Bước / Dịch Vụ Mới
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Tên Bước / Dịch Vụ"
                required
                placeholder="VD: Dưỡng ẩm chuyên sâu, Làm tóc cô dâu..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />

              <Select
                label="Loại Dịch Vụ"
                required
                options={[
                  { value: 'COMPONENT', label: 'Bước Quy Trình Tiêu Chuẩn (Bao gồm trong gói)' },
                  { value: 'ADD_ON', label: 'Dịch Vụ Cộng Thêm / Add-on (Tính phụ phí)' },
                ]}
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {itemType === 'ADD_ON' && (
                <Input
                  label="Giá Phụ Trội (VNĐ)"
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                />
              )}

              <Input
                label="Thời Lượng (Phút)"
                type="number"
                min="0"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />

              <Input
                label="Thứ Tự Sắp Xếp"
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
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="isRequired" className="text-xs text-slate-700 select-none">
                Bước bắt buộc không thể bỏ qua trong quy trình
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setIsAdding(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                Lưu Vào Gói
              </Button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
              Gói dịch vụ này chưa có bước quy trình hoặc add-on nào.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-mono text-xs font-bold text-slate-600">
                    {item.sortOrder || idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {item.itemName}
                      </span>
                      {item.itemType === 'ADD_ON' ? (
                        <Badge variant="brand" size="sm">
                          Add-on (+{formatCurrency(item.extraPrice)})
                        </Badge>
                      ) : (
                        <Badge variant="active" size="sm">
                          Quy trình gốc
                        </Badge>
                      )}
                      {item.isRequired && (
                        <span className="text-[10px] font-semibold text-rose-600 uppercase">
                          Bắt buộc
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Thời lượng: {item.durationMinutes || 15} phút
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa bước này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
