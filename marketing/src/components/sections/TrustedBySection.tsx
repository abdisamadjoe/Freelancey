import { LogoCarousel } from "../LogoCarousel";

// Markup mirrors the original "Trusted by industry leaders" section
// (elementor-element-fc2ab84). The frozen Swiper DOM captured by
// SingleFile is replaced with the real, working LogoCarousel component.
export function TrustedBySection() {
  return (
    <div className="elementor-element elementor-element-fc2ab84 e-con-full e-flex e-con e-parent">
      <div className="elementor-element elementor-element-ab6fe83 e-flex e-con-boxed e-con e-child">
        <div className="e-con-inner">
          <div className="elementor-element elementor-element-8701a3c e-con-full e-flex e-con e-child">
            <div className="elementor-element elementor-element-81aa90c elementor-widget elementor-widget-text-editor">
              <p>Built with tools freelancers already trust:</p>
            </div>
          </div>
          <div className="elementor-element elementor-element-cd80e8f elementor-widget elementor-widget-keydesign-advanced-carousel">
            <div className="kd-widget-container">
              <LogoCarousel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
