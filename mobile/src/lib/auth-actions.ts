import { supabase } from "@/lib/supabase";

type ActionResult = { error: string | null };

export async function signIn(email: string, password: string): Promise<ActionResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
