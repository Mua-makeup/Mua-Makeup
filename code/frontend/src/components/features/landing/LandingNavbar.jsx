import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  ArrowRight,
  Globe,
  Sun,
  Moon,
  Menu,
  X,
  Compass,
  Layers,
  Palette,
  Workflow,
  Laptop,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { USER_ROLES } from '../../../constants/roles.constant';
import { useI18nStore } from '../../../store/useI18nStore';
import { useThemeStore } from '../../../store/useThemeStore';

export const LandingNavbar = () => {
  const { isAuthenticated, role } = useAuth();
  const { t, language, toggleLanguage } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';

  const getDashboardPath = () => {
    if (!isAuthenticated) return '/login';
    return role === USER_ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/agency/dashboard';
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '#audiences', label: t('nav_audiences'), icon: Compass },
    { href: '#features', label: t('nav_features'), icon: Layers },
    { href: '#styles', label: t('nav_styles'), icon: Palette },
    { href: '#workflow', label: t('nav_workflow'), icon: Workflow },
    { href: '#preview', label: t('nav_preview'), icon: Laptop },
    { href: '#faq', label: t('nav_faq'), icon: HelpCircle },
  ];

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 focus:outline-hidden focus:ring-2 focus:ring-rose-500 rounded-xl"
        >
          <div className="w-9 h-9 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-tight text-base sm:text-lg block text-slate-900 dark:text-white">
              {t('app_title')}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold tracking-wider uppercase block -mt-0.5">
              {t('landing_brand_subtitle')}
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 whitespace-nowrap shrink-0">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="px-2.5 xl:px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? t('landing_theme_light') : t('landing_theme_dark')}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
            title={isDark ? t('landing_theme_light') : t('landing_theme_dark')}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            aria-label={t('switch_language')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={t('switch_language')}
          >
            <Globe className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Register Studio CTA (Desktop) */}
          <Link
            to="/register"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
          >
            <Building2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t('landing_register_studio')}</span>
          </Link>

          {/* Portal Login / Dashboard CTA */}
          <Link
            to={getDashboardPath()}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-102 active:scale-98 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>{isAuthenticated ? t('landing_go_to_dashboard') : t('landing_admin_login')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('landing_close_menu') : t('landing_menu_mobile')}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <div className="grid grid-cols-2 gap-2 pt-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <link.icon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{link.label}</span>
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Building2 className="w-4 h-4 text-rose-600" />
              <span>{t('landing_register_studio')}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
