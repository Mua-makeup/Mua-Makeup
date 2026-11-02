import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import { useI18nStore } from '../store/useI18nStore';

/**
 * Universal hook for delayed execution delete with 5-second undo toast.
 * Follows Choice 2:
 * 1. User confirms deletion in modal.
 * 2. Item is immediately removed from the local state (optimistic UI).
 * 3. Toast appears for 5s with an "Undo" (Hoàn tác) action button and progress countdown bar.
 * 4. If user clicks "Undo" within 5s: action cancelled, item restored, no API request.
 * 5. If 5s expires without undo: API request executes to commit deletion in DB.
 */
const globalPendingDeletes = new Map();

export const useUndoDelete = () => {
  const { t } = useI18nStore();
  const showToast = useToastStore((state) => state.showToast);

  const triggerUndoDelete = useCallback(
    ({
      id,
      itemName = '',
      onOptimisticRemove,
      onUndo,
      onCommitDelete,
      duration = 5000,
    }) => {
      const key = String(id || Date.now());

      // If an existing pending delete is scheduled with this key, commit it immediately first
      if (globalPendingDeletes.has(key)) {
        const existing = globalPendingDeletes.get(key);
        clearTimeout(existing.timerId);
        existing.commitFn?.();
        globalPendingDeletes.delete(key);
      }

      // 1. Optimistically remove from UI
      onOptimisticRemove?.();

      const commitFn = async () => {
        globalPendingDeletes.delete(key);
        try {
          await onCommitDelete?.();
        } catch (err) {
          // Rollback if server returns error
          onUndo?.();
          const errorMsg =
            err.response?.data?.message || err.message || t('error_general');
          showToast(errorMsg, 'error');
        }
      };

      // 2. Set 5-second timer
      const timerId = setTimeout(() => {
        commitFn();
      }, duration);

      globalPendingDeletes.set(key, { timerId, commitFn, onUndo });

      // 3. Show Toast with Undo button
      const deletedMessage = itemName
        ? (t('deleted_item_with_name', { name: itemName }) || `Đã xóa "${itemName}".`)
        : (t('delete_success') || 'Đã xóa thành công.');

      showToast(
        deletedMessage,
        'info',
        duration,
        {
          label: t('btn_undo') || 'Hoàn tác',
          icon: RotateCcw,
          onClick: () => {
            const pending = globalPendingDeletes.get(key);
            if (pending) {
              clearTimeout(pending.timerId);
              globalPendingDeletes.delete(key);
            }
            onUndo?.();
            showToast(t('undo_success') || 'Đã hoàn tác thao tác xóa thành công.', 'success', 2500);
          },
        }
      );
    },
    [t, showToast]
  );

  return { triggerUndoDelete };
};
