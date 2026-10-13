"use client";

import { createContext, useContext, type ReactNode } from "react";
import { STAFF_NAV, type NavSection } from "./data";

interface NavValue {
  navData: NavSection[];
  homeHref: string;
}

const NavContext = createContext<NavValue>({ navData: STAFF_NAV, homeHref: "/dashboard" });

export function NavProvider({ value, children }: { value: NavValue; children: ReactNode }) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  return useContext(NavContext);
}
