import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Derive the session/user types from the shared client (the mobile package has no
// direct @supabase/supabase-js dependency — it consumes the client via @swap/api).
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
type User = NonNullable<Session>["user"];

export type AuthStatus = "loading" | "authed" | "guest";
export type AuthState = { session: Session; user: User | null; status: AuthStatus };

/**
 * One source of truth for the signed-in session — the native counterpart of the
 * web `getCurrentUser` / auth context. A single module-level `getSession()` +
 * `onAuthStateChange` subscription feeds every consumer, so screens react to
 * sign-in/out consistently (fixes the stale home "Add" CTA that never subscribed)
 * and route guards can read a `status` that distinguishes "loading" from "guest".
 */
let state: AuthState = { session: null, user: null, status: "loading" };
const listeners = new Set<(s: AuthState) => void>();
let initialized = false;

function emit(next: AuthState) {
  state = next;
  listeners.forEach((l) => l(state));
}

function ensureInit() {
  if (initialized) return;
  initialized = true;
  supabase.auth
    .getSession()
    .then(({ data }) => emit({ session: data.session, user: data.session?.user ?? null, status: data.session ? "authed" : "guest" }))
    .catch(() => emit({ session: null, user: null, status: "guest" }));
  supabase.auth.onAuthStateChange((_event, session) =>
    emit({ session, user: session?.user ?? null, status: session ? "authed" : "guest" }),
  );
}

export function useAuth(): AuthState {
  ensureInit();
  const [snapshot, setSnapshot] = useState<AuthState>(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state); // sync any change between render and effect
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);
  return snapshot;
}
