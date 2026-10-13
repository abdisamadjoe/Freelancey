import { PreviewBanner } from "@/components/app/preview-banner";
import { PreviewModeProvider } from "@/lib/preview-mode";
import { Suspense, type ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PreviewModeProvider>
        <PreviewBanner />
        {children}
      </PreviewModeProvider>
    </Suspense>
  );
}
