import { HeroSection } from "@/components/sections/HeroSection";
import { TrustedBySection } from "@/components/sections/TrustedBySection";
import { ExcellenceSection } from "@/components/sections/ExcellenceSection";
import { FeatureStickyNav } from "@/components/sections/FeatureStickyNav";
import { FeatureEcommerce } from "@/components/sections/FeatureEcommerce";
import { FeatureClients } from "@/components/sections/FeatureClients";
import { FeatureInventory } from "@/components/sections/FeatureInventory";
import { IntegrationsSection } from "@/components/sections/IntegrationsSection";
import { BlogSection } from "@/components/sections/BlogSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { IntegrationsSection2 } from "@/components/homepage2/sections/IntegrationsSection2";
import { TeamSection2 } from "@/components/homepage2/sections/TeamSection2";

export default function Home() {
  return (
    <div id="content" className="site-content">
      <div id="primary" className="content-area">
        <main id="main" className="site-main">
          <article id="post-21437" className="post-21437 page type-page">
            <div className="entry-content">
              <div className="elementor elementor-21437">
                <HeroSection />
                <TrustedBySection />
                <ExcellenceSection />
                <FeatureStickyNav />
                <FeatureEcommerce />
                <FeatureClients />
                <FeatureInventory />
                <IntegrationsSection />
                <BlogSection />
                <TestimonialsSection />
                <div className="hp2-scope">
                  <div className="elementor-3950">
                    <IntegrationsSection2 />
                    <TeamSection2 />
                  </div>
                </div>
                <CtaSection />
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
