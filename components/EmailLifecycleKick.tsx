'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

const ELIGIBLE_STATUSES = new Set(['pending', 'approved']);

export default function EmailLifecycleKick() {
  useEffect(() => {
    let active = true;

    async function kick() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!active || !user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      if (!active || error || !profile || !ELIGIBLE_STATUSES.has(profile.status)) return;

      const key = `planes-email-kick:${user.id}:${profile.status}`;
      if (window.sessionStorage.getItem(key) === '1') return;
      window.sessionStorage.setItem(key, '1');

      const { error: kickError } = await supabase.functions.invoke('planes-email-worker', {
        body: { limit: 5 },
      });
      if (kickError && active) window.sessionStorage.removeItem(key);
    }

    void kick();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (active) void kick(); }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
