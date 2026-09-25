"use client";

import { useUIState } from "./UIStateProvider";
import { ContactForm } from "./ContactForm";

/**
 * Re-implementation of the "keydesign-popup-offcanvas" panel (data-popup-id
 * 33745) triggered by the header's "Get started" button (originally
 * `href="#modal-33745"`, handled by the theme's popup JS, not captured).
 * The original markup had no visible close button in the captured DOM
 * (the popup plugin likely injected one at runtime) — a close button here
 * is an added, best-effort piece of UX so the panel is actually usable.
 */
export function ContactPopup() {
  const { popupOpen, setPopupOpen } = useUIState();

  return (
    <>
      <div
        className="keydesign-popup-overlay"
        data-open={popupOpen}
        style={{
          opacity: popupOpen ? 1 : 0,
          visibility: popupOpen ? "visible" : "hidden",
        }}
        onClick={() => setPopupOpen(false)}
      />
      <div
        className="keydesign-popup-offcanvas keydesign-popup-offcanvas-right"
        data-popup-id="33745"
        data-popup-type="off-canvas"
        style={{
          right: popupOpen ? "0" : "calc(-1 * var(--popup-width, 400px))",
          visibility: popupOpen ? "visible" : "hidden",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setPopupOpen(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1,
            border: "none",
            background: "none",
            fontSize: 24,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <div className="keydesign-popup-content">
          <div className="elementor elementor-33745">
            <div className="elementor-element elementor-element-353821d e-flex e-con-boxed e-con e-parent">
              <div className="e-con-inner">
                <div className="elementor-element elementor-element-2ebf27e elementor-widget elementor-widget-keydesign-heading">
                  <div className="kd-widget-container">
                    <div className="kd-heading">
                      <h4 className="kd-heading__title">Let&apos;s get started</h4>
                      <div className="kd-heading__desc">
                        <p>
                          Fill in the form below and we&apos;ll get back to
                          you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="elementor-element elementor-element-9bf5271 e-flex e-con-boxed e-con e-parent">
              <div className="e-con-inner">
                <div className="elementor-element elementor-element-fbb7097 elementor-widget elementor-widget-keydesign-contact-form7">
                  <div className="kd-widget-container">
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
