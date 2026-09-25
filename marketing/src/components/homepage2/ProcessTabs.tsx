"use client";

import { useState } from "react";

/**
 * Reimplementation of the "tj-process-list" widget, which used Bootstrap's
 * JS-driven pill/tab component (`data-bs-toggle="pill"`) — no JS was
 * captured, so this reproduces tab switching with React state, reusing
 * the original class names so the CSS still applies.
 *
 * Source-data gap: like the FAQ accordion, SiteGround Optimizer's
 * lazy-content stripping removed the per-step foreground image for every
 * step except the one active at capture time ("Business growth", step 4).
 * Steps 1-3 fall back to the shared background image only.
 */
const STEPS = [
  {
    icon: "tji-create",
    title: "Create your org",
    desc: "Sign up and your organization is seeded with project statuses, branding, and settings.",
    image: null as string | null,
  },
  {
    icon: "tji-build",
    title: "Add clients & projects",
    desc: "Invite clients, create projects, and set milestones and tasks.",
    image: null as string | null,
  },
  {
    icon: "tji-innovate",
    title: "Deliver & get sign-off",
    desc: "Share files and contracts through the client portal for review and approval.",
    image: null as string | null,
  },
  {
    icon: "tji-growth-2",
    title: "Invoice & get paid",
    desc: "Send invoices and get paid, with status tracked from draft to paid.",
    image: "/homepage2/images/03b3e4de27bf.webp",
  },
];

export function ProcessTabs() {
  const [active, setActive] = useState(3);

  return (
    <div className="atc-process-wrapper">
      <div className="d-none d-lg-flex flex-wrap flex-lg-nowrap align-items-start">
        <div aria-orientation="vertical" className="nav flex-column process-tab" role="tablist">
          {STEPS.map((step, i) => (
            <button
              key={step.title + i}
              aria-selected={active === i}
              className={`nav-link${active === i ? " active" : ""}`}
              role="tab"
              type="button"
              onClick={() => setActive(i)}
            >
              <span className="process-icon">
                <i aria-hidden="true" className={step.icon} />
              </span>
              <span className="process-content">
                <span className="title">{step.title}</span>
                <span className="desc">{step.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div
          className="tab-content process-tab-content"
          style={{ backgroundImage: "url(/homepage2/images/45518f41c3f3.webp)" }}
        >
          {STEPS.map((step, i) => (
            <div key={step.title + i} className={`tab-pane fade${active === i ? " active show" : ""}`}>
              {step.image ? (
                <div className="process-item">
                  <div className="process-img">
                    <img alt={step.title} src={step.image} />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
