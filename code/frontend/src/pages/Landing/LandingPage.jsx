import React, { useState, useEffect } from 'react';
import { useI18nStore } from '../../store/useI18nStore';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { LandingNavbar } from '../../components/features/landing/LandingNavbar';
import { LandingHero } from '../../components/features/landing/LandingHero';
import { LandingMarqueeShowcase } from '../../components/features/landing/LandingMarqueeShowcase';
import { LandingAudienceValue } from '../../components/features/landing/LandingAudienceValue';
import { LandingBentoFeatures } from '../../components/features/landing/LandingBentoFeatures';
import { LandingStylesSection } from '../../components/features/landing/LandingStylesSection';
import { LandingWorkflowSteps } from '../../components/features/landing/LandingWorkflowSteps';
import { LandingOperationalPreview } from '../../components/features/landing/LandingOperationalPreview';
import { LandingFaqSection } from '../../components/features/landing/LandingFaqSection';
import { LandingCtaSection } from '../../components/features/landing/LandingCtaSection';
import { LandingFooter } from '../../components/features/landing/LandingFooter';
import { StyleDetailModal } from '../../components/features/landing/StyleDetailModal';

export const LandingPage = () => {
  const { t, language } = useI18nStore();
  const [selectedStyle, setSelectedStyle] = useState(null);

  // Activate scroll-reveal animation across all landing sections
  useScrollReveal('.reveal-on-scroll', 0.12);

  // Sync document title, description and lang attribute
  useEffect(() => {
    document.title = t('landing_page_title_seo');
    document.documentElement.lang = language;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('landing_page_desc_seo'));
    }
  }, [language, t]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white transition-colors duration-200">
      {/* Header Navigation */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with entrance animation */}
        <div className="animate-fade-in-up">
          <LandingHero />
        </div>

        {/* Realtime Marquee Showcase: Luxury Partner Brands (Left to Right Slide) */}
        <LandingMarqueeShowcase />

        {/* Audience Value Proposition */}
        <div className="reveal-on-scroll">
          <LandingAudienceValue />
        </div>

        {/* Bento Features Grid */}
        <div className="reveal-on-scroll">
          <LandingBentoFeatures />
        </div>

        {/* Featured Styles Collection */}
        <div className="reveal-on-scroll">
          <LandingStylesSection onSelectStyle={setSelectedStyle} />
        </div>

        {/* How to Get Started Workflow */}
        <div className="reveal-on-scroll">
          <LandingWorkflowSteps />
        </div>

        {/* Operational Preview of Studio Portal */}
        <div className="reveal-on-scroll">
          <LandingOperationalPreview />
        </div>

        {/* Frequently Asked Questions */}
        <div className="reveal-on-scroll">
          <LandingFaqSection />
        </div>

        {/* Final Call to Action */}
        <div className="reveal-on-scroll">
          <LandingCtaSection />
        </div>
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Interactive Style Detail Modal */}
      <StyleDetailModal
        isOpen={Boolean(selectedStyle)}
        onClose={() => setSelectedStyle(null)}
        styleData={selectedStyle}
      />
    </div>
  );
};
