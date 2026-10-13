"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import {
  applyPrefPatch,
  extractOEmbedCandidates,
  getEmbeds,
  nextSize,
  type EmbedInfo,
  type PreviewPref,
  type PreviewPrefs,
  type PreviewSize,
} from "@/lib/embeds";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const MAX_EMBEDS = 3;

const PROVIDER_LABELS: Record<EmbedInfo["provider"], string> = {
  youtube: "YouTube",
  loom: "Loom",
  figma: "Figma",
  "google-docs": "Google Docs",
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Shell({
  label,
  size,
  onToggleSize,
  onHide,
  children,
  footer,
}: {
  label: string;
  size: PreviewSize;
  onToggleSize: () => void;
  onHide: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mt-3 max-w-xl overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-card-border bg-background-gray-primary px-3.5 py-2">
        <span className="truncate text-xs font-medium text-text-secondary">{label}</span>
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onPress={onToggleSize}>
            {size === "full" ? "Collapse" : "Expand"}
          </Button>
          <Button size="xs" variant="ghost" onPress={onHide}>
            Hide
          </Button>
        </div>
      </div>
      {children}
      {footer}
    </div>
  );
}

function EmbedPreview({ embed, size, onToggleSize, onHide }: { embed: EmbedInfo; size: PreviewSize; onToggleSize: () => void; onHide: () => void }) {
  const label = PROVIDER_LABELS[embed.provider];
  return (
    <Shell label={label} size={size} onToggleSize={onToggleSize} onHide={onHide}>
      {size === "full" && (
        <div className="relative aspect-video w-full">
          <iframe
            src={embed.embedUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={`${label} embed`}
          />
        </div>
      )}
    </Shell>
  );
}

interface OEmbedResult {
  html: string;
  width?: number;
  height?: number;
  providerName: string;
  title?: string;
}

function OEmbedPreview({
  url,
  size,
  onToggleSize,
  onHide,
  onFail,
}: {
  url: string;
  size: PreviewSize;
  onToggleSize: () => void;
  onHide: () => void;
  onFail: () => void;
}) {
  const [result, setResult] = useState<OEmbedResult | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setResult(undefined);
    fetch(`${API_URL}/api/embeds/resolve?url=${encodeURIComponent(url)}`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<OEmbedResult>) : null))
      .catch(() => null)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        if (!res) onFail();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (result === null) return null;
  if (result === undefined) {
    return (
      <Shell label={hostnameOf(url)} size={size} onToggleSize={onToggleSize} onHide={onHide}>
        <div className="p-3.5">
          <Skeleton className="h-3 w-1/2" />
        </div>
      </Shell>
    );
  }
  return (
    <Shell label={result.providerName} size={size} onToggleSize={onToggleSize} onHide={onHide}>
      {size === "full" && (
        <div
          className="[&_iframe]:block [&_iframe]:w-full [&_iframe]:max-w-full"
          // HTML is sanitized server-side to an iframe-only allowlist.
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      )}
    </Shell>
  );
}

interface UnfurlCard {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

function UnfurlPreview({ url, size, onToggleSize, onHide }: { url: string; size: PreviewSize; onToggleSize: () => void; onHide: () => void }) {
  const [card, setCard] = useState<UnfurlCard | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setCard(undefined);
    fetch(`${API_URL}/api/embeds/unfurl?url=${encodeURIComponent(url)}`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<UnfurlCard>) : null))
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setCard(res);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const host = hostnameOf(url);
  if (card === null) return null;
  if (card === undefined) {
    return (
      <Shell label={host} size={size} onToggleSize={onToggleSize} onHide={onHide}>
        <div className="p-3.5">
          <Skeleton className="mb-2 h-3 w-1/2" />
          <Skeleton className="h-2 w-full" />
        </div>
      </Shell>
    );
  }
  return (
    <Shell label={card.siteName || host} size={size} onToggleSize={onToggleSize} onHide={onHide}>
      {size === "full" && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block p-3.5 hover:bg-background-gray-primary">
          {card.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={card.image} alt="" className="mb-3 max-h-48 w-full rounded-lg object-cover" />
          )}
          <p className="text-sm font-medium text-text-primary">{card.title || url}</p>
          {card.description && <p className="mt-1 line-clamp-3 text-sm text-text-secondary">{card.description}</p>}
        </a>
      )}
    </Shell>
  );
}

/** Link previews for an update body: known providers, oEmbed providers, and a generic card. */
export function Embeds({ text, prefs = {}, onPrefsChange }: { text: string; prefs?: PreviewPrefs; onPrefsChange?: (next: PreviewPrefs) => void }) {
  const regexEmbeds = useMemo(() => getEmbeds(text), [text]);
  const nonRegexUrls = useMemo(() => {
    if (regexEmbeds.length >= MAX_EMBEDS) return [];
    return extractOEmbedCandidates(text).slice(0, MAX_EMBEDS - regexEmbeds.length);
  }, [text, regexEmbeds.length]);
  const [oembedFailed, setOembedFailed] = useState<Record<string, boolean>>({});

  const mutate = (url: string, patch: PreviewPref) => onPrefsChange?.(applyPrefPatch(prefs, url, patch));

  if (regexEmbeds.length === 0 && nonRegexUrls.length === 0) return null;

  return (
    <>
      {regexEmbeds.map((embed) => {
        const pref = prefs[embed.originalUrl] || {};
        if (pref.hidden) return null;
        const size: PreviewSize = pref.size ?? "full";
        return (
          <EmbedPreview
            key={embed.embedUrl}
            embed={embed}
            size={size}
            onToggleSize={() => mutate(embed.originalUrl, { size: nextSize(size) })}
            onHide={() => mutate(embed.originalUrl, { hidden: true })}
          />
        );
      })}
      {nonRegexUrls.map((url) => {
        const pref = prefs[url] || {};
        if (pref.hidden) return null;
        const size: PreviewSize = pref.size ?? "full";
        const common = { url, size, onToggleSize: () => mutate(url, { size: nextSize(size) }), onHide: () => mutate(url, { hidden: true }) };
        return oembedFailed[url] ? (
          <UnfurlPreview key={url} {...common} />
        ) : (
          <OEmbedPreview key={url} {...common} onFail={() => setOembedFailed((p) => ({ ...p, [url]: true }))} />
        );
      })}
    </>
  );
}
