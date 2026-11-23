# Planes Intelligence — Candidato de publicação controlada (RC-01)

**Data:** 23/11/2026 · **Alvo:** Planes OS · **Status:** candidate / NO-GO para produção até critérios abaixo concluídos

## Escopo candidato

- Chat existente com Brita e Castanha, entrada por microfone somente para transcrição, texto editável, segundo toque para parar e encerramento após silêncio quando reconhecido pelo navegador.
- Respostas textuais, saída de áudio bloqueada, TTS legado desativado na branch.
- Perguntas sobre a obra selecionada exigem sincronização de dados, autorização e métricas não ausentes; eventuais indicadores locais são identificados.
- Operações persistentes continuam exigindo confirmação e autorização.
- Endpoint generativo `planes-intelligence-text` é SOMENTE LEITURA, valida JWT, perfil e projeto via RLS, redige o snapshot explicitamente conforme o perfil e não oferece ferramentas de gravação.
- A integração do endpoint usa `window.PLANES_CONFIG.intelligenceTextApiEnabled === true`; não ativada por padrão.
- Cenários funcionais sintéticos da Edge Function incluídos no CI, sem chamada paga ao modelo ou dados reais.

## Evidências confirmadas

- Pipelines `Validate Planes IAM` e `PLANES Production Regression` aprovados no último commit validado antes deste documento.
- No pipeline de regressão, o frontend candidato é aberto em navegador real, e o microfone simulado preenche o campo de conversa sem enviar automaticamente ou produzir áudio.
- Consultas SOMENTE LEITURA ao catálogo do Supabase de produção mostraram RLS habilitado em `projects`, `project_metrics`, `project_supplies`, `project_tasks`, `project_validations`, `profiles` e `user_project_access`. A política SELECT das tabelas de dados operacionais inclui `private.can_access_project(project_id)`.
- Não foi realizada escrita de banco, mudança de configuração de produção, implantação da Edge Function generativa ou merge.

## Bloqueadores (NO-GO)

1. **Fidelidade do banco:** as migrações em `supabase/migrations` do GitHub não contêm todo o histórico aplicado no projeto Supabase. O histórico do serviço registra migrações de fundação IAM, operações, voz, etc. ausentes do repositório, e a migração inicial versionada define tabela `public.roles` que não existe no banco atual. **Não aplicar as migrações antigas indiscriminadamente no banco de produção.** Obter snapshot *schema-only* e reconciliar com a equipe responsável antes de testes locais RLS equivalentes.
2. **RLS real por usuário:** executar em Supabase isolado/local com dados fictícios: usuário aprovado com obra A, sem obra B, cliente, financeiro, campo, gestor e admin; verificar que nenhum dado B aparece no chat ou é enviado à IA.
3. **Modelo real:** Edge Function generativa ainda não foi implantada nem chamada com `OPENAI_API_KEY`; ensaio com provedor mock não comprova qualidade, latência, custo, ou privacidade de produção.
4. **Dispositivos:** validar ditado, permissões e pausas em Safari iOS, Chrome Android e desktop. O CI atual simula reconhecimento do navegador em Chrome; não reproduz comportamento de serviços de transcrição dos dispositivos.
5. **Privacidade:** obter aprovação de tratamento de dados de obra enviados à API externa; revisar retenção, consentimentos e informação ao cliente.
6. **Operações sensíveis:** exercitar confirmação, concorrência, idempotência, logs de auditoria, erro e rollback em ambiente isolado.
7. **Publicação:** revisar diferenças `main` versus `gh-pages` e plano para deploy/rollback. Exigir aprovação humana da etapa de publicação.

## Procedimento de publicação controlada (não executar automaticamente)

1. Congelar SHA do candidato e verificar ambos os workflows naquele SHA.
2. Provisionar ambiente isolado sem dados reais e testar os bloqueadores acima. Não criar branch Supabase paga sem aceite do custo.
3. Confirmar a política de dados com o cliente; registrar aceite e aprovação administrativa.
4. Preparar backup verificável, tag de rollback e release notes.
5. Implantar frontend e funções no ambiente de homologação primeiro, mantendo a flag generativa desabilitada até o endpoint passar nos testes; depois habilitar somente no ambiente isolado.
6. Comissionar produção em janela aprovada, monitorar 5xx, autenticação, transcrições e ações confirmadas; reverter no primeiro sinal de vazamento, falha de RLS ou perda de dados.

## Critério de decisão

**Aprovado para revisão de RC** significa código versionado, testes automatizados aprovados e produção preservada.
**Aprovado para publicação** exige todos os bloqueadores resolvidos com evidência. O estado atual é **NO-GO para ativação no cliente**.

## Próximo módulo

Começar o Planes AutoCare *após* os bloqueadores de publicação do Intelligence: abertura de chamados contextualizados, catálogo de rotinas de recuperação de baixo risco, trilha de auditoria e notificações. Não misturar seu lançamento com o primeiro rollout generativo.

## Endurecimento do candidato RC-04 (23/11/2026)

A Edge Function `planes-intelligence-text` agora exige **duas condições independentes** para uso real:
- No frontend do ambiente de homologação, `window.PLANES_CONFIG.intelligenceTextApiEnabled === true`.
- No servidor Supabase de homologação, o secret/config `PLANES_INTELLIGENCE_TEXT_ENABLED=true`. Ausente ou diferente de `true`, a função responde `503 intelligence_not_enabled` **antes de autenticar, consultar tabelas ou chamar o modelo**.

Essas condições evitam que um usuário ative uma integração sensível apenas manipulando o navegador. O modelo continua somente leitura, sem ferramentas de escrita e com controles de autenticação, RLS e minimização de dados. O bloqueio do servidor não é substituto de limite de gastos: **para produção ainda é obrigatório limitar consumo por usuário e por janela no servidor e estabelecer teto de custo no provedor**.

Para testar localmente, configurar o segredo apenas no ambiente de teste e usar dados inteiramente fictícios; nunca incluir uma chave OpenAI em HTML, repositório ou configuração pública. Não habilitar o segredo na produção sem cumprir todos os bloqueadores desta revisão.

**Estado:** CI valida o caminho com o mock, não uma chamada real nem a disponibilidade de serviços hospedados.
