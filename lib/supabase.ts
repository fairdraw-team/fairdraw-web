import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://svarsetejqotluqikbtm.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_zBw9qTpBfW0RrcAMrWU8ng_VzUFwbUy';

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);