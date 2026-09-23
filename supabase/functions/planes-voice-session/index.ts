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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json({
      error: "openai_api_key_missing",
      message: "Configure OPENAI_API_KEY nos secrets do projeto Supabase para ativar a voz Realtime."
    }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const sdp = String(body?.sdp || "").trim();
  if (!sdp) return json({ error: "missing_sdp" }, 400);

  const persona = body?.persona === "brita" ? "brita" : "castanha";
  const firstName = String(body?.firstName || "usuário").slice(0, 80);
  const projectTitle = String(body?.projectTitle || "obra ativa").slice(0, 160);
  let effectiveRole = String(body?.effectiveRole || "engenharia").slice(0, 80);
  let audience = String(body?.audience || "engineering").slice(0, 40);
  let voiceCapabilities = Array.isArray(body?.voiceCapabilities)
    ? body.voiceCapabilities.map((item: unknown) => String(item)).slice(0, 12)
    : [];

  // Autorização de voz é sempre derivada da sessão Supabase validada no servidor.
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "authentication_required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "supabase_auth_configuration_missing" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const authenticatedUser = authData?.user;
  if (authError || !authenticatedUser) {
    return json({ error: "invalid_session" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,role,status")
    .eq("id", authenticatedUser.id)
    .single();

  if (profileError || !profile || profile.status !== "approved" || !profile.role) {
    return json({ error: "voice_access_not_approved" }, 403);
  }

  const userSub = authenticatedUser.id;
  effectiveRole = String(profile.role);

  const serverPolicies: Record<string, string[]> = {
    super_admin: ["create_task","edit_task","toggle_task","approve_validation","reject_validation","update_pac","create_supply","edit_supply","update_supply_status","create_followup"],
    admin: ["create_task","edit_task","toggle_task","approve_validation","reject_validation","update_pac","create_supply","edit_supply","update_supply_status","create_followup"],
    gestor: ["create_task","edit_task","toggle_task","update_pac","create_followup"],
    engenharia: ["create_task","edit_task","toggle_task","approve_validation","reject_validation","update_pac","create_supply","edit_supply","update_supply_status","create_followup"],
    campo: ["create_task","edit_task","toggle_task","approve_validation","reject_validation","create_followup"],
    financeiro: ["create_followup"],
    cliente: ["create_followup"]
  };
  voiceCapabilities = serverPolicies[effectiveRole] || [];
  audience =
    effectiveRole === "cliente" ? "client" :
    effectiveRole === "financeiro" ? "finance" :
    effectiveRole === "campo" ? "field" :
    effectiveRole === "gestor" ? "executive" :
    (effectiveRole === "super_admin" || effectiveRole === "admin") ? "admin" :
    "engineering";

  const capabilityLabels: Record<string, string> = {
    create_task: "criar tarefas",
    edit_task: "editar tarefas",
    toggle_task: "concluir ou reabrir tarefas",
    approve_validation: "aprovar validações",
    reject_validation: "rejeitar validações",
    update_pac: "alterar PAC ou avanço físico",
    create_supply: "criar suprimentos",
    edit_supply: "editar suprimentos",
    update_supply_status: "alterar status de suprimentos",
    create_followup: "criar acompanhamentos pessoais"
  };
  const allMutationCapabilities = Object.keys(capabilityLabels);
  const allowedMutationLabels = voiceCapabilities
    .filter((cap: string) => allMutationCapabilities.includes(cap))
    .map((cap: string) => capabilityLabels[cap]);
  const deniedMutationLabels = allMutationCapabilities
    .filter((cap) => !voiceCapabilities.includes(cap))
    .map((cap) => capabilityLabels[cap]);

  // Vozes Realtime distintas por persona. A naturalidade vem principalmente das
  // instruções de prosódia e conversação abaixo; Web Speech nunca é a experiência principal.
  const voice = persona === "brita" ? "bossa" : "tempo";
  const personaName = persona === "brita" ? "Brita" : "Castanha";
  const voiceDirection = persona === "brita"
    ? `Brita: use um timbre inequivocamente feminino, brasileiro, jovem-adulto e contemporâneo; acolhedor, espontâneo e expressivo. Fale como uma colega inteligente ao lado do usuário, nunca como locutora, URA, GPS ou leitura de texto. A voz deve ter leveza, sorriso discreto, variação melódica natural e energia conversacional.`
    : `Castanha: use um timbre inequivocamente masculino, brasileiro, adulto e contemporâneo; mais grave, tranquilo, próximo e expressivo. Fale como um colega experiente ao lado do usuário, nunca como locutor, URA, GPS ou leitura de texto. A voz deve ter corpo, calor, pausas naturais e segurança sem formalidade excessiva.`;

  const planesTools = [
    {
      type: "function",
      name: "get_project_overview",
      description: "Consultar o resumo executivo atual da obra ativa no Planes, incluindo avanço, meta, PAC, validações, suprimentos e tarefas.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_pac_status",
      description: "Consultar PAC, avanço físico, meta e aderência atual da obra.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_supplies_status",
      description: "Consultar situação atual dos suprimentos e entregas da obra.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_validations_status",
      description: "Consultar fila e situação atual das validações e medições pendentes.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_tasks_status",
      description: "Consultar tarefas e pendências operacionais atuais.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_intelligence_priorities",
      description: "Consultar prioridades atuais calculadas pelo Planes Intelligence para este usuário e esta obra.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "get_followups",
      description: "Consultar itens pessoais que o usuário deixou em Para acompanhar e suas decisões recentes nesta obra.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      type: "function",
      name: "prepare_create_task",
      description: "Preparar a criação de uma tarefa no Planes. Esta ferramenta NÃO grava ainda; retorna um resumo que deve ser confirmado verbalmente pelo usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título objetivo da tarefa." },
          responsible: { type: "string", description: "Responsável, se informado pelo usuário." },
          deadline: { type: "string", description: "Prazo em linguagem humana, por exemplo Hoje, Amanhã ou 25/09." }
        },
        required: ["title"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_approve_validation",
      description: "Preparar a aprovação de uma validação/medição pendente. Não aprova imediatamente; localiza o registro e exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome, frente, responsável, item ou outra referência da validação." }
        },
        required: ["query"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_update_pac",
      description: "Preparar atualização do PAC e/ou avanço físico. Não grava imediatamente; exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          pac_score: { type: "number", description: "Novo PAC em percentual de 0 a 100." },
          physical_progress: { type: "number", description: "Novo avanço físico em percentual de 0 a 100." }
        },
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_update_supply_status",
      description: "Preparar alteração de status de um suprimento. Não grava imediatamente; exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome, fornecedor ou setor do suprimento." },
          status: {
            type: "string",
            enum: ["Programado","Em Transporte","No Canteiro","Atrasado"],
            description: "Novo status operacional."
          }
        },
        required: ["query","status"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_edit_task",
      description: "Preparar edição de tarefa existente. Exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          title: { type: "string" },
          responsible: { type: "string" },
          deadline: { type: "string" }
        },
        required: ["query"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_toggle_task",
      description: "Preparar conclusão ou reabertura de tarefa existente. Exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          done: { type: "boolean" }
        },
        required: ["query","done"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_reject_validation",
      description: "Preparar rejeição de validação com motivo obrigatório. Exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          reason: { type: "string" }
        },
        required: ["query","reason"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_create_supply",
      description: "Preparar criação de suprimento. Exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          supplier: { type: "string" },
          quantity: { type: "string" },
          delivery: { type: "string" },
          sector: { type: "string" },
          status: { type: "string", enum: ["Programado","Em Transporte","No Canteiro","Atrasado"] }
        },
        required: ["name"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_edit_supply",
      description: "Preparar edição de suprimento existente. Exige confirmação.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          name: { type: "string" },
          supplier: { type: "string" },
          quantity: { type: "string" },
          delivery: { type: "string" },
          sector: { type: "string" },
          status: { type: "string", enum: ["Programado","Em Transporte","No Canteiro","Atrasado"] }
        },
        required: ["query"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "prepare_create_followup",
      description: "Preparar um acompanhamento pessoal em Para acompanhar. Exige confirmação, mas não altera dados operacionais compartilhados.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string" },
          text: { type: "string" },
          action: { type: "string" }
        },
        required: ["label"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "confirm_pending_action",
      description: "Executar ou cancelar a ação operacional que foi preparada anteriormente. Só use confirmed=true depois de o usuário dizer explicitamente que confirma.",
      parameters: {
        type: "object",
        properties: {
          confirmed: { type: "boolean", description: "true somente se o usuário confirmou explicitamente; false para cancelar." }
        },
        required: ["confirmed"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "open_module",
      description: "Abrir visualmente um módulo do Planes para o usuário. Use somente quando o usuário pedir explicitamente para abrir, mostrar ou ir para uma tela.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["overview","balance_line","lookahead","field","validations","pac","supplies","intelligence","reports","gallery"],
            description: "Módulo do Planes que deve ser aberto."
          }
        },
        required: ["module"],
        additionalProperties: false
      }
    }
  ];

  const liveInstructions =
    `Você é ${personaName}, persona oficial do Planes Intelligence. ${voiceDirection}
Converse sempre em português brasileiro atual e natural. Seja breve, espontâneo e humano.
Não leia relatórios em voz alta e não use tom de locução, URA, GPS ou audiobook.
Use pausas, ritmo e entonação naturais. Reaja ao que o usuário acabou de dizer antes de responder.
Chame ${firstName} pelo primeiro nome apenas quando soar natural.
Se o usuário interromper, pare e escute imediatamente.
Quando precisar consultar dados da obra, executar uma ação, validar permissões ou confirmar uma alteração, delegue ao backend.
Nunca invente dados operacionais nem diga que uma alteração foi concluída antes da confirmação do backend.`;

  const backendInstructions =
    `Você é o backend operacional do Planes Intelligence para uma conversa de voz conduzida por ${personaName}.
Projeto ativo: ${projectTitle}. Perfil efetivo: ${effectiveRole}. Público: ${audience}.
Capacidades permitidas: ${allowedMutationLabels.length ? allowedMutationLabels.join(", ") : "nenhuma"}.
Capacidades não permitidas: ${deniedMutationLabels.length ? deniedMutationLabels.join(", ") : "nenhuma"}.

Use as ferramentas do Planes para consultar dados atuais; nunca invente números.
Para alterações AUTORIZADAS, use primeiro uma ferramenta prepare_* e devolva um resumo claro pedindo confirmação.
Somente após confirmação explícita use confirm_pending_action.
Se a alteração não for autorizada, não chame prepare_* e explique a restrição.
Para abrir telas, use open_module.
Retorne ao modelo de voz apenas fatos verificados, estado atual da ação e próximo passo. Evite Markdown extenso e linguagem de relatório.`;

  const sessionConfig = {
    model: "gpt-live-1",
    audio: {
      output: { voice }
    },
    delegation: {
      type: "responses",
      responses: {
        model: "gpt-5.6-terra",
        instructions: backendInstructions,
        tools: planesTools,
        tool_choice: "auto",
        parallel_tool_calls: false
      }
    },
    instructions: liveInstructions
  };

  try {
    const safetyId = await sha256("planes:" + userSub);
    const openaiResponse = await fetch("https://api.openai.com/v1/live/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Safety-Identifier": safetyId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: sessionConfig,
        transport: { type: "webrtc", sdp }
      }),
    });

    const payloadText = await openaiResponse.text();
    let payload: any = null;
    try { payload = JSON.parse(payloadText); } catch {}

    if (!openaiResponse.ok || !payload?.transport?.sdp) {
      console.error("OpenAI Live session error", openaiResponse.status, payloadText.slice(0, 500));
      return json({
        error: "live_session_failed",
        status: openaiResponse.status,
        detail: payloadText.slice(0, 300)
      }, 502);
    }

    return json({
      sdp: payload.transport.sdp,
      sessionId: payload.session?.id || null,
      engine: "gpt-live-1",
      voice,
      persona: personaName
    }, 201);
  } catch (error) {
    console.error("planes-voice-session error", error);
    return json({ error: "live_gateway_error" }, 500);
  }
});
