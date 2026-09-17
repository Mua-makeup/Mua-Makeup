import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/roles.constant';
import { TRANSLATIONS } from '../constants/i18n.constant';

const getSavedLanguage = () => {
  return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'vi';
};

export const useI18nStore = create((set, get) => ({
  language: getSavedLanguage(),

  setLanguage: (lang) => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    set({ language: lang });
  },

  toggleLanguage: () => {
    const current = get().language;
    const next = current === 'vi' ? 'en' : 'vi';
    get().setLanguage(next);
  },

  t: (key) => {
    const lang = get().language;
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.vi?.[key] || key;
  },
}));
