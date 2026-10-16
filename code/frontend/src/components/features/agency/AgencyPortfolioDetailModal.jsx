import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Calendar, Sparkles, Tag, Eye, EyeOff, Edit2 } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyPortfolioDetailModal = ({ isOpen, onClose, item, onEdit }) => {
  const { t } = useI18nStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Tạo danh sách toàn bộ ảnh: Ảnh chính đầu tiên, sau đó là các ảnh phụ đi kèm
  const allImages = React.useMemo(() => {
    if (!item) return [];
    const list = [];
    const coverUrl = item.imageUrl || item.thumbnailUrl;
    if (coverUrl) {
      list.push({ url: coverUrl, label: 'Ảnh bìa chính' });
    }
    if (Array.isArray(item.additionalImages)) {
      item.additionalImages.forEach((img, idx) => {
        if (img) {
          list.push({ url: img, label: `Ảnh đi kèm #${idx + 1}` });
        }
      });
    }
    return list;
  }, [item]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentPhoto = allImages[selectedIndex] || allImages[0];

  const handlePrev = (e) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title || 'Chi tiết tác phẩm'}
      subtitle={item.packageName ? `Gói: ${item.packageName}` : 'Bộ sưu tập mẫu'}
      size="3xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {allImages.length > 1
              ? `Hiển thị ${allImages.length} hình ảnh (1 ảnh chính + ${allImages.length - 1} ảnh đi kèm)`
              : '1 hình ảnh'}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{t('edit') || 'Chỉnh sửa'}</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('close') || 'Đóng'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Khung ảnh chính lớn */}
        <div className="relative aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner group">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={item.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-xs text-slate-400">Không có ảnh</div>
          )}

          {/* Label ảnh hiện tại */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md border border-white/10">
            {currentPhoto?.label || 'Hình ảnh'}
          </div>

          {/* Đếm số trang ảnh */}
          {allImages.length > 1 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-md border border-white/10">
              {selectedIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Nút Prev / Next */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all opacity-80 group-hover:opacity-100 backdrop-blur-sm"
                title="Ảnh trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all opacity-80 group-hover:opacity-100 backdrop-blur-sm"
                title="Ảnh tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dải thumbnail xem nhanh */}
        {allImages.length > 1 && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {allImages.map((img, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-rose-500 scale-105 shadow-md shadow-rose-500/20 ring-2 ring-rose-500/30'
                      : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[9px] font-medium py-0.5 text-center leading-none">
                      Chính
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Chi tiết thông tin */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {item.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-sm">
                  <Star className="w-3 h-3 fill-white" />
                  Ghim tiêu biểu
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  item.isVisible
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.isVisible ? (
                  <>
                    <Eye className="w-3 h-3" /> Hiển thị với khách hàng
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" /> Đang ẩn
                  </>
                )}
              </span>
            </div>

            {item.createdAt && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>

          {/* Phân loại */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {item.packageName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                Gói: {item.packageName}
              </span>
            )}
            {item.styleName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Phong cách: {item.styleName}
              </span>
            )}
          </div>

          {/* Mô tả */}
          {item.description ? (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Mô tả chi tiết:
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          ) : (
            <p className="text-xs italic text-slate-400 pt-1">
              (Chưa có mô tả chi tiết cho tác phẩm này)
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
