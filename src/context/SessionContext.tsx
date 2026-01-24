import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "../lib/supabase";

type SessionContextValue = {
  session: Session | null;
  authLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setAuthLoading(false);
      return;
    }
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) {
          return;
        }
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) {
          return;
        }
        setSession(nextSession);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      authLoading
    }),
    [authLoading, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
};
