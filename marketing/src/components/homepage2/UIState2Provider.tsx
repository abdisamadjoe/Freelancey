"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type UIState2 = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  openMobileSubmenu: string | null;
  toggleMobileSubmenu: (id: string) => void;
  videoUrl: string | null;
  openVideo: (url: string) => void;
  closeVideo: () => void;
};

const Ctx = createContext<UIState2 | null>(null);

export function UIState2Provider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  return (
    <Ctx.Provider
      value={{
        mobileNavOpen,
        setMobileNavOpen,
        openMobileSubmenu,
        toggleMobileSubmenu: (id) =>
          setOpenMobileSubmenu((cur) => (cur === id ? null : id)),
        videoUrl,
        openVideo: (url) => setVideoUrl(url),
        closeVideo: () => setVideoUrl(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUIState2() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUIState2 must be used within UIState2Provider");
  return ctx;
}
