import React, { useState, useEffect, useRef } from 'react';
import { Image, Upload, X, Star, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Textarea } from '../../base/Textarea';
import { agencyService } from '../../../services/agency.service';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyPortfolioModal = ({ isOpen, onClose, editingItem, onSuccess }) => {
  const { t } = useI18nStore();
  const fileInputRef = useRef(null);
  const additionalFilesRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [packageId, setPackageId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Ảnh chính
  const [mainFile, setMainFile] = useState(null);
  const [mainPreview, setMainPreview] = useState(null);

  // Ảnh phụ cũ (đã có trên Cloud) & Ảnh phụ mới tải lên
  const [existingAdditionalImages, setExistingAdditionalImages] = useState([]);
  const [newAdditionalFiles, setNewAdditionalFiles] = useState([]);
  const [newAdditionalPreviews, setNewAdditionalPreviews] = useState([]);

  // Taxonomy options
  const [packages, setPackages] = useState([]);
  const [styles, setStyles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      setClientErrors({});

      // Tải danh sách Gói dịch vụ của Studio
      agencyService.getMyPackages({ size: 100 }).then((res) => {
        const data = res?.data || res || {};
        const list = Array.isArray(data) ? data : (data.content || []);
        setPackages(list);
      }).catch(() => setPackages([]));

      // Tải danh sách Phong cách make-up
      superAdminService.getMakeupStyles().then((res) => {
        setStyles(res?.data || res || []);
      }).catch(() => setStyles([]));

      if (editingItem) {
        setTitle(editingItem.title || '');
        setDescription(editingItem.description || '');
        setPackageId(editingItem.packageId ? String(editingItem.packageId) : '');
        setStyleId(editingItem.styleId ? String(editingItem.styleId) : '');
        setIsFeatured(Boolean(editingItem.isFeatured));
        setMainFile(null);
        setMainPreview(editingItem.imageUrl || editingItem.thumbnailUrl || null);
        setExistingAdditionalImages(
          Array.isArray(editingItem.additionalImages) ? [...editingItem.additionalImages] : []
        );
        setNewAdditionalFiles([]);
        setNewAdditionalPreviews([]);
      } else {
        setTitle('');
        setDescription('');
        setPackageId('');
        setStyleId('');
        setIsFeatured(false);
        setMainFile(null);
        setMainPreview(null);
        setExistingAdditionalImages([]);
        setNewAdditionalFiles([]);
        setNewAdditionalPreviews([]);
      }
    }
  }, [isOpen, editingItem]);

  const handleMainFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setClientErrors((prev) => ({ ...prev, mainFile: 'Kích thước ảnh không được vượt quá 10MB.' }));
        return;
      }
      setMainFile(file);
      setMainPreview(URL.createObjectURL(file));
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next.mainFile;
        return next;
      });
    }
  };

  const handleAdditionalFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const currentTotal = existingAdditionalImages.length + newAdditionalFiles.length;
    const remainingSlots = 5 - currentTotal;

    if (remainingSlots <= 0) {
      setClientErrors((prev) => ({ ...prev, additionalFiles: 'Tối đa 5 ảnh phụ chi tiết cho mỗi tác phẩm.' }));
      return;
    }

    if (files.length > remainingSlots) {
      setClientErrors((prev) => ({
        ...prev,
        additionalFiles: `Chỉ có thể thêm tối đa ${remainingSlots} ảnh nữa (tổng tối đa 5 ảnh).`,
      }));
    } else {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next.additionalFiles;
        return next;
      });
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const updatedFiles = [...newAdditionalFiles, ...filesToAdd];
    setNewAdditionalFiles(updatedFiles);

    const addedPreviews = filesToAdd.map((f) => URL.createObjectURL(f));
    setNewAdditionalPreviews([...newAdditionalPreviews, ...addedPreviews]);
  };

  const removeExistingAdditionalImage = (index) => {
    setExistingAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    setClientErrors((prev) => {
      const next = { ...prev };
      delete next.additionalFiles;
      return next;
    });
  };

  const removeNewAdditionalFile = (index) => {
    setNewAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
    setNewAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    setClientErrors((prev) => {
      const next = { ...prev };
      delete next.additionalFiles;
      return next;
    });
  };

  const totalAdditionalCount = existingAdditionalImages.length + newAdditionalFiles.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientErrors({});
    setServerError('');

    const errs = {};
    if (!title.trim()) {
      errs.title = 'Vui lòng nhập tiêu đề tác phẩm.';
    }
    if (!editingItem && !mainFile) {
      errs.mainFile = 'Vui lòng chọn ảnh chính chất lượng cao của tác phẩm.';
    }

    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (packageId) {
        formData.append('package_id', packageId);
      }
      if (styleId) {
        formData.append('style_id', styleId);
      }

      if (mainFile) {
        formData.append('image_file', mainFile);
      }

      if (editingItem?.id) {
        // Gửi danh sách ảnh phụ cũ còn giữ lại
        existingAdditionalImages.forEach((url) => {
          formData.append('existing_additional_images', url);
        });
        // Gửi các file ảnh phụ mới tải lên
        newAdditionalFiles.forEach((file) => {
          formData.append('additional_files', file);
        });

        await agencyService.updatePortfolio(editingItem.id, formData);

        // Cập nhật trạng thái Ghim nếu thay đổi
        if (Boolean(editingItem.isFeatured) !== Boolean(isFeatured)) {
          await agencyService.togglePortfolioFeatured(editingItem.id, isFeatured);
        }
      } else {
        formData.append('is_featured', isFeatured);
        newAdditionalFiles.forEach((file) => {
          formData.append('additional_files', file);
        });

        await agencyService.createPortfolio(formData);
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

  const packageOptions = [
    { value: '', label: t('agency_portfolio_field_package_placeholder') },
    ...packages.map((p) => ({
      value: String(p.id),
      label: `${p.packageName} (${Number(p.price || 0).toLocaleString('vi-VN')} đ)`,
    })),
  ];

  const styleOptions = [
    { value: '', label: t('agency_portfolio_field_style_placeholder') },
    ...styles.map((s) => ({
      value: String(s.id),
      label: s.styleName,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Image className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>
            {editingItem
              ? t('agency_portfolio_modal_edit_title')
              : t('agency_portfolio_modal_add_title')}
          </span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Input
          label={t('agency_portfolio_field_title')}
          required
          placeholder={t('agency_portfolio_field_title_placeholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={clientErrors.title}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('agency_portfolio_field_package')}
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            options={packageOptions}
          />

          <Select
            label={t('agency_portfolio_field_style')}
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            options={styleOptions}
          />
        </div>

        <Textarea
          label={t('agency_portfolio_field_desc')}
          placeholder={t('agency_portfolio_field_desc_placeholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {/* ẢNH CHÍNH (COVER PHOTO) - ÁP DỤNG CẢ THÊM MỚI VÀ CHỈNH SỬA */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('agency_portfolio_field_main_image')}{' '}
              {!editingItem && <span className="text-rose-500">*</span>}
            </label>
            {editingItem && (
              <span className="text-[11px] text-slate-400">
                {mainFile ? 'Đã chọn ảnh thay thế' : 'Nhấp vào ảnh để thay đổi'}
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleMainFileChange}
          />

          {mainPreview ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-52 bg-slate-950 flex items-center justify-center">
              <img
                src={mainPreview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md">
                {mainFile ? 'Ảnh mới chọn' : 'Ảnh chính hiện tại'}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white font-medium text-xs flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thay đổi ảnh chính</span>
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                clientErrors.mainFile
                  ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-rose-500 hover:bg-rose-50/30'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {t('agency_portfolio_field_main_image_hint')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP tối đa 10MB</p>
            </div>
          )}
          {clientErrors.mainFile && (
            <p className="text-xs text-rose-500 mt-1">{clientErrors.mainFile}</p>
          )}
        </div>

        {/* ẢNH PHỤ (ADDITIONAL IMAGES) - ÁP DỤNG CẢ THÊM MỚI VÀ CHỈNH SỬA */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('agency_portfolio_field_additional_images')} (Góc nghiêng, cận cảnh, Before-After)
            </label>
            <span className="text-[11px] text-slate-400">
              {totalAdditionalCount}/5 ảnh
            </span>
          </div>

          <input
            type="file"
            ref={additionalFilesRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAdditionalFilesChange}
          />

          <div className="grid grid-cols-5 gap-2.5">
            {/* Danh sách ảnh phụ cũ đã có */}
            {existingAdditionalImages.map((url, idx) => (
              <div
                key={`existing-${idx}`}
                className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-950 group"
              >
                <img src={url} alt={`Existing sub ${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingAdditionalImage(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors shadow-sm"
                  title="Gỡ ảnh này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Danh sách ảnh phụ mới chọn thêm */}
            {newAdditionalPreviews.map((preview, idx) => (
              <div
                key={`new-${idx}`}
                className="relative rounded-lg overflow-hidden border-2 border-emerald-500/80 aspect-square bg-slate-950 group"
              >
                <img src={preview} alt={`New sub ${idx}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-semibold text-center py-0.5">
                  Mới
                </span>
                <button
                  type="button"
                  onClick={() => removeNewAdditionalFile(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors shadow-sm"
                  title="Gỡ ảnh này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Nút bấm thêm ảnh nếu chưa đủ 5 ảnh */}
            {totalAdditionalCount < 5 && (
              <button
                type="button"
                onClick={() => additionalFilesRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg aspect-square flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500 hover:bg-rose-50/20 transition-all"
                title="Tải thêm ảnh phụ"
              >
                <Plus className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium">Thêm ảnh</span>
              </button>
            )}
          </div>

          {clientErrors.additionalFiles && (
            <p className="text-xs text-rose-500 mt-1">{clientErrors.additionalFiles}</p>
          )}
        </div>

        {/* CỜ GHIM TIÊU BIỂU */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className={`w-4 h-4 ${isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('agency_portfolio_field_featured')}
              </p>
              <p className="text-[11px] text-slate-400">
                Tác phẩm tiêu biểu sẽ được ưu tiên hiển thị đầu tiên trên App khách hàng
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
          />
        </div>

        {/* NÚT SUBMIT & HỦY (TỶ LỆ 1/3 - 2/3 ĐỒNG BỘ TOÀN HỆ THỐNG) */}
        <div className="pt-3 grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="col-span-1 w-full"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="col-span-2 w-full"
          >
            {editingItem
              ? t('btn_save_changes')
              : t('agency_portfolio_btn_submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
