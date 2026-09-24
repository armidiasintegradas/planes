grant update (
  assistant_persona,
  assistant_voice_enabled,
  assistant_onboarding_completed_at,
  assistant_last_daily_greeting_at,
  updated_at
) on table public.profiles to authenticated;
