import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "Planes OS <acesso@planesengenharia.com.br>";
const APP_URL = Deno.env.get("APP_URL") || "https://armidiasintegradas.github.io/planes/";

interface EmailPayload {
  type: "APPROVAL" | "REJECTION" | "NEW_REQUEST";
  to: string;
  name: string;
  roleName?: string;
  projects?: string[];
  reason?: string;
  provider?: string;
}

function corsHeaders(origin: string | null) {
  const allowed = origin === "https://armidiasintegradas.github.io" ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080";
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "https://armidiasintegradas.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char] || char);
}

serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  if (!RESEND_API_KEY) {
    return Response.json(
      { error: "Transactional email is not configured." },
      { status: 503, headers },
    );
  }

  try {
    const payload = await req.json() as EmailPayload;
    if (!payload.to || !payload.type || !payload.name) {
      return Response.json({ error: "Missing required fields." }, { status: 400, headers });
    }

    const name = escapeHtml(payload.name);
    const to = payload.to.trim();
    let subject = "";
    let body = "";

    if (payload.type === "APPROVAL") {
      subject = "Seu acesso ao Planes OS foi liberado";
      const role = escapeHtml(payload.roleName || "Perfil autorizado");
      const projects = (payload.projects || []).map(escapeHtml).join(", ") || "Escopo definido pela administração";
      body = `<h2>Olá, ${name}.</h2><p>Seu acesso ao <strong>Planes OS</strong> foi aprovado.</p><p><strong>Perfil:</strong> ${role}<br><strong>Escopo:</strong> ${projects}</p><p><a href="${APP_URL}">Acessar Planes OS</a></p>`;
    } else if (payload.type === "REJECTION") {
      subject = "Atualização sobre sua solicitação de acesso — Planes OS";
      const reason = escapeHtml(payload.reason || "Solicitação não autorizada pela administração.");
      body = `<h2>Olá, ${name}.</h2><p>Sua solicitação de acesso ao Planes OS não foi autorizada no momento.</p><p><strong>Motivo:</strong> ${reason}</p>`;
    } else {
      subject = "Nova solicitação de acesso — Planes OS";
      const provider = escapeHtml(payload.provider || "E-mail");
      body = `<h2>Nova solicitação de acesso</h2><p><strong>Nome:</strong> ${name}<br><strong>E-mail:</strong> ${escapeHtml(to)}<br><strong>Método:</strong> ${provider}</p><p><a href="${APP_URL}admin/access">Revisar no Planes OS</a></p>`;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6f9;color:#1e293b;padding:24px"><main style="max-width:560px;margin:auto;background:white;padding:28px;border-radius:16px">${body}</main></body></html>`,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend delivery failed", resendResponse.status);
      return Response.json({ error: "Email delivery failed." }, { status: 502, headers });
    }

    return Response.json({ success: true, id: resendData.id }, { status: 200, headers });
  } catch (error) {
    console.error("send-iam-email", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Internal server error." }, { status: 500, headers });
  }
});
