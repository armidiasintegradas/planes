import { createClient } from "npm:@supabase/supabase-js@2.105.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://armidiasintegradas.github.io/planes/";

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

async function kickTransactionalEmails(authHeader: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/planes-email-worker`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 5 }),
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) console.warn("email kick not completed", response.status);
  } catch (error) {
    console.warn("email kick failed", error instanceof Error ? error.message : "unknown error");
  }
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers });
  }

  try {
    const token = authHeader.slice(7);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return Response.json({ error: "Invalid session" }, { status: 401, headers });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: actor, error: actorError } = await adminClient
      .from("profiles")
      .select("id,status,role")
      .eq("id", userData.user.id)
      .single();

    if (actorError || !actor || actor.status !== "approved" || !["super_admin", "admin"].includes(actor.role)) {
      return Response.json({ error: "Administrator authorization required" }, { status: 403, headers });
    }

    const body = await req.json();
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : "";
    const role = typeof body.role === "string" ? body.role : null;
    const projectIds = Array.isArray(body.projectIds) ? body.projectIds.filter((v: unknown) => typeof v === "string") : [];
    const workIds = Array.isArray(body.workIds) ? body.workIds.filter((v: unknown) => typeof v === "string") : [];
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : null;
    const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim() : null;

    const roles = ["super_admin", "admin", "gestor", "engenharia", "campo", "financeiro", "cliente"];
    if (!requestId || !decision) {
      return Response.json({ error: "requestId and decision are required" }, { status: 400, headers });
    }
    if (decision === "approve" && (!role || !roles.includes(role))) {
      return Response.json({ error: "A valid role is required for approval" }, { status: 400, headers });
    }
    if (decision === "reject" && !rejectionReason) {
      return Response.json({ error: "rejectionReason is required" }, { status: 400, headers });
    }
    if (actor.role !== "super_admin" && role === "super_admin") {
      return Response.json({ error: "Only a super administrator can grant super_admin" }, { status: 403, headers });
    }

    const { data, error } = await adminClient.rpc("admin_review_access_request", {
      p_actor_id: userData.user.id,
      p_request_id: requestId,
      p_decision: decision,
      p_role: decision === "approve" ? role : null,
      p_project_ids: projectIds,
      p_work_ids: workIds,
      p_rejection_reason: decision === "reject" ? rejectionReason : null,
      p_admin_notes: adminNotes,
    });

    if (error) {
      console.error("admin_review_access_request failed", error.code);
      return Response.json({ error: "Unable to review access request" }, { status: 400, headers });
    }

    // Delivery is best-effort and intentionally cannot roll back a successful IAM decision.
    await kickTransactionalEmails(authHeader);

    return Response.json({ ok: true, result: data, appUrl: APP_URL }, { status: 200, headers });
  } catch (error) {
    console.error("admin-review-access", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
});
