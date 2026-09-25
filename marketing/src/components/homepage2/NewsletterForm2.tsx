"use client";

import { FormEvent, useState } from "react";

/**
 * Markup mirrors the original Contact Form 7 hero subscribe form
 * (wpcf7-f3976). No backend was captured, so submission is stubbed
 * locally, same approach as the Sierra page's forms.
 */
export function NewsletterForm2() {
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitted");
  }

  return (
    <form onSubmit={handleSubmit} className="wpcf7-form init" aria-label="Newsletter signup form">
      <span className="mail-icon">
        <i className="tji-envelop-2" />
      </span>
      <span className="wpcf7-form-control-wrap" data-name="email">
        <input
          size={40}
          maxLength={400}
          className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email"
          aria-required="true"
          required
          placeholder="Enter email..."
          type="email"
          name="email"
        />
      </span>
      <button className="tj-btn-primary tj-btn-primary-atc" type="submit">
        <span className="btn-text">
          <span>Be first to join</span>
        </span>
        <span className="btn-icon">
          <i className="tji-arrow-right" />
        </span>
      </button>
      <div className="wpcf7-response-output" role="status" aria-live="polite">
        {status === "submitted" ? "Thanks for subscribing!" : null}
      </div>
    </form>
  );
}
