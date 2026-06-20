import { supabase } from "@/lib/supabase";

type ActionResult = { error: string | null };

export async function signIn(email: string, password: string): Promise<ActionResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

const AUTH_REDIRECT = "puntualmed://auth-callback";

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: AUTH_REDIRECT },
  });
  if (error) return { error: error.message, needsConfirmation: false };
  return { error: null, needsConfirmation: !data.session };
}
