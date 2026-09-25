"use client";

import { useState } from "react";

/**
 * Reimplementation of the "tj-accordion" widget, which used Bootstrap's
 * JS-driven collapse component (`data-bs-toggle="collapse"`) — no JS was
 * captured, so this reproduces the open/close behavior with React state,
 * reusing the same class names (`accordion-item`, `collapse`, `show`, ...)
 * so the original CSS transition still applies.
 *
 * Source-data gap: SiteGround Optimizer's critical-CSS/lazy-content
 * stripping removed the answer text for every FAQ item except the one
 * that was open at capture time (item 0) — the `.collapse` bodies for the
 * other 4 were empty `<div>`s in example2-homepage2.html. Those are
 * marked as placeholders below rather than fabricated.
 */
const FAQ_ITEMS = [
  {
    question: "Is Freelancey free?",
    answer:
      "Yes. Freelancey is open source and free to self-host, licensed under ELv2. You run it on your own infrastructure with no subscription required.",
  },
  {
    question: "Do I need technical skills to set it up?",
    answer:
      "Some. Freelancey is a Next.js frontend and a NestJS backend that you deploy yourself, so comfort with running a small web app and a database helps.",
  },
  {
    question: "Is client data kept separate between clients?",
    answer:
      "Yes. Server-side access control keeps every client scoped to their own projects and files, so one client never sees another client's data.",
  },
  {
    question: "Can clients see my branding instead of Freelancey's?",
    answer:
      "Yes. White-labeling lets you set your own logo, colors, and a custom domain for the client portal and login pages.",
  },
  {
    question: "How do clients pay their invoices?",
    answer:
      "Invoices can be paid through Stripe Checkout, or marked paid manually if you're recording an offline payment.",
  },
];

export function AccordionFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="tj-faq tj-faq-atc" id="accordion-c40658b">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `faq-c40658b-${i}`;
        return (
          <div className={`accordion-item${isOpen ? " active" : ""}`} key={i}>
            <div className="accordion-inner">
              <button
                type="button"
                aria-expanded={isOpen}
                className={`accordion-title${isOpen ? "" : " collapsed"}`}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
              >
                {item.question}
              </button>
              <div className={`collapse${isOpen ? " show" : ""}`} id={panelId}>
                <div className="accordion-body accordion-content">
                  {item.answer ?? (
                    <em>
                      Answer content wasn&apos;t present in the page capture
                      for this question.
                    </em>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-expanded={isOpen}
              className="accordion-toggler"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
            >
              <i className="tji-plus" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
