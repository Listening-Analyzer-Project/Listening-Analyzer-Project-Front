// supabase.ts

import { createClient } from "@supabase/supabase-js";

// Client Supabase pour les opérations côté client et serveur
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
