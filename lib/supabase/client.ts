import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfgcbxppsbwmxwsuajou.supabase.co';
const supabasePublishableKey = 'sb_publishable_tFvlFVbpOPYPPA72qcMWQg_IZO4V4xS';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export type PlanesUserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PlanesUserRole =
  | 'super_admin'
  | 'admin'
  | 'gestor'
  | 'engenharia'
  | 'campo'
  | 'financeiro'
  | 'cliente';

export type PlanesProfile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  status: PlanesUserStatus;
  role: PlanesUserRole | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};
