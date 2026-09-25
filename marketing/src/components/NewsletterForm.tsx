"use client";

import { FormEvent, useState } from "react";

/**
 * Markup mirrors the original Contact Form 7 "newsletter" form captured in
 * example.html. No backend was captured (SingleFile only saves rendered
 * HTML), so submission is stubbed locally instead of posting to wpcf7's
 * original admin-ajax endpoint, which no longer exists in this project.
 */
export function NewsletterForm({ instanceId }: { instanceId: string }) {
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitted");
  }

  return (
    <div className="kd-cf7">
      <div className="wpcf7 js" id={`wpcf7-${instanceId}`} lang="en-US" dir="ltr">
        <form
          onSubmit={handleSubmit}
          className="wpcf7-form init"
          aria-label="Newsletter signup form"
        >
          <div className="inline-form">
            <p>
              <span className="keydesign-label">
                <label htmlFor={`your-email-input-${instanceId}`}>Email</label>
                <span className="wpcf7-form-control-wrap" data-name="your-email">
                  <input
                    size={40}
                    maxLength={400}
                    className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email"
                    id={`your-email-input-${instanceId}`}
                    aria-required="true"
                    required
                    type="email"
                    name="your-email"
                  />
                </span>
              </span>
              <input
                className="wpcf7-form-control wpcf7-submit has-spinner"
                type="submit"
                value="Subscribe"
              />
            </p>
          </div>
          <div className="wpcf7-response-output" role="status" aria-live="polite">
            {status === "submitted" ? "Thanks for subscribing!" : null}
          </div>
        </form>
      </div>
    </div>
  );
}
