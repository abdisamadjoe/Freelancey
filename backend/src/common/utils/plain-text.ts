import sanitizeHtml from "sanitize-html";

/**
 * Plain text only: public input ends up in emails, notifications and the UI.
 * "<" and ">" stay escaped on purpose so stored values can never be mistaken for markup.
 */
export function plainText(value: string | undefined | null, max: number): string | undefined {
  if (!value) return undefined;
  const text = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, "&").trim();
  return text ? text.slice(0, max) : undefined;
}
