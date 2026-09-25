"use client";

import Image from "next/image";
import Link from "next/link";
import { useUIState } from "./UIStateProvider";

const NAV_LINKS = [
  { label: "Features", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

/**
 * Markup mirrors the original header (elementor-33743). The mobile nav
 * overlay's positioning/transition CSS already exists in
 * styles/combined.css (`.kd-nav-menu-widget .nav-primary`) — it was
 * originally driven by inline opacity/visibility set by the theme's JS,
 * which SingleFile didn't capture, so that's reproduced here via React
 * state. The hamburger icon's bars did not exist in the captured markup
 * at all (theme JS injected them at runtime) and are new (see
 * styles/custom.css). Nav links point to this project's local paths
 * mirroring the original site structure; only the homepage exists here,
 * so they are placeholders.
 */
export function SiteHeader() {
  const { mobileNavOpen, setMobileNavOpen, setPopupOpen } = useUIState();

  return (
    <header id="site-header" className="site-header sticky-header">
      <div className="site-header-wrapper">
        <div data-elementor-type="wp-post" data-elementor-id="33743" className="elementor elementor-33743">
          <div className="elementor-element elementor-element-b70990e e-flex e-con-boxed e-con e-parent">
            <div className="e-con-inner">
              <div className="elementor-element elementor-element-9ccd6bd e-flex e-con-boxed e-con e-child">
                <div className="e-con-inner">
                  <div className="elementor-element elementor-element-507672c e-con-full e-flex e-con e-child">
                    <div className="elementor-element elementor-element-962337b elementor-widget elementor-widget-kd_site_logo">
                      <div className="site-logo-wrapper">
                        <Link className="site-logo" href="/" aria-label="Home">
                          <span className="primary-logo">
                            <Image
                              width={391}
                              height={87}
                              src="/logo/freelancey.svg"
                              className="attachment-large size-large"
                              alt="Freelancey"
                              priority
                            />
                          </span>
                          <span className="secondary-logo">
                            <Image
                              width={391}
                              height={87}
                              src="/logo/freelancey.svg"
                              className="attachment-large size-large"
                              alt="Freelancey"
                            />
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="elementor-element elementor-element-6ebf2e4 e-con-full e-flex e-con e-child">
                    <div className="elementor-element elementor-element-a58c2bd elementor-widget elementor-widget-keydesign-nav-menu">
                      <div className="kd-widget-container">
                        <div className="main-navigation-wrapper main-menu-container kd-nav-menu-widget" id="main-navigation-wrapper">
                          <button
                            aria-controls="nav"
                            aria-label="Toggle navigation"
                            aria-expanded={mobileNavOpen}
                            id="nav-toggle"
                            className={`nav-toggle${mobileNavOpen ? " nav-toggle--active" : ""}`}
                            type="button"
                            onClick={() => setMobileNavOpen(!mobileNavOpen)}
                          >
                            <span className="nav-toggle-bar" />
                            <span className="nav-toggle-bar" />
                            <span className="nav-toggle-bar" />
                          </button>
                          <nav
                            id="nav"
                            className={`nav-primary nav-menu${mobileNavOpen ? " nav-primary--open" : ""}`}
                            // Only force-override opacity/visibility/pointer-events when
                            // open. Leaving them unset when closed lets the underlying
                            // breakpoint CSS govern: hidden by default on mobile
                            // (`@media max-width:1024px`), visible by default on desktop
                            // (`@media min-width:1024.02px` never hides it). An inline
                            // style here always wins over @media, so setting it
                            // unconditionally previously hid the nav on desktop too.
                            style={
                              mobileNavOpen
                                ? { opacity: 1, visibility: "visible", pointerEvents: "auto" }
                                : undefined
                            }
                          >
                            <ul id="main-menu" className="keydesign-menu-items">
                              {NAV_LINKS.map((link) => (
                                <li key={link.href} className="menu-item keydesign-menu-item nav-item">
                                  <a
                                    href={link.href}
                                    className="nav-link"
                                    onClick={() => setMobileNavOpen(false)}
                                  >
                                    <span>{link.label}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="elementor-element elementor-element-4b7258e e-con-full e-flex e-con e-child">
                    <div className="elementor-element elementor-element-4fe63e6 elementor-hidden-tablet elementor-hidden-mobile elementor-widget elementor-widget-keydesign-button">
                      <div className="kd-widget-container">
                        <div className="kd-button-wrap">
                          <a className="kd-button elementor-button" role="button" data-text="Contact us" href="/contact">
                            <span className="kd-button__label">Contact us</span>
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="elementor-element elementor-element-b2418f2 elementor-hidden-tablet elementor-hidden-mobile elementor-widget elementor-widget-keydesign-button">
                      <div className="kd-widget-container">
                        <div className="kd-button-wrap">
                          <a
                            className="kd-button elementor-button"
                            role="button"
                            data-text="Get started"
                            href="#modal-33745"
                            onClick={(e) => {
                              e.preventDefault();
                              setPopupOpen(true);
                            }}
                          >
                            <span className="kd-button__label">Get started</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
