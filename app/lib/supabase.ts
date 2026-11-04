import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://svarsetejqotluqikbtm.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_zBw9qTpBfW0RrcAMrWU8ng_VzUFwbUy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);