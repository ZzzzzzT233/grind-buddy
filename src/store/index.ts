import type { Backend } from "./backend";
import { LocalBackend } from "./localBackend";
import { SupabaseBackend } from "./supabaseBackend";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backend: Backend = url && key ? new SupabaseBackend(url, key) : new LocalBackend();
