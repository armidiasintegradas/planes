// Retained as a compatibility endpoint. The Planes Intelligence no longer
// generates assistant speech. Do not call the OpenAI audio synthesis API.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  return new Response(JSON.stringify({ error: "assistant_audio_disabled", message: "Use a resposta textual do Planes Intelligence." }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
});
