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

export const PackageFormModal = ({ isOpen, onClose, editingPackage, onSuccess }) => {
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
        setDurationMinutes(editingPackage.durationMinutes || 60);
        setCategoryId(editingPackage.categoryId || editingPackage.category?.id || '');
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
      durationMinutes: Number(durationMinutes),
      categoryId: Number(categoryId),
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
      setServerError(err.message || 'Lỗi khi lưu gói dịch vụ, vui lòng thử lại');
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
        <div className="flex items-center gap-2 text-slate-900">
          <Package className="w-5 h-5 text-rose-600" />
          <span>{editingPackage ? 'Chỉnh Sửa Gói Dịch Vụ' : 'Tạo Gói Dịch Vụ Mới'}</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Tên Gói Dịch Vụ"
          required
          placeholder="VD: Make-up Cô Dâu VIP Tone Hàn..."
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          error={errors.packageName}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Danh Mục Dịch Vụ Gốc"
            required
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            error={errors.categoryId}
            placeholder="-- Chọn danh mục sàn --"
          />

          <Input
            label="Thời Lượng Thực Hiện (Phút)"
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
          label="Giá Niêm Yết (VNĐ)"
          type="number"
          min="10000"
          step="10000"
          required
          placeholder="500000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          helperText="Giá cơ bản áp dụng cho gói make-up tiêu chuẩn"
        />

        {/* Tone Styles Multi-select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Tone Phong Cách Áp Dụng <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
            {styles.map((s) => {
              const isChecked = selectedStyleIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStyle(s.id)}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                    isChecked
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
          label="Mô Tả Chi Tiết Gói"
          placeholder="Mô tả kỹ thuật trang điểm, các loại mỹ phẩm cao cấp sử dụng..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {editingPackage ? 'Cập Nhật Gói' : 'Tạo Gói Dịch Vụ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
