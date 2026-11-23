# Supabase — Reconciliação do esquema para homologação local

Captura: **23/11/2026** · Fonte: metadados SOMENTE LEITURA do projeto Supabase do Planes OS Produção.

## Descoberta

- O histórico de migrações aplicado no Supabase contém **34 entradas**.
- O repositório continha **8 arquivos** sob `supabase/migrations/`; somente os IDs `20260922185909` e `20260922190320` coincidem diretamente com o histórico aplicado.
- Os demais arquivos têm versões distintas, inclusive uma fundação IAM antiga (`20260903000001_planes_iam_schema.sql`) que define um modelo de `public.roles` divergente do banco atual baseado em `public.planes_user_role`. A tabela `public.roles` **não existe** na instância consultada.
- **Não utilizar `db reset` com essas migrações presumindo equivalência** e não aplicar esses scripts na produção.
- `types/supabase-production-baseline.ts` é um snapshot de TIPOS gerado pelo Supabase a partir do esquema atual, sem linhas ou segredos. Esse snapshot suporta testes estáticos de contratos dos campos do Intelligence, mas **não recria políticas, triggers nem funções**.

## Como obter paridade sem criar cobrança

1. Preparar um ambiente Supabase local através da CLI e contêineres Docker (sem projeto hospedado adicional). Fazer a verificação de recursos locais antes de instalar qualquer componente.
2. Fazer uma exportação *schema-only* do ambiente atual, por acesso autorizado e seguro da equipe responsável; revisar o dump antes de importá-lo localmente, removendo referências de infraestrutura não portáveis, secrets, extensões indisponíveis e qualquer dado sensível acidental.
3. Antes de executar scripts, comparar o histórico `supabase_migrations.schema_migrations` com os arquivos versionados e construir uma nova referência de baseline fiel ao estado atual. Não falsificar migrações históricas inexistentes.
4. Criar usuários e projetos inteiramente fictícios no ambiente local. Testar matrizes RLS de `projects`, `project_metrics`, `project_supplies`, `project_validations`, `project_tasks` e `profiles` com identidades distintas, inclusive negativa (obra B).
5. Implantar `planes-intelligence-text` apenas nesse ambiente. Inicialmente substituir o provedor de IA por um mock, depois usar chave de testes com orçamento aprovado. O acesso deve usar JWT de cada perfil.
6. Validar escrita/negação em permissões, latência, dados ausentes, erro de provedor e gravações com confirmação no frontend. A função generativa não poderá gravar dados.
7. Marcar a RC-01 como liberável somente com relatório de resultados e plano de reversão.

## Critérios de segurança de dados

- **Não copiar** registros reais, contas de usuários, e-mails, tokens, chaves, senhas, dados operacionais privados, dumps integrais ou arquivos de Storage para ambientes de teste.
- O snapshot versionado com metadados é permitido; antes de publicar o repositório ou ampliar compartilhamento, revisar se nomes de tabelas/campos também são informações sensíveis do cliente.
- Consultas ao serviço nesta fase foram somente leitura. Nenhuma migração foi aplicada nem a produção alterada.

## Estado desta investigação

A incompatibilidade foi **identificada e documentada**, e existe referência de tipos para detectar regressões. **Não foi reconstruído nem testado um Supabase local equivalente**: isso exige o dump schema-only validado, políticas e funções reais, além de execução local. Não apresentar testes simulados como equivalentes aos testes RLS reais.

## Evidências adicionais da auditoria (23/11/2026)

- Snapshot de tipos obtido por leitura do esquema da instância conectada e versionado em `types/supabase-production-baseline.ts`. Testes `tests/intelligence-schema-baseline.test.mjs` validam as tabelas/colunas necessárias ao endpoint, sem copiar linhas ou credenciais.
- RLS: uma consulta de leitura sob identidade fictícia sem acesso retornou **0 linhas visíveis** para projetos, métricas, suprimentos, tarefas e validações. Esse é somente um **teste negativo**, não prova a matriz completa de papéis ou autenticação real no navegador.
- O histórico `supabase_migrations.schema_migrations` contém SQL original armazenado no Supabase. Algumas migrações incluem `INSERT` e literais de inicialização; não exportar esses statements diretamente para um repositório sem triagem de segurança e remoção de dados/seeds. Um dump validado *schema-only* permanece o caminho preferido para testes locais.
- Os pipelines `Validate Planes IAM` e `PLANES Production Regression` passaram no commit `796d7b0b68f48ea6d7320acc2c7038df679d0657`. Uma alteração posterior deste documento exigirá nova execução dos checks.

**Decisão:** ainda não há evidência suficiente de paridade real do Supabase local. Mantém-se NO-GO para publicar a Edge Function generativa ou ativar `intelligenceTextApiEnabled` na produção.
