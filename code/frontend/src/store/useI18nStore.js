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

  t: (key, params) => {
    const lang = get().language;
    let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.vi?.[key] || key;
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return text;
  },
}));
