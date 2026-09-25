"use client";

import { FormEvent, useState } from "react";

/**
 * Markup mirrors the original Contact Form 7 "get started" form captured in
 * example.html. No backend was captured, so submission is stubbed locally.
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitted");
  }

  return (
    <div className="kd-cf7">
      <div className="wpcf7 js" id="wpcf7-f10448-o3" lang="en-US" dir="ltr">
        <form onSubmit={handleSubmit} className="wpcf7-form init" aria-label="Contact form">
          <div className="keydesign-label">
            <p>
              <label htmlFor="your-name-input">Name</label>
              <span className="wpcf7-form-control-wrap" data-name="your-name">
                <input
                  size={40}
                  maxLength={400}
                  className="wpcf7-form-control wpcf7-text wpcf7-validates-as-required"
                  id="your-name-input"
                  aria-required="true"
                  required
                  type="text"
                  name="your-name"
                />
              </span>
            </p>
          </div>
          <div className="keydesign-label">
            <p>
              <label htmlFor="your-email-input-popup">Email address</label>
              <span className="wpcf7-form-control-wrap" data-name="your-email">
                <input
                  size={40}
                  maxLength={400}
                  className="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email"
                  id="your-email-input-popup"
                  aria-required="true"
                  required
                  type="email"
                  name="your-email"
                />
              </span>
            </p>
          </div>
          <div className="keydesign-label">
            <p>
              <label htmlFor="your-message-textarea">Message</label>
              <span className="wpcf7-form-control-wrap" data-name="your-message">
                <textarea
                  cols={40}
                  rows={10}
                  maxLength={2000}
                  className="wpcf7-form-control wpcf7-textarea"
                  id="your-message-textarea"
                  name="your-message"
                />
              </span>
            </p>
          </div>
          <p>
            <input
              className="wpcf7-form-control wpcf7-submit has-spinner"
              type="submit"
              value="Submit"
            />
          </p>
          <div className="wpcf7-response-output" role="status" aria-live="polite">
            {status === "submitted" ? "Thanks! We'll be in touch shortly." : null}
          </div>
        </form>
      </div>
    </div>
  );
}
