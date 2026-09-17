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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles.constant';
import { useI18nStore } from '../../store/useI18nStore';
import { StyleDetailModal } from '../../components/features/landing/StyleDetailModal';

export const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();
  const { t, language, toggleLanguage } = useI18nStore();
  const [selectedStyle, setSelectedStyle] = useState(null);

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
      color: 'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-600',
      tagBadgeColor: 'bg-rose-500/90 border-rose-300 text-white',
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
      color: 'from-amber-500/10 to-rose-500/10 border-amber-200 text-amber-600',
      tagBadgeColor: 'bg-amber-500/90 border-amber-300 text-white',
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
      color: 'from-purple-500/10 to-rose-500/10 border-purple-200 text-purple-600',
      tagBadgeColor: 'bg-purple-600/90 border-purple-300 text-white',
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
      color: 'from-amber-600/10 to-orange-500/10 border-amber-200 text-amber-700',
      tagBadgeColor: 'bg-amber-700/90 border-amber-300 text-white',
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
    {
      icon: ShieldCheck,
      title: t('landing_hl_1_title'),
      desc: t('landing_hl_1_desc'),
    },
    {
      icon: Clock,
      title: t('landing_hl_2_title'),
      desc: t('landing_hl_2_desc'),
    },
    {
      icon: CalendarCheck,
      title: t('landing_hl_3_title'),
      desc: t('landing_hl_3_desc'),
    },
    {
      icon: HeartHandshake,
      title: t('landing_hl_4_title'),
      desc: t('landing_hl_4_desc'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-pink-50/30 text-slate-900 selection:bg-rose-500 selection:text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-xl block">
                {t('app_title')}
              </span>
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block -mt-1">
                {t('landing_brand_subtitle')}
              </span>
            </div>
          </Link>

          {/* Quick Nav & Actions */}
          <div className="flex items-center gap-3">
            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/70 text-slate-700 active:scale-95 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title={t('switch_language')}
            >
              <Globe className="w-3.5 h-3.5 text-rose-600" />
              <span>{language.toUpperCase()}</span>
            </button>

            <Link
              to="/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
            >
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>{t('landing_register_studio')}</span>
            </Link>

            <Link
              to={getDashboardPath()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{isAuthenticated ? t('landing_go_to_dashboard') : t('landing_admin_login')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative max-w-6xl mx-auto px-6 pt-14 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('landing_hero_badge')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            {t('landing_hero_title_1')} <br />
            <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 bg-clip-text text-transparent">
              {t('landing_hero_title_2')}
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            {t('landing_hero_desc')}
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{t('landing_hero_cta_login')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-xs hover:border-rose-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-rose-600" />
              <span>{t('landing_hero_cta_partner')}</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('landing_trust_1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('landing_trust_2')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('landing_trust_3')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('landing_trust_4')}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Trending Makeup Styles */}
        <section className="py-16 bg-white border-y border-rose-100/60">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                <Palette className="w-4 h-4" />
                <span>{t('landing_styles_tag')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {t('landing_styles_title')}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                {t('landing_styles_sub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {makeupStyles.map((style) => (
                <div
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/10 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Style Tag */}
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-4 ${style.color}`}>
                      {style.tag}
                    </span>

                    {/* Image Thumbnail Preview */}
                    <div className="relative w-full h-40 mb-4 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={style.image}
                        alt={style.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                      {style.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed font-normal line-clamp-3">
                      {style.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
                    <span>{t('landing_view_detail')}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Platform Highlights */}
        <section className="py-16 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                <Flame className="w-4 h-4" />
                <span>{t('landing_highlights_tag')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {t('landing_highlights_title')}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                {t('landing_highlights_sub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col items-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Dual Role Gateways */}
        <section className="py-16 max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              {t('landing_gateways_tag')}
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {t('landing_gateways_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Super Admin Card */}
            <div className="p-8 rounded-3xl bg-white border border-rose-200 shadow-md shadow-rose-100/50 flex flex-col justify-between hover:border-rose-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  {t('landing_gateway_sa_title')}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  {t('landing_gateway_sa_desc')}
                </p>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <span>{t('landing_gateway_sa_btn')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Agency Admin Card */}
            <div className="p-8 rounded-3xl bg-white border border-indigo-200 shadow-md shadow-indigo-100/50 flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  {t('landing_gateway_agency_title')}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
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
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
              M
            </div>
            <span className="font-bold text-slate-800">{t('app_title')}</span>
          </div>
          <p>{t('landing_footer_copy')}</p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <Link to="/login" className="hover:text-rose-600">{t('landing_footer_login')}</Link>
            <Link to="/register" className="hover:text-rose-600">{t('landing_footer_register')}</Link>
          </div>
        </div>
      </footer>

      {/* Style Detail 3D Modal */}
      <StyleDetailModal
        isOpen={Boolean(selectedStyle)}
        onClose={() => setSelectedStyle(null)}
        styleData={selectedStyle}
      />
    </div>
  );
};
