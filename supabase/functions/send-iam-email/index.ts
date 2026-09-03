// Follow this setup guide to integrate the Deno runtime and Resend:
// https://deno.land/manual/runtime/secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "Planes OS <acesso@planesengenharia.com.br>";
const APP_URL = Deno.env.get("APP_URL") || "https://armidiasintegradas.github.io/planes/";
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "armidiasintegradas@gmail.com";

interface EmailPayload {
  type: "APPROVAL" | "REJECTION" | "NEW_REQUEST";
  to: string;
  name: string;
  roleName?: string;
  projects?: string[];
  works?: string[];
  reason?: string;
  provider?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.type) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes ('to' e 'type')." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let htmlContent = "";

    if (payload.type === "APPROVAL") {
      subject = "Seu acesso ao Planes OS foi liberado";
      const projectsList = payload.projects && payload.projects.length > 0
        ? payload.projects.join(", ")
        : "Todos os empreendimentos da organização";

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b151f; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0b2535; padding: 32px 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { color: #d4ff00; margin: 6px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .body { padding: 32px 28px; line-height: 1.6; }
            .badge-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
            .badge-item { margin-bottom: 8px; font-size: 13px; }
            .badge-item strong { color: #0b2535; }
            .btn { display: inline-block; background: #d4ff00; color: #0b2535; padding: 14px 28px; font-size: 13px; font-weight: 900; text-decoration: none; border-radius: 10px; border: 1px solid #c4ed00; margin: 16px 0 8px 0; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Planes ENG</h1>
              <p>Plataforma de Gestão e Engenharia</p>
            </div>
            <div class="body">
              <h2 style="font-size: 18px; color: #0b2535; margin-top: 0;">Olá, ${payload.name}.</h2>
              <p style="font-size: 14px; color: #334155;">
                Seu acesso ao <strong>Planes OS</strong> foi aprovado pela administração da Planes Engenharia.
              </p>
              <div class="badge-box">
                <div class="badge-item"><strong>Perfil de Acesso:</strong> ${payload.roleName || "Engenharia"}</div>
                <div class="badge-item"><strong>Projetos Autorizados:</strong> ${projectsList}</div>
                <div class="badge-item"><strong>Status:</strong> <span style="color: #15803d; font-weight: bold;">● Acesso Liberado</span></div>
              </div>
              <p style="font-size: 13px; color: #475569;">
                Você já pode entrar na plataforma utilizando o mesmo método usado durante seu cadastro (Google, Apple, Passkey ou E-mail).
              </p>
              <div style="text-align: center;">
                <a href="${APP_URL}" class="btn">Acessar Planes OS ↗</a>
              </div>
            </div>
            <div class="footer">
              Equipe Planes Engenharia • Ambiente Corporativo Seguro<br>
              Este é um e-mail automático do sistema IAM. Não responda diretamente a esta mensagem.
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (payload.type === "REJECTION") {
      subject = "Atualização sobre sua solicitação de acesso — Planes OS";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; background-color: #0b151f; margin: 0; padding: 24px; }
            .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0b2535; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; }
            .body { padding: 28px; line-height: 1.6; color: #334155; font-size: 13.5px; }
            .reason-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px; margin: 16px 0; color: #9f1239; font-weight: 500; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Planes ENG</h1>
            </div>
            <div class="body">
              <h2 style="font-size: 16px; color: #0b2535; margin-top: 0;">Olá, ${payload.name}.</h2>
              <p>Informamos que sua solicitação de acesso ao Planes OS não foi autorizada no momento.</p>
              <div class="reason-box">
                <strong>Justificativa Administrativa:</strong><br>
                ${payload.reason || "Critérios institucionais de conformidade."}
              </div>
              <p>Para dúvidas adicionais ou solicitação de revisão, entre em contato diretamente com a diretoria técnica da sua unidade.</p>
            </div>
            <div class="footer">
              Equipe Planes Engenharia • Segurança da Informação
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (payload.type === "NEW_REQUEST") {
      subject = "Nova solicitação de acesso — Planes OS";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Nova solicitação de acesso recebida</h2>
          <p>O seguinte colaborador solicitou cadastro no Planes OS:</p>
          <ul>
            <li><strong>Nome:</strong> ${payload.name}</li>
            <li><strong>E-mail:</strong> ${payload.to}</li>
            <li><strong>Método:</strong> ${payload.provider || "Email"}</li>
            <li><strong>Perfil pretendido:</strong> ${payload.roleName || "Engenharia"}</li>
          </ul>
          <p><a href="${APP_URL}">Clique aqui para revisar no Painel Administrativo</a></p>
        </body>
        </html>
      `;
    }

    // Se Resend API Key não estiver configurada no ambiente
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurada no ambiente Supabase. Simulando envio para logs.");
      return new Response(
        JSON.stringify({
          success: false,
          warning: "RESEND_API_KEY não configurada. Configure no dashboard do Supabase (Edge Functions Secrets).",
          simulated: true,
          recipient: payload.to,
          subject: subject
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Disparo real via Resend API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [payload.to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Erro no envio Resend:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro interno Edge Function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
