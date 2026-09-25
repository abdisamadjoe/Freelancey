"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type UIState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  popupOpen: boolean;
  setPopupOpen: (open: boolean) => void;
};

const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <UIStateContext.Provider
      value={{ mobileNavOpen, setMobileNavOpen, popupOpen, setPopupOpen }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within a UIStateProvider");
  }
  return ctx;
}
