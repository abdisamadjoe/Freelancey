const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
const URL_TEST = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/;

/** Turns URLs in plain text into links. */
export function linkify(text: string) {
  return text.split(URL_REGEX).map((part, i) => {
    if (URL_TEST.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="break-all text-neutral-brand-color underline">
          {part}
        </a>
      );
    }
    return part;
  });
}
