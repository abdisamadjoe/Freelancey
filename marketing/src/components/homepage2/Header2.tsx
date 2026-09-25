"use client";

import { useUIState2 } from "./UIState2Provider";

const NAV_ITEMS: { label: string; href: string; children?: { label: string; href: string }[] }[] = [
  { label: "Home", href: "/homepage2" },
  { label: "GitHub", href: "https://github.com/GroundworkTechnologies/Freelancey" },
  {
    label: "Product",
    href: "#",
    children: [
      { label: "Documentation", href: "https://github.com/GroundworkTechnologies/Freelancey#readme" },
      { label: "Roadmap", href: "https://github.com/GroundworkTechnologies/Freelancey/blob/main/docs/WORKPLAN.md" },
      { label: "License", href: "https://github.com/GroundworkTechnologies/Freelancey/blob/main/LICENSE" },
      { label: "Deployment guide", href: "https://github.com/GroundworkTechnologies/Freelancey/blob/main/docs/Everything-You-Need-To-Know.md" },
      { label: "Report an issue", href: "https://github.com/GroundworkTechnologies/Freelancey/issues" },
    ],
  },
  { label: "Contact", href: "https://github.com/GroundworkTechnologies/Freelancey/issues" },
];

/**
 * Markup mirrors the original header (elementor-3952), with two
 * deliberate simplifications:
 * - The "Home" nav item originally opened a rich mega-menu showcasing
 *   OTHER demo homepages of this theme (with thumbnail images) — dropped
 *   in favor of a plain link, since those demos aren't part of this page.
 * - Only the primary (non-duplicate) `<header>` is rendered; the original
 *   had a second, initially-hidden "sticky-up" clone meant to be swapped
 *   in by JS on scroll, which wasn't captured.
 *
 * Desktop dropdowns ("Pages", "Blog") work via pure CSS `:hover`
 * (`.mainmenu ul>li:hover>.sub-menu` already exists in the extracted
 * CSS) — no JS needed there. The mobile off-canvas panel below is a new
 * reimplementation: the original's mobile nav is JS-driven and wasn't
 * captured, so this is a best-effort equivalent using the same nav data.
 */
export function Header2() {
  const { mobileNavOpen, setMobileNavOpen, openMobileSubmenu, toggleMobileSubmenu } = useUIState2();

  return (
    <>
      <header className="header-area header-4 header-absolute">
        <div className="header-bottom">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="header-wrapper">
                  <div className="site_logo">
                    <a className="logo" href="/homepage2">
                      <img
                        width={142}
                        height={32}
                        src="/logo/freelancey.svg"
                        className="attachment-full size-full"
                        alt="Freelancey"
                      />
                    </a>
                  </div>
                  <div className="menu-area d-none d-lg-inline-flex align-items-center">
                    <nav className="mainmenu" style={{ display: "block" }}>
                      <div className="menu-primary-menu-container">
                        <ul className="menu">
                          {NAV_ITEMS.map((item) => (
                            <li
                              key={item.label}
                              className={item.children ? "menu-item has-dropdown" : "menu-item"}
                            >
                              <a href={item.href} aria-haspopup={item.children ? true : undefined}>
                                {item.label}
                              </a>
                              {item.children ? (
                                <ul className="sub-menu menu-depth-1">
                                  {item.children.map((child) => (
                                    <li className="menu-item" key={child.href}>
                                      <a href={child.href}>{child.label}</a>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </nav>
                  </div>
                  <div className="header-right-item d-none d-lg-inline-flex">
                    <a className="tj-login-btn tj-el-btn-2" href="https://freelancey.groundwork.co.ke/login">
                      Login
                    </a>
                    <div className="header-button d-inline-flex">
                      <a className="tj-btn-primary tj-el-btn tj-btn-primary-sm d-xl-inline-flex d-none" href="https://freelancey.groundwork.co.ke/signup">
                        <span className="btn-text">
                          <span>Start for free</span>
                        </span>
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={mobileNavOpen}
                    className={`menu_btn mobile_menu_bar d-lg-none${mobileNavOpen ? " active" : ""}`}
                    onClick={() => setMobileNavOpen(!mobileNavOpen)}
                  >
                    <span className="menu-btn-bar" />
                    <span className="menu-btn-bar" />
                    <span className="menu-btn-bar" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className="body-overlay"
        style={{
          opacity: mobileNavOpen ? 1 : 0,
          visibility: mobileNavOpen ? "visible" : "hidden",
        }}
        onClick={() => setMobileNavOpen(false)}
      />

      <nav
        className="tj-mobile-menu-panel"
        data-open={mobileNavOpen}
        style={{
          transform: mobileNavOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="tj-mobile-menu-panel__close"
          onClick={() => setMobileNavOpen(false)}
        >
          ×
        </button>
        <ul className="menu">
          {NAV_ITEMS.map((item) => (
            <li className="menu-item" key={item.label}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    className="tj-mobile-menu-panel__submenu-toggle"
                    aria-expanded={openMobileSubmenu === item.label}
                    onClick={() => toggleMobileSubmenu(item.label)}
                  >
                    {item.label}
                    <span aria-hidden="true">{openMobileSubmenu === item.label ? "−" : "+"}</span>
                  </button>
                  {openMobileSubmenu === item.label ? (
                    <ul className="sub-menu menu-depth-1">
                      {item.children.map((child) => (
                        <li className="menu-item" key={child.href}>
                          <a href={child.href} onClick={() => setMobileNavOpen(false)}>
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <a href={item.href} onClick={() => setMobileNavOpen(false)}>
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
