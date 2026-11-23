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
