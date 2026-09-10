import { createClient } from "npm:@supabase/supabase-js@2.105.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PLANES_EMAIL_FROM = Deno.env.get("PLANES_EMAIL_FROM");
const PLANES_EMAIL_REPLY_TO = Deno.env.get("PLANES_EMAIL_REPLY_TO");

const APP_URL = "https://armidiasintegradas.github.io/planes/";
const LOGO_URL = "https://armidiasintegradas.github.io/planes/brand/planes-logo.png";

type QueueItem = {
  id: string;
  to_email: string;
  subject: string;
  template_key:
    | "access_request_received"
    | "admin_access_request"
    | "access_approved"
    | "access_rejected"
    | "access_suspended";
  payload: Record<string, unknown>;
  attempt_count: number;
};

function corsHeaders(origin: string | null) {
  const allowed = origin && (
    origin === "https://armidiasintegradas.github.io" ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080"
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "https://armidiasintegradas.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(payload: Record<string, unknown>, key = "full_name") {
  const value = String(payload[key] ?? "").trim();
  return value ? value.split(/\s+/)[0] : "Olá";
}

function roleLabel(value: unknown) {
  const labels: Record<string, string> = {
    super_admin: "Super administrador",
    admin: "Administrador",
    gestor: "Gestor",
    engenharia: "Engenharia",
    campo: "Campo",
    financeiro: "Financeiro",
    cliente: "Cliente",
  };
  const raw = String(value ?? "");
  return labels[raw] || raw || "Acesso definido";
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") as string[] : [];
}

function infoRow(label: string, value: string) {
  if (!value) return "";
  return `<tr><td style="padding:7px 0;color:#64748b;font-size:13px;width:112px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;color:#111827;font-size:13px;font-weight:700">${escapeHtml(value)}</td></tr>`;
}

function listBlock(label: string, values: string[]) {
  if (!values.length) return "";
  return `<div style="margin:16px 0 0"><div style="font-size:12px;color:#64748b;margin-bottom:6px">${escapeHtml(label)}</div><div style="font-size:14px;color:#111827;line-height:1.6;font-weight:650">${values.map(escapeHtml).join(" · ")}</div></div>`;
}

function button(label: string, url = APP_URL) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px"><tr><td bgcolor="#D7FF00" style="border-radius:12px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 20px;color:#111827;text-decoration:none;font-size:14px;font-weight:800">${escapeHtml(label)}</a></td></tr></table>`;
}

function layout(preheader: string, title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F5F8;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F2F5F8"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:24px;overflow:hidden">
      <tr><td style="padding:30px 34px 18px"><img src="${LOGO_URL}" width="150" alt="Planes" style="display:block;max-width:150px;height:auto;border:0"></td></tr>
      <tr><td style="padding:4px 34px 34px">
        <div style="width:42px;height:5px;border-radius:999px;background:#D7FF00;margin-bottom:22px"></div>
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.12;letter-spacing:-0.03em;color:#111827">${escapeHtml(title)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:22px 34px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#64748b;font-size:11px;line-height:1.55">Planes OS · Ambiente seguro de gestão operacional<br>Esta é uma mensagem transacional relacionada ao seu acesso.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function renderEmail(item: QueueItem) {
  const p = item.payload || {};
  const appUrl = String(p.app_url || APP_URL);

  if (item.template_key === "access_request_received") {
    return layout(
      "Recebemos sua solicitação de acesso ao Planes OS.",
      "Solicitação recebida.",
      `<p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Olá, ${escapeHtml(firstName(p))}. Sua identidade foi validada e sua solicitação de acesso ao Planes OS foi recebida.</p><p style="margin:14px 0 0;color:#475569;font-size:15px;line-height:1.7">Um administrador analisará seu perfil e definirá as permissões correspondentes. Você não precisa realizar nenhuma outra ação neste momento.</p>`
    );
  }

  if (item.template_key === "admin_access_request") {
    return layout(
      "Há uma nova solicitação aguardando análise no Planes OS.",
      "Nova solicitação de acesso.",
      `<p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Uma nova identidade foi validada e está aguardando sua análise.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px">${infoRow("Nome", String(p.requester_name || ""))}${infoRow("E-mail", String(p.requester_email || ""))}${infoRow("Método", String(p.provider || "Google"))}</table>${button("Analisar no Planes OS", appUrl)}`
    );
  }

  if (item.template_key === "access_approved") {
    const projects = asStringList(p.projects);
    const works = asStringList(p.works);
    return layout(
      "Seu acesso ao Planes OS foi aprovado.",
      "Seu acesso foi aprovado.",
      `<p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Olá, ${escapeHtml(firstName(p))}. Seu ambiente no Planes OS já está disponível.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px">${infoRow("Perfil", roleLabel(p.role))}</table>${listBlock("Projetos", projects)}${listBlock("Obras", works)}${button("Acessar Planes OS", appUrl)}<p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6">Depois de entrar, você poderá ativar Face ID / Passkey quando esse recurso estiver habilitado para sua conta.</p>`
    );
  }

  if (item.template_key === "access_rejected") {
    const reason = String(p.reason || "").trim();
    return layout(
      "Sua solicitação de acesso ao Planes OS foi analisada.",
      "Solicitação analisada.",
      `<p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Olá, ${escapeHtml(firstName(p))}. Sua solicitação de acesso ao Planes OS não foi aprovada.</p>${reason ? `<div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;color:#475569;font-size:13px;line-height:1.6"><strong style="color:#111827">Motivo informado:</strong><br>${escapeHtml(reason)}</div>` : ""}<p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.6">Se precisar revisar a situação, entre em contato com o administrador responsável.</p>`
    );
  }

  if (item.template_key === "access_suspended") {
    return layout(
      "Seu acesso ao Planes OS foi suspenso.",
      "Acesso suspenso.",
      `<p style="margin:0;color:#475569;font-size:15px;line-height:1.7">Olá, ${escapeHtml(firstName(p))}. Seu acesso operacional ao Planes OS foi suspenso.</p><p style="margin:14px 0 0;color:#475569;font-size:15px;line-height:1.7">Caso precise de esclarecimentos ou reativação, procure o administrador responsável.</p>`
    );
  }

  throw new Error(`unsupported_template:${item.template_key}`);
}

function retryAfterSeconds(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers });

  if (!RESEND_API_KEY || !PLANES_EMAIL_FROM) {
    return Response.json({ error: "email_not_configured" }, { status: 503, headers });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers });
  }

  const token = authHeader.slice(7);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: "Invalid session" }, { status: 401, headers });
  }

  const { data: actor } = await adminClient
    .from("profiles")
    .select("id,status,role")
    .eq("id", userData.user.id)
    .single();
  if (!actor || actor.status !== "approved" || !["super_admin", "admin"].includes(actor.role)) {
    return Response.json({ error: "Administrator authorization required" }, { status: 403, headers });
  }

  let limit = 10;
  try {
    const body = await req.json();
    if (Number.isInteger(body?.limit)) limit = Math.max(1, Math.min(25, body.limit));
  } catch {
    // Empty body is valid.
  }

  const workerId = `planes-email-worker:${crypto.randomUUID()}`;
  const { data: claimed, error: claimError } = await adminClient.rpc("private_email_claim_batch", {
    p_worker: workerId,
    p_limit: limit,
  });
  if (claimError) {
    console.error("private_email_claim_batch", claimError.code);
    return Response.json({ error: "Unable to claim email batch" }, { status: 500, headers });
  }

  const items = (claimed || []) as QueueItem[];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const html = renderEmail(item);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: PLANES_EMAIL_FROM,
          to: [item.to_email],
          subject: item.subject,
          html,
          ...(PLANES_EMAIL_REPLY_TO ? { reply_to: PLANES_EMAIL_REPLY_TO } : {}),
        }),
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorText = typeof responseBody?.message === "string"
          ? responseBody.message
          : `Resend HTTP ${response.status}`;
        await adminClient.rpc("private_email_mark_failed", {
          p_id: item.id,
          p_worker: workerId,
          p_error: errorText,
          p_retry_after_seconds: retryAfterSeconds(response),
        });
        failed += 1;
        continue;
      }

      await adminClient.rpc("private_email_mark_sent", {
        p_id: item.id,
        p_worker: workerId,
        p_provider_message_id: typeof responseBody?.id === "string" ? responseBody.id : null,
      });
      sent += 1;
    } catch (error) {
      await adminClient.rpc("private_email_mark_failed", {
        p_id: item.id,
        p_worker: workerId,
        p_error: error instanceof Error ? error.message : "Unknown delivery error",
        p_retry_after_seconds: null,
      });
      failed += 1;
    }
  }

  return Response.json({ ok: true, claimed: items.length, sent, failed }, { status: 200, headers });
});
