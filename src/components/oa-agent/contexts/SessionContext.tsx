"use client";

import { createContext, useContext, type ReactNode } from "react";

const SessionContext = createContext<string | null>(null);

interface SessionProviderProps {
  sessionId: string;
  children: ReactNode;
}

export function SessionProvider({ sessionId, children }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={sessionId}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionId(): string | null {
  return useContext(SessionContext);
}
