// lib/supabase.ts
// Clientes do Supabase. O cliente do navegador usa só a anon key (pública e segura).
// Operações sensíveis (sync da API, cálculo de pontuação) usam a service role key
// SOMENTE em API routes / server — nunca exponha a service role no navegador.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Use apenas no servidor (API routes).
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
