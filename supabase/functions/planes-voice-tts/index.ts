import { createClient } from "npm:@supabase/supabase-js@2.105.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !anonKey || !apiKey) return json({ error: "voice_configuration_missing" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return json({ error: "invalid_session" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const text = String(body?.text || "").trim().slice(0, 4096);
  if (!text) return json({ error: "missing_text" }, 400);

  const persona = body?.persona === "brita" ? "brita" : "castanha";
  const voice = persona === "brita" ? "nova" : "onyx";
  const speed = persona === "brita" ? 1.02 : 0.94;
  const instructions = persona === "brita"
    ? "Fale em português brasileiro com voz feminina claramente perceptível, contemporânea, calorosa e espontânea. Soe como uma colega conversando naturalmente, com pequenas variações de ritmo, micro-pausas e entonação viva. Não leia como locutora, URA, GPS ou audiobook."
    : "Fale em português brasileiro com voz masculina claramente perceptível, adulta, mais grave, contemporânea, calorosa e espontânea. Soe como um colega experiente conversando naturalmente, com pequenas variações de ritmo, pausas humanas e entonação segura. Não leia como locutor, URA, GPS ou audiobook.";

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      instructions,
      response_format: "mp3",
      speed
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Planes TTS error", response.status, detail.slice(0, 500));
    return json({ error: "tts_failed", status: response.status, detail: detail.slice(0, 200) }, 502);
  }

  return new Response(await response.arrayBuffer(), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store"
    }
  });
});
