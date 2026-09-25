import { TextRotator } from "../TextRotator";
import { NewsletterForm } from "../NewsletterForm";

// Markup mirrors the original hero section (elementor-element-0d2f721).
// The text-rotator widget and newsletter form are swapped for the client
// re-implementations (see TextRotator.tsx / NewsletterForm.tsx); everything
// else is a verbatim structural port.
export function HeroSection() {
  return (
    <div className="elementor-element elementor-element-0d2f721 e-con-full hero-section e-flex e-con e-parent">
      <div className="elementor-element elementor-element-d161d60 e-con-full e-flex e-con e-child">
        <div className="elementor-element elementor-element-9d5d479 e-con-full e-flex e-con e-child">
          <div className="elementor-element elementor-element-5b9308d elementor-widget elementor-widget-keydesign-text-rotator">
            <div className="kd-widget-container">
              <TextRotator prefix="Your" words={["complete", "all-in-one", "open-source"]} />
            </div>
          </div>
          <div className="elementor-element elementor-element-953b867 elementor-widget elementor-widget-keydesign-heading">
            <div className="kd-widget-container">
              <div className="kd-heading">
                <h1 className="kd-heading__title">
                  Client &amp; project management<br /> built for{" "}
                  <span className="kd-heading-highlight">
                    <span className="kd-highlight">freelancers</span>
                  </span>
                </h1>
                <div className="kd-heading__desc">
                  <p>
                    Track projects and milestones, share files, send contracts, and get
                    paid, all from one client portal. Self-hosted, open source, and
                    free.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="elementor-element elementor-element-0c2e15c e-flex e-con-boxed e-con e-child">
            <div className="e-con-inner">
              <div className="elementor-element elementor-element-9e0b4dd elementor-widget elementor-widget-keydesign-contact-form7">
                <div className="kd-widget-container">
                  <NewsletterForm instanceId="f17128-p21437-o1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="elementor-element elementor-element-6c8358c e-con-full elementor-hidden-tablet elementor-hidden-mobile e-flex e-con e-child">
        <div className="elementor-element elementor-element-10851c5 elementor-widget elementor-widget-image">
          <img
            decoding="async"
            width={1292}
            height={1012}
            src="/images/329bbf4a014a.png"
            className="attachment-full size-full"
            alt="Dashboard preview showing invoices, clients, and analytics"
          />
        </div>
      </div>
    </div>
  );
}
