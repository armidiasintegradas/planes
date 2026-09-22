# PLANES — Mobile/Tablet V2 Production Readiness

Status: arquitetura pronta para migração controlada. Produção ainda não alterada.

## Estado atual do protótipo
- Home orientada a prioridades.
- Navegação principal: Início / Planejar / Canteiro / Mais.
- Planes Intelligence persistente e contextual.
- Perfis UX: Engenharia, Campo, Gestor e Cliente.
- Brita/Castanha selecionáveis.
- Primeiro uso com onboarding curto.
- Preferência de persona persistida no dispositivo.
- Perfil de comunicação persistido no dispositivo.
- Perfil funcional persistido no dispositivo.
- Preferências de acessibilidade persistidas.
- Canteiro simplificado.
- Validações em fluxo inbox.
- Tablet com navegação lateral e master/detail.
- Confirmação antes de mutações operacionais.
- Feedback de sucesso e desfazer no protótipo.
- Simulação offline + fila local.
- Ajuda contextual.
- Ritual diário e encerramento conversacional.

## Regra para produção
O protótipo usa localStorage somente para validar experiência. Em produção, preferências e memória devem ser salvas no Supabase por usuário.

## Mapeamento para Supabase
### user_intelligence_profiles
Persistir:
- persona_preference: brita | castanha
- communication_mode: direct | balanced | detailed
- prefers_voice
- prefers_short
- prefers_detail
- last_active_role
- onboarding_completed_at
- last_daily_greeting_at
- last_end_day_at

### user_behavior_events
Continuar registrando:
- assistant_persona_selected
- assistant_daily_greeting
- intelligence_query
- voice_command
- operational_action
- intelligence_acknowledged
- intelligence_deferred
- intelligence_followup_resumed
- voice_confirmed_mutation
- voice_navigation
- voice_tool_call

### user_project_intelligence_context
Persistir por obra:
- last_screen
- last_selected_item
- recent_topics
- unresolved_followups
- current_priority_context
- last_session_summary

## Ordem de migração
1. Persistência de preferência da persona.
2. Primeiro uso/onboarding.
3. Contexto da tela atual.
4. Home por perfil.
5. Navegação principal.
6. Canteiro V2.
7. Validações V2.
8. Mais reorganizado por intenção.
9. Tablet master/detail.
10. Ritual diário.
11. Memória de estilo de comunicação.
12. Offline/reconexão.
13. Acessibilidade.
14. Polimento visual final.

## Critérios de aceite antes de substituir a interface atual
- nenhuma função existente é removida;
- todos os perfis de permissão continuam respeitados;
- mutações seguem confirmação explícita;
- ações escrevem no Supabase antes de refletir como concluídas;
- realtime reflete alteração em outros usuários conectados;
- retorno/fechamento é previsível;
- alvo de toque crítico >= 44 px;
- nenhuma sobreposição em mobile/tablet;
- safe-area funciona em iOS/Android;
- fluxo por teclado funciona no tablet;
- loading, erro e offline têm estado visível;
- onboarding aparece apenas no primeiro uso;
- trocar Brita/Castanha não apaga memória;
- greeting não se repete excessivamente;
- contexto não vaza entre obras;
- Cliente não recebe dados internos não autorizados.

## Ativos pendentes
Os avatares humanos oficiais de Brita e Castanha precisam ser adicionados ao repositório como assets canônicos. Até isso acontecer, o protótipo mantém placeholders e não recria os personagens por IA.

## Estratégia de rollout
Aplicar a V2 atrás de uma flag de interface:
- legacy: interface atual;
- v2: nova experiência.

Primeiro habilitar para administradores/engenharia interna, depois ampliar para Campo/Gestor e, por último, Cliente.

A flag permite retorno imediato à interface atual sem rollback de banco.

## Go/No-Go técnico
Pronto para iniciar implementação controlada da V2 quando:
- assets oficiais Brita/Castanha estiverem disponíveis;
- mapeamento de preferências for conectado ao Supabase;
- smoke tests cobrirem login, troca de obra, Home, Canteiro, Validações, Intelligence, offline e reconexão.
