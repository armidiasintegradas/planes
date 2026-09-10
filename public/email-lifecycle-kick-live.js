import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = 'https://xfgcbxppsbwmxwsuajou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tFvlFVbpOPYPPA72qcMWQg_IZO4V4xS';
const ELIGIBLE_STATUSES = new Set(['pending', 'approved']);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

async function kick() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return false;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single();
  if (error || !profile || !ELIGIBLE_STATUSES.has(profile.status)) return false;

  const key = `planes-email-kick:${user.id}:${profile.status}`;
  if (sessionStorage.getItem(key) === '1') return true;
  sessionStorage.setItem(key, '1');

  const { error: kickError } = await supabase.functions.invoke('planes-email-worker', {
    body: { limit: 5 },
  });
  if (kickError) sessionStorage.removeItem(key);
  return !kickError;
}

void kick();
supabase.auth.onAuthStateChange(() => {
  window.setTimeout(() => void kick(), 0);
});

// The auth adapter owns OAuth callback parsing. Retry briefly so this invisible
// helper also catches the newly-created session after a Google redirect.
for (const delay of [500, 1200, 2200]) {
  window.setTimeout(() => void kick(), delay);
}
