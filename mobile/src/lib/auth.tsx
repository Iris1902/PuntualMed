import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Route = "/login" | "/home" | null;

// Decision pura de redireccion segun sesion y grupo de ruta actual.
export function nextRoute(opts: {
  hasSession: boolean;
  loading: boolean;
  inAuth: boolean;
  inApp: boolean;
}): Route {
  if (opts.loading) return null;
  if (!opts.hasSession && !opts.inAuth) return "/login";
  if (opts.hasSession && !opts.inApp) return "/home";
  return null;
}

type AuthValue = { session: Session | null; loading: boolean };
const AuthContext = createContext<AuthValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    }).finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
