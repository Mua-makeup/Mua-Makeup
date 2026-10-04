import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingMarqueeShowcase = () => {
  const { t } = useI18nStore();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Sync ref with state for animation loop
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 12 Curated Global Luxury Cosmetics Brands with authentic SVG avatars/emblems
  const brandPartners = [
    {
      id: 'dior',
      name: 'DIOR',
      fullName: 'Christian Dior Paris',
      origin: 'Paris, France',
      specialty: 'Haute Couture Beauty',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Dior Logo">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fontFamily="'Cinzel', 'Playfair Display', Georgia, serif"
            fontSize="26"
            fontWeight="bold"
            letterSpacing="2"
          >
            CD
          </text>
        </svg>
      ),
    },
    {
      id: 'chanel',
      name: 'CHANEL',
      fullName: 'Chanel Beauté',
      origin: 'Paris, France',
      specialty: 'Timeless Luxury',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-none stroke-current" strokeWidth="6" aria-label="Chanel Logo">
          <path d="M 64 26 C 42 26, 32 38, 32 50 C 32 62, 42 74, 64 74" strokeLinecap="round" />
          <path d="M 36 26 C 58 26, 68 38, 68 50 C 68 62, 58 74, 36 74" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'ysl',
      name: 'YVES SAINT LAURENT',
      fullName: 'YSL Beauté',
      origin: 'Paris, France',
      specialty: 'Pure Radiance & Glow',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="YSL Logo">
          <rect x="10" y="10" width="80" height="80" rx="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <text
            x="50"
            y="61"
            textAnchor="middle"
            fontFamily="'Bodoni MT', 'Didot', serif"
            fontSize="32"
            fontWeight="900"
            letterSpacing="1"
          >
            YSL
          </text>
        </svg>
      ),
    },
    {
      id: 'mac',
      name: 'M·A·C',
      fullName: 'M·A·C Cosmetics',
      origin: 'New York, USA',
      specialty: 'All Ages • All Races',
      logo: (
        <svg viewBox="0 0 120 100" className="w-12 h-10 fill-current" aria-label="MAC Logo">
          <text
            x="60"
            y="58"
            textAnchor="middle"
            fontFamily="'Futura', 'Helvetica Neue', Arial, sans-serif"
            fontSize="26"
            fontWeight="900"
            letterSpacing="2"
          >
            M·A·C
          </text>
          <text
            x="60"
            y="76"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="8"
            fontWeight="bold"
            letterSpacing="3"
            opacity="0.6"
          >
            COSMETICS
          </text>
        </svg>
      ),
    },
    {
      id: 'nars',
      name: 'NARS',
      fullName: 'NARS Cosmetics',
      origin: 'New York, USA',
      specialty: 'Iconic Cheek & Lip',
      logo: (
        <svg viewBox="0 0 120 100" className="w-12 h-10 fill-current" aria-label="NARS Logo">
          <text
            x="60"
            y="60"
            textAnchor="middle"
            fontFamily="'Helvetica Neue', 'Arial Black', sans-serif"
            fontSize="30"
            fontWeight="900"
            letterSpacing="-2"
          >
            NARS
          </text>
        </svg>
      ),
    },
    {
      id: 'charlotte_tilbury',
      name: 'CHARLOTTE TILBURY',
      fullName: 'Charlotte Tilbury Beauty',
      origin: 'London, UK',
      specialty: 'Pillow Talk Glamour',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Charlotte Tilbury Logo">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <path
            d="M 50 18 L 53 38 L 73 35 L 58 48 L 71 63 L 52 56 L 41 72 L 43 52 L 25 47 L 42 39 Z"
            fill="currentColor"
            opacity="0.85"
          />
          <text
            x="50"
            y="84"
            textAnchor="middle"
            fontFamily="serif"
            fontSize="12"
            fontWeight="bold"
            letterSpacing="2"
          >
            CT
          </text>
        </svg>
      ),
    },
    {
      id: 'tom_ford',
      name: 'TOM FORD',
      fullName: 'Tom Ford Beauty',
      origin: 'Milano, Italy',
      specialty: 'Private Blend Glam',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Tom Ford Logo">
          <rect x="14" y="14" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="3" />
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fontSize="26"
            fontWeight="900"
            letterSpacing="2"
          >
            TF
          </text>
        </svg>
      ),
    },
    {
      id: 'lancome',
      name: 'LANCÔME',
      fullName: 'Lancôme Paris',
      origin: 'Paris, France',
      specialty: 'French Rose Radiance',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Lancome Logo">
          <path
            d="M 50 25 C 42 25 35 32 35 40 C 35 52 50 72 50 72 C 50 72 65 52 65 40 C 65 32 58 25 50 25 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="40" r="6" fill="currentColor" />
          <text
            x="50"
            y="87"
            textAnchor="middle"
            fontFamily="'Bodoni MT', 'Didot', serif"
            fontSize="10"
            fontWeight="bold"
            letterSpacing="1"
          >
            PARIS
          </text>
        </svg>
      ),
    },
    {
      id: 'estee_lauder',
      name: 'ESTÉE LAUDER',
      fullName: 'Estée Lauder NY',
      origin: 'New York, USA',
      specialty: 'Double Wear Expert',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Estee Lauder Logo">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          <text
            x="50"
            y="59"
            textAnchor="middle"
            fontFamily="'Playfair Display', 'Times New Roman', serif"
            fontSize="28"
            fontWeight="bold"
            fontStyle="italic"
          >
            EL
          </text>
        </svg>
      ),
    },
    {
      id: 'bobbi_brown',
      name: 'BOBBI BROWN',
      fullName: 'Bobbi Brown New York',
      origin: 'New York, USA',
      specialty: 'Flawless Skin Base',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Bobbi Brown Logo">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fontFamily="'Cinzel', serif"
            fontSize="24"
            fontWeight="900"
            letterSpacing="2"
          >
            BB
          </text>
          <text
            x="50"
            y="74"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="7"
            fontWeight="bold"
            letterSpacing="2"
            opacity="0.6"
          >
            STUDIO
          </text>
        </svg>
      ),
    },
    {
      id: 'shiseido',
      name: 'SHISEIDO',
      fullName: 'Shiseido Ginza Tokyo',
      origin: 'Tokyo, Japan',
      specialty: 'Japanese Skincare Infused',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Shiseido Logo">
          <circle cx="50" cy="38" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          <circle cx="42" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          <circle cx="58" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.8" />
          <text
            x="50"
            y="83"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="2"
          >
            GINZA
          </text>
        </svg>
      ),
    },
    {
      id: 'fenty_beauty',
      name: 'FENTY BEAUTY',
      fullName: 'Fenty Beauty by Rihanna',
      origin: 'California, USA',
      specialty: 'Pro Filt’r 50+ Shades',
      logo: (
        <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" aria-label="Fenty Beauty Logo">
          <rect x="12" y="12" width="76" height="76" rx="16" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontFamily="'Arial Black', Impact, sans-serif"
            fontSize="26"
            fontWeight="900"
            letterSpacing="1"
          >
            FB
          </text>
        </svg>
      ),
    },
  ];

  // Quadruple items to ensure a seamless infinite circular scroll
  const displayItems = [...brandPartners, ...brandPartners, ...brandPartners, ...brandPartners];

  // Smooth continuous fluid auto-glide using requestAnimationFrame
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Start centered in the duplicated scroll track
    if (container.scrollLeft === 0) {
      container.scrollLeft = container.scrollWidth / 4;
    }

    let animationFrameId;
    const speed = 0.85; // Silky smooth speed (pixels per frame)

    const step = () => {
      if (!isPausedRef.current && container) {
        // Slide from left to right (content flows to the right)
        container.scrollLeft -= speed;

        // When reaching near the beginning, seamlessly wrap forward to the middle
        if (container.scrollLeft <= 10) {
          container.scrollLeft += container.scrollWidth / 2;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Smooth step when clicking navigation buttons
  const handlePrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-12 sm:py-16 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80 overflow-hidden reveal-on-scroll">
      {/* Decorative Luxury Background Glows */}
      <div className="absolute top-1/2 -left-28 -translate-y-1/2 w-80 h-80 bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-28 -translate-y-1/2 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-7 sm:mb-9">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 shadow-xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>{t('landing_marquee_badge')}</span>
        </div>

        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('landing_marquee_brand_title')}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('landing_marquee_brand_subtitle')}
        </p>

        {/* Quality Commitment Badges - Perfectly Centered & Balanced */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 font-medium shadow-xs backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{t('landing_marquee_authentic_guarantee')}</span>
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 font-medium shadow-xs backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            <span>{t('landing_marquee_certified_artists')}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HORIZONTAL SLIDER WITH ARROWS PLACED OUTSIDE THE CARDS TRACK               */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 select-none">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Left Arrow Button - Completely outside the cards */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label={t('landing_marquee_prev')}
            className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md hover:bg-rose-500 hover:text-white hover:border-rose-500 dark:hover:bg-rose-500 dark:hover:text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Viewport Container with Edge Gradient Masks */}
          <div
            className="relative flex-1 overflow-hidden py-3"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left Edge Gradient Fade */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-slate-100/90 dark:from-slate-900 to-transparent z-10" />

            {/* Right Edge Gradient Fade */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-slate-100/90 dark:from-slate-900 to-transparent z-10" />

            {/* Smooth Scrollable Cards Track */}
            <div
              ref={scrollRef}
              className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-2"
            >
              {displayItems.map((brand, index) => (
                <div
                  key={`brand-${brand.id}-${index}`}
                  className="w-[280px] sm:w-[310px] shrink-0 group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-lg hover:border-rose-400 dark:hover:border-rose-500/80 hover:-translate-y-1 transition-all duration-300 cursor-default"
                >
                  {/* Brand Logo Avatar */}
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:border-rose-300 dark:group-hover:border-rose-500/50 shadow-inner group-hover:scale-105 transition-all">
                    {brand.logo}
                  </div>

                  {/* Brand Information - Ample width without ugly truncation */}
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-black tracking-wide text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors whitespace-nowrap">
                      {brand.name}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {brand.origin}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate">
                      {brand.specialty}
                    </div>
                  </div>

                  {/* Verified Dot */}
                  <div className="flex items-center pl-1 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" title="Verified Genuine Cosmetics" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Arrow Button - Completely outside the cards */}
          <button
            type="button"
            onClick={handleNext}
            aria-label={t('landing_marquee_next')}
            className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md hover:bg-rose-500 hover:text-white hover:border-rose-500 dark:hover:bg-rose-500 dark:hover:text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};
