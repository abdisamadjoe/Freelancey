
const MAX_EMBEDS = 3;

const YT_RE = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]+)/g;
const LOOM_RE = /https?:\/\/(?:www\.)?loom\.com\/share\/([\w-]+)/g;
const FIGMA_RE = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([\w-]+[^\s]*)/g;
const GDOCS_RE = /https?:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/g;

const URL_RE = /https?:\/\/[^\s<>"']+/g;

export type EmbedProvider = "youtube" | "loom" | "figma" | "google-docs";

export interface EmbedInfo {
  originalUrl: string;
  embedUrl: string;
  provider: EmbedProvider;
}

export type PreviewSize = "compact" | "full";

export interface PreviewPref {
  size?: PreviewSize;
  hidden?: boolean;
}

export type PreviewPrefs = Record<string, PreviewPref>;

/**
 * Merge a pref patch for `url` into `prefs`. Pure; returns a new object so
 * React can detect the change. Extracted for unit-testability.
 */
export function applyPrefPatch(
  prefs: PreviewPrefs,
  url: string,
  patch: PreviewPref,
): PreviewPrefs {
  return { ...prefs, [url]: { ...(prefs[url] || {}), ...patch } };
}

/**
 * Toggle between compact and full preview sizes.
 */
export function nextSize(current: PreviewSize): PreviewSize {
  return current === "full" ? "compact" : "full";
}

const PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  loom: "Loom",
  figma: "Figma",
  "google-docs": "Google Docs",
};

// ---------------------------------------------------------------------------
// Regex fast-path detection (zero network).
// ---------------------------------------------------------------------------

export function getEmbeds(text: string): EmbedInfo[] {
  const found: EmbedInfo[] = [];
  const seen = new Set<string>();

  const push = (originalUrl: string, embedUrl: string, provider: EmbedProvider) => {
    if (!seen.has(embedUrl)) {
      seen.add(embedUrl);
      found.push({ originalUrl, embedUrl, provider });
    }
  };

  YT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = YT_RE.exec(text)) !== null) {
    push(m[0], `https://www.youtube.com/embed/${m[1]}`, "youtube");
  }

  LOOM_RE.lastIndex = 0;
  while ((m = LOOM_RE.exec(text)) !== null) {
    push(m[0], `https://www.loom.com/embed/${m[1]}`, "loom");
  }

  FIGMA_RE.lastIndex = 0;
  while ((m = FIGMA_RE.exec(text)) !== null) {
    push(m[0], `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(m[0])}`, "figma");
  }

  GDOCS_RE.lastIndex = 0;
  while ((m = GDOCS_RE.exec(text)) !== null) {
    push(m[0], `https://docs.google.com/${m[1]}/d/${m[2]}/preview`, "google-docs");
  }

  return found.slice(0, MAX_EMBEDS);
}

const REGEX_PROVIDER_HOSTS = [
  "youtube.com",
  "youtu.be",
  "loom.com",
  "figma.com",
  "docs.google.com",
];

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isRegexProviderHost(host: string): boolean {
  return REGEX_PROVIDER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function extractOEmbedCandidates(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, "");
    if (seen.has(url)) continue;
    const host = hostnameOf(url);
    if (!host || isRegexProviderHost(host)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_EMBEDS) break;
  }
  return out;
}

