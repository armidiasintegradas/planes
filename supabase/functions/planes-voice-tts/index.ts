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
  // Mantém a identidade vocal igual à sessão Realtime.
  // Marin e Cedar são as vozes OpenAI recomendadas para maior qualidade no Speech API.
  const voice = persona === "brita" ? "marin" : "cedar";
  const instructions = persona === "brita"
    ? "Fale em português brasileiro contemporâneo como Brita, uma colega inteligente conversando ao lado do usuário. Voz feminina acolhedora, espontânea e natural. Use cadência humana, micro-pausas entre ideias, variação sutil de ritmo e ênfase contextual. Não leia o texto como locutora, anúncio, URA, GPS ou audiobook. Evite cadência perfeitamente uniforme. Números, datas, percentuais e siglas devem soar naturais em português. Respostas curtas devem soar como fala espontânea, não como uma gravação."
    : "Fale em português brasileiro contemporâneo como Castanha, um colega experiente conversando ao lado do usuário. Voz masculina próxima, tranquila, segura e espontânea. Use cadência humana, pausas curtas entre ideias, variação sutil de ritmo e ênfase contextual. Não leia o texto como locutor, anúncio, URA, GPS ou audiobook. Evite cadência perfeitamente uniforme. Números, datas, percentuais e siglas devem soar naturais em português. Respostas curtas devem soar como fala espontânea, não como uma gravação.";

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
      response_format: "wav"
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
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store"
    }
  });
});
