import { HeroSection2 } from "@/components/homepage2/sections/HeroSection2";
import { TrustedLogosSection2 } from "@/components/homepage2/sections/TrustedLogosSection2";
import { UnifiedPlatformSection2 } from "@/components/homepage2/sections/UnifiedPlatformSection2";
import { FeaturesTabsSection2 } from "@/components/homepage2/sections/FeaturesTabsSection2";
import { TestimonialsSection2 } from "@/components/homepage2/sections/TestimonialsSection2";
import { IntegrationsSection2 } from "@/components/homepage2/sections/IntegrationsSection2";
import { TeamSection2 } from "@/components/homepage2/sections/TeamSection2";
import { ProcessCompareSection2 } from "@/components/homepage2/sections/ProcessCompareSection2";
import { FaqSection2 } from "@/components/homepage2/sections/FaqSection2";
import { CtaSection2 } from "@/components/homepage2/sections/CtaSection2";

// Note: a hidden SEO spam link injection (a zero-size, off-screen <div>
// promoting an unrelated gambling-affiliate site, disguised as an
// Elementor "HTML widget") was present as a sibling of these sections in
// example2-homepage2.html. It is deliberately not ported here.
export default function Homepage2() {
  return (
    <div className="elementor elementor-3950">
      <HeroSection2 />
      <TrustedLogosSection2 />
      <UnifiedPlatformSection2 />
      <FeaturesTabsSection2 />
      <TestimonialsSection2 />
      <IntegrationsSection2 />
      <TeamSection2 />
      <ProcessCompareSection2 />
      <FaqSection2 />
      <CtaSection2 />
    </div>
  );
}
