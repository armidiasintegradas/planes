# Planes Intelligence universal — primeira implementação (NÃO PUBLICADA)

## Objetivo
Deixar de repetir o resumo fixo da obra e responder à intenção real do usuário.

## Contrato implementado
Edge Function candidata: `planes-universal-assistant` (somente leitura, sem deploy).
- `{message:"Que horas são?"}`: envia uma pergunta geral ao modelo sem resumo obrigatório da obra.
- `{message:"Explique curva S"}`: resposta geral.
- `{message:"Pesquise novas normas de engenharia",mode:"research"}`: habilita ferramenta `web_search` quando a flag de servidor está ativa; retorna citações de URLs.
- `{message:"O que é a obra A?",project_code:"obraA"}`: valida JWT, perfil aprovado e acesso RLS ao projeto antes de enviar o seu contexto mínimo. **Não entrega ainda métricas da obra**; para dados operacionais, manter o endpoint `planes-intelligence-text` com métricas RLS e homologação.
- `{message:"Ligue para João"}`: somente proposta `call_contact`, nunca efetua ligação.
- `{message:"Adicione uma tarefa"}`: somente proposta `database_change`, nunca grava dados.

## Próxima integração real (obrigatória para ações)
1. Resolver contatos autorizados por serviço ou API com consentimento e escopo do usuário. Nunca revelar telefones de outros usuários e nunca aceitar número inventado pelo modelo. Iniciar `tel:` somente com gesto explícito do usuário e confirmação no sistema operacional, ou usar provedor autorizado de telefonia com consentimento e controle de custo.
2. Definir registro `pending_actions` no backend isolado, com expiração, idempotência, vínculo usuário/obra, tipo de ação, payload validado, política RLS e log de auditoria. Preparar → revisar → confirmar → gravar sob JWT e RLS → informar resultado real. Nunca confiar em `confirmed:true` fornecido pelo modelo.
3. Permitir ações específicas (tarefas, suprimentos, validações, informação autorizada) via endpoints que usem os contratos do banco. Nunca SQL arbitrário gerado pela IA.
4. Implementar transações atômicas de consumo por usuário/projeto e limites persistentes por janela de tempo no Supabase; antes disso manter `PLANES_ASSISTANT_ENABLED=false`. A variável `PLANES_ASSISTANT_QUOTAS_VERIFIED` é um **marcador de implantação**, não implementa rate limiting por si só; NÃO configurá-la para true até que a limitação exista e seja testada.
5. Integrar frontend em preview com autenticação Supabase, roteador de perguntas e painéis de ação/confirmar, preservando teclado e ditado. Testar no navegador e em dispositivos reais.
6. Homologar Edge Function com Supabase isolado, credencial OpenAI de homologação e orçamento aprovado; revisar LGPD e fluxos de auditoria, validar todas as permissões e rollback.

## Custos
Pesquisas web pela OpenAI são cobradas por chamada além dos tokens, conforme a [tabela de preços da API](https://platform.openai.com/pricing/). A flag de pesquisa é opt-in e desativada por padrão.

## Estado
Código candidato e testes de mock podem passar sem credenciais, mas **nenhuma chamada real à OpenAI, pesquisa pública ou ligação real ocorreu**. Não está ativado no cliente e não há aprovação de produção.

## Quota persistente adicionada à candidata

Implementado `supabase/staging-only/planes_universal_assistant_quota.sql`: tabela privada de uso com RLS e RPC restrita ao `service_role`, permitindo limites atômicos por minuto e dia por usuário. A Edge Function agora faz a chamada real a `consume_planes_assistant_quota` após autenticar e validar permissões e **antes** de chamar a OpenAI. Se a RPC não existir, não funcionar ou faltar a chave de serviço no servidor, responde indisponível (fail-closed); se exceder a cota, responde HTTP 429. Padrão: 10 requisições/minuto e 100/dia.

- Não aplicar a migração na produção: somente quando existir homologação isolada com esquema conciliado.
- Testes de mock em `tests/planes-universal-assistant.test.mjs` cobrem cotas, bloqueio e indisponibilidade.
- O workflow `.github/workflows/planes-universal-assistant.yml` foi estendido para usar PostgreSQL 16 descartável e executar `tests/sql/planes-universal-assistant-quota.test.sql`.
- A flag de habilitação permanece **desligada**. Mesmo com a RPC, é necessário homologar transações, limites efetivos, privacidade e teto financeiro no provedor antes de ativar.
- Tokens pagos consumidos variam por pergunta/modelo/pesquisa. A quota por requisição reduz risco mas **não equivale a um orçamento financeiro em reais/dólares**.

## Interface de homologação — implementação

Foi incluído `public/planes-universal-preview.js` com uma janela independente para testar o novo Copiloto sem sobrescrever o chat publicado. A janela apresenta modos **Perguntar** e **Pesquisar na web**, código opcional da obra, histórico legível, indicação de erro e links de fontes; não executa propostas de ação.

**Atenção:** o arquivo é candidato, NÃO foi injetado no HTML de produção. Para testá-lo é necessário montar um artefato de preview e vincular uma instância Supabase **isolada**, com Auth e Edge Function própria. O código se recusa a iniciar se a URL/ref corresponder ao projeto produtivo atual.

Configuração requerida no preview isolado (substituir pelos valores reais da homologação, nunca chaves secretas):

```html
<script>
  window.PLANES_UNIVERSAL_PREVIEW = {
    enabled: true,
    supabaseProjectRef: 'REF_DO_SUPABASE_ISOLADO',
    supabaseUrl: 'https://REF_DO_SUPABASE_ISOLADO.supabase.co',
    publishableKey: 'SOMENTE_CHAVE_PUBLICA_DA_HOMOLOGACAO'
  };
  // Disponibilizado pelo controlador de autenticação EXCLUSIVO da homologação:
  // window.PLANES_UNIVERSAL_STAGING_CLIENT = supabaseClientDeHomologacao;
</script>
<script src="./planes-universal-preview.js"></script>
```

O `supabaseClientDeHomologacao` precisa ter `auth.getSession()` e `supabaseUrl` apontando para a mesma instância isolada. Sem sessão, o campo de pergunta é preservado e nenhuma requisição acontece. O texto vindo da IA é inserido apenas com `textContent`, para evitar HTML injetado.

### Testes
- `tests/planes-universal-preview.test.mjs`: recusa produção, encaminha pergunta específica com JWT de homologação, preserva texto sem login e diante de falha de backend.
- `.github/workflows/planes-universal-assistant.yml`: executa os testes de interface, contratos de mock e os testes PostgreSQL de cotas.
- O resultado desses testes **não comprova** ligação real à OpenAI, autenticação do ambiente integral, telefonia nem gravações.

**Pendência da UI principal:** o código publicado usa HTML legado com grande script embutido, além de autenticação própria. Substituir a implementação sem validar o preview no navegador real pode gerar regressões. A migração deve ocorrer apenas após E2E autenticação/JWT no Supabase isolado, sem usar tokens da produção em um endpoint de testes.
