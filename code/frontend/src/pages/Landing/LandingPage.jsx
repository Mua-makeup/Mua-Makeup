import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  CalendarCheck,
  Palette,
  Clock,
  Flame,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles.constant';
import { useI18nStore } from '../../store/useI18nStore';
import { useThemeStore } from '../../store/useThemeStore';
import { StyleDetailModal } from '../../components/features/landing/StyleDetailModal';

export const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();
  const { t, language, toggleLanguage } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();
  const [selectedStyle, setSelectedStyle] = useState(null);

  const isDark = theme === 'dark';

  const getDashboardPath = () => {
    if (!isAuthenticated) return '/login';
    return role === USER_ROLES.SUPER_ADMIN ? '/admin/dashboard' : '/agency/dashboard';
  };

  const makeupStyles = [
    {
      id: 'bridal_vip',
      title: t('style_bridal_title'),
      tag: t('style_bridal_tag'),
      desc: t('style_bridal_desc'),
      image: '/images/styles/bridal_vip.jpg',
      color: isDark
        ? 'from-rose-500/20 to-pink-500/20 border-rose-700 text-rose-400'
        : 'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-600',
      duration: t('style_bridal_duration'),
      palette: t('style_bridal_palette'),
      occasion: t('style_bridal_occasion'),
      features: [
        t('style_bridal_feature_1'),
        t('style_bridal_feature_2'),
        t('style_bridal_feature_3'),
      ],
    },
    {
      id: 'douyin_korean',
      title: t('style_douyin_title'),
      tag: t('style_douyin_tag'),
      desc: t('style_douyin_desc'),
      image: '/images/styles/douyin_korean.jpg',
      color: isDark
        ? 'from-amber-500/20 to-rose-500/20 border-amber-700 text-amber-400'
        : 'from-amber-500/10 to-rose-500/10 border-amber-200 text-amber-600',
      duration: t('style_douyin_duration'),
      palette: t('style_douyin_palette'),
      occasion: t('style_douyin_occasion'),
      features: [
        t('style_douyin_feature_1'),
        t('style_douyin_feature_2'),
        t('style_douyin_feature_3'),
      ],
    },
    {
      id: 'gala_vip',
      title: t('style_gala_title'),
      tag: t('style_gala_tag'),
      desc: t('style_gala_desc'),
      image: '/images/styles/gala_vip.jpg',
      color: isDark
        ? 'from-purple-500/20 to-rose-500/20 border-purple-700 text-purple-400'
        : 'from-purple-500/10 to-rose-500/10 border-purple-200 text-purple-600',
      duration: t('style_gala_duration'),
      palette: t('style_gala_palette'),
      occasion: t('style_gala_occasion'),
      features: [
        t('style_gala_feature_1'),
        t('style_gala_feature_2'),
        t('style_gala_feature_3'),
      ],
    },
    {
      id: 'nude_western',
      title: t('style_western_title'),
      tag: t('style_western_tag'),
      desc: t('style_western_desc'),
      image: '/images/styles/nude_western.jpg',
      color: isDark
        ? 'from-amber-600/20 to-orange-500/20 border-amber-700 text-amber-400'
        : 'from-amber-600/10 to-orange-500/10 border-amber-200 text-amber-700',
      duration: t('style_western_duration'),
      palette: t('style_western_palette'),
      occasion: t('style_western_occasion'),
      features: [
        t('style_western_feature_1'),
        t('style_western_feature_2'),
        t('style_western_feature_3'),
      ],
    },
  ];

  const highlights = [
    { icon: ShieldCheck, title: t('landing_hl_1_title'), desc: t('landing_hl_1_desc') },
    { icon: Clock, title: t('landing_hl_2_title'), desc: t('landing_hl_2_desc') },
    { icon: CalendarCheck, title: t('landing_hl_3_title'), desc: t('landing_hl_3_desc') },
    { icon: HeartHandshake, title: t('landing_hl_4_title'), desc: t('landing_hl_4_desc') },
  ];

  return (
    <div
      className={`min-h-screen selection:bg-rose-500 selection:text-white flex flex-col justify-between transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-100'
          : 'bg-gradient-to-b from-rose-50/40 via-white to-pink-50/30 text-slate-900'
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-xs transition-colors duration-300 ${
          isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-rose-100/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span
                className={`font-extrabold tracking-tight text-base sm:text-xl block leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
              >
                {t('app_title')}
              </span>
              <span className="text-[9px] sm:text-[10px] text-rose-500 font-bold uppercase tracking-wider block -mt-0.5">
                {t('landing_brand_subtitle')}
              </span>
            </div>
          </Link>

          {/* Quick Nav & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border transition-all active:scale-95 cursor-pointer shrink-0 ${
                isDark
                  ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-amber-400'
                  : 'border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/70 text-slate-600'
              }`}
              title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 ${
                isDark
                  ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/70 text-slate-700'
              }`}
              title={t('switch_language')}
            >
              <Globe className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{language.toUpperCase()}</span>
            </button>

            <Link
              to="/register"
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                isDark
                  ? 'text-slate-300 hover:text-rose-400 hover:bg-slate-800'
                  : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>{t('landing_register_studio')}</span>
            </Link>

            <Link
              to={getDashboardPath()}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-[11px] sm:text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <span className="hidden xs:inline">{isAuthenticated ? t('landing_go_to_dashboard') : t('landing_admin_login')}</span>
              <span className="xs:hidden">{isAuthenticated ? 'Bảng ĐK' : 'Đăng Nhập'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-14 sm:pb-20 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold mb-6 shadow-xs ${
              isDark
                ? 'bg-rose-950/60 border-rose-800 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('landing_hero_badge')}</span>
          </div>

          <h1
            className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {t('landing_hero_title_1')} <br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              {t('landing_hero_title_2')}
            </span>
          </h1>

          <p
            className={`mt-4 sm:mt-6 text-sm sm:text-lg max-w-3xl mx-auto leading-relaxed font-normal ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {t('landing_hero_desc')}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto w-full">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{t('landing_hero_cta_login')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:py-4 rounded-2xl font-bold text-sm border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600 hover:border-rose-500'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-rose-300 shadow-xs'
              }`}
            >
              <Building2 className="w-4 h-4 text-rose-600" />
              <span>{t('landing_hero_cta_partner')}</span>
            </Link>
          </div>

          <div
            className={`mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {[t('landing_trust_1'), t('landing_trust_2'), t('landing_trust_3'), t('landing_trust_4')].map(
              (trust, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{trust}</span>
                </div>
              )
            )}
          </div>
        </section>

        {/* Section 2: Trending Makeup Styles */}
        <section
          className={`py-12 sm:py-16 border-y transition-colors duration-300 ${
            isDark ? 'bg-slate-800/50 border-slate-700/60' : 'bg-white border-rose-100/60'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
                <Palette className="w-4 h-4" />
                <span>{t('landing_styles_tag')}</span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {t('landing_styles_title')}
              </h2>
              <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('landing_styles_sub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {makeupStyles.map((style) => (
                <div
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between group cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 hover:border-rose-600 hover:shadow-xl hover:shadow-rose-900/20'
                      : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/10'
                  }`}
                >
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-4 ${style.color}`}>
                      {style.tag}
                    </span>

                    <div className={`relative w-full h-40 mb-4 rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-100'}`}>
                      <img
                        src={style.image}
                        alt={style.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h3 className={`text-lg font-bold group-hover:text-rose-500 transition-colors ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {style.title}
                    </h3>
                    <p className={`mt-2 text-xs leading-relaxed font-normal line-clamp-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {style.desc}
                    </p>
                  </div>
                  <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs font-bold text-rose-500 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <span>{t('landing_view_detail')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Platform Highlights */}
        <section className={`py-12 sm:py-16 transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-slate-50/50'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
                <Flame className="w-4 h-4" />
                <span>{t('landing_highlights_tag')}</span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {t('landing_highlights_title')}
              </h2>
              <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('landing_highlights_sub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col items-start ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${isDark ? 'bg-rose-950/50 border-rose-800 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-sm font-bold mb-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Dual Role Gateways */}
        <section className={`py-12 sm:py-16 transition-colors duration-300 ${isDark ? 'bg-slate-800/50' : ''}`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                {t('landing_gateways_tag')}
              </span>
              <h2 className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {t('landing_gateways_title')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Super Admin Card */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-md flex flex-col justify-between transition-all ${
                  isDark
                    ? 'bg-slate-800 border-rose-800/60 shadow-rose-900/20 hover:border-rose-700'
                    : 'bg-white border-rose-200 shadow-rose-100/50 hover:border-rose-300'
                }`}
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${isDark ? 'bg-rose-950/50 border-rose-800 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {t('landing_gateway_sa_title')}
                  </h3>
                  <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('landing_gateway_sa_desc')}
                  </p>
                </div>
                <Link
                  to="/login"
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{t('landing_gateway_sa_btn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Agency Admin Card */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-md flex flex-col justify-between transition-all ${
                  isDark
                    ? 'bg-slate-800 border-indigo-800/60 shadow-indigo-900/20 hover:border-indigo-700'
                    : 'bg-white border-indigo-200 shadow-indigo-100/50 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border ${isDark ? 'bg-indigo-950/50 border-indigo-800 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {t('landing_gateway_agency_title')}
                  </h3>
                  <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('landing_gateway_agency_desc')}
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <span>{t('landing_gateway_agency_btn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-8 text-center text-xs transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
              M
            </div>
            <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              {t('app_title')}
            </span>
          </div>
          <p>{t('landing_footer_copy')}</p>
          <div className={`flex items-center gap-4 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Link to="/login" className="hover:text-rose-500">{t('landing_footer_login')}</Link>
            <Link to="/register" className="hover:text-rose-500">{t('landing_footer_register')}</Link>
          </div>
        </div>
      </footer>

      {/* Style Detail Modal */}
      <StyleDetailModal
        isOpen={Boolean(selectedStyle)}
        onClose={() => setSelectedStyle(null)}
        styleData={selectedStyle}
      />
    </div>
  );
};
