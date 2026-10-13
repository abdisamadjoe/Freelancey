"use client";

import { ErrorNote, Loading } from "@/components/app/kit";
import { apiFetchBlob } from "@/lib/api";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Dims = { width: number; height: number };

/** Renders a page only when it enters the viewport (or is within 1 page of it). */
function LazyPage({
  pageNumber,
  pageWidth,
  numPages,
  overlay,
}: {
  pageNumber: number;
  pageWidth: number;
  numPages: number;
  overlay?: (pageNumber: number, dims: Dims) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 3);
  const [dims, setDims] = useState<Dims | null>(null);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="relative" style={!visible ? { minHeight: 800 } : undefined}>
      {visible ? (
        <>
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            onLoadSuccess={(page) => setDims({ width: page.width, height: page.height })}
            renderAnnotationLayer={false}
          />
          {overlay && dims && dims.width > 0 && (
            <div className="absolute inset-0 z-10">
              {overlay(pageNumber, { width: pageWidth, height: (pageWidth / dims.width) * dims.height })}
            </div>
          )}
          {numPages > 1 && (
            <span className="absolute right-3 bottom-2 rounded-full bg-badge-neutral-background px-2 py-0.5 text-xs text-badge-neutral-text shadow-xs">
              {pageNumber} / {numPages}
            </span>
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-text-tertiary">Page {pageNumber}</div>
      )}
    </div>
  );
}

/**
 * PDF pages with an optional per-page overlay (used to place and fill signature fields).
 * `path` is an API path (fetched with the bearer token) unless `isPublic` is set.
 */
export function PdfViewer({
  path,
  isPublic,
  overlay,
  className,
}: {
  path: string;
  isPublic?: boolean;
  overlay?: (pageNumber: number, dims: Dims) => ReactNode;
  className?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let blob: Blob;
        if (isPublic) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api${path}`);
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          blob = await res.blob();
        } else {
          blob = (await apiFetchBlob(path)).blob;
        }
        created = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(created);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path, isPublic]);

  const onLoad = useCallback(({ numPages: n }: { numPages: number }) => setNumPages(n), []);
  const pageWidth = Math.min(containerWidth - 32, 900);

  if (loading) return <Loading label="Loading PDF..." />;
  if (error) return <ErrorNote error={error} />;

  return (
    <div ref={containerRef} className={className}>
      <Document file={objectUrl} onLoadSuccess={onLoad} className="flex flex-col items-center gap-4">
        {Array.from({ length: numPages }, (_, i) => (
          <LazyPage key={i + 1} pageNumber={i + 1} pageWidth={pageWidth} numPages={numPages} overlay={overlay} />
        ))}
      </Document>
    </div>
  );
}
