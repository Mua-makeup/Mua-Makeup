import React, { useState, useEffect } from 'react';
import { useI18nStore } from '../../store/useI18nStore';
import { LandingNavbar } from '../../components/features/landing/LandingNavbar';
import { LandingHero } from '../../components/features/landing/LandingHero';
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
        {/* Hero Section */}
        <LandingHero />

        {/* Audience Value Proposition */}
        <LandingAudienceValue />

        {/* Bento Features Grid */}
        <LandingBentoFeatures />

        {/* Featured Styles Collection */}
        <LandingStylesSection onSelectStyle={setSelectedStyle} />

        {/* How to Get Started Workflow */}
        <LandingWorkflowSteps />

        {/* Operational Preview of Studio Portal */}
        <LandingOperationalPreview />

        {/* Frequently Asked Questions */}
        <LandingFaqSection />

        {/* Final Call to Action */}
        <LandingCtaSection />
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
