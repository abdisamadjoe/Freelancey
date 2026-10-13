"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface Session {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  organization: {
    id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    customDomain: string | null;
    setupCompleted: boolean;
  };
  member: { id: string; role: string };
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the app shell");
  return session;
}

export function useIsOwner(): boolean {
  return useSession().member.role === "owner";
}
