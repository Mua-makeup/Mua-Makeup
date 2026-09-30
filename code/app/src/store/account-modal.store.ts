import { create } from 'zustand';

interface AccountModalState {
  isOpen: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;
}

export const useAccountModalStore = create<AccountModalState>((set) => ({
  isOpen: false,
  openAccountModal: () => set({ isOpen: true }),
  closeAccountModal: () => set({ isOpen: false }),
}));
