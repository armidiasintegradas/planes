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

## Homologação RLS gratuita em PostgreSQL isolado — evidência CI (23/11/2026)

Foi adicionado `tests/sql/intelligence-rls-isolated.sql` e um serviço `postgres:16` descartável ao workflow `Validate Planes IAM`. Esse teste NÃO necessita de credenciais, conexão com banco hospedado ou dados reais. Ele recria as **funções e políticas principais de autorização por projeto** a partir das definições consultadas por leitura no Supabase, usando UUIDs e obras inteiramente fictícios.

O workflow passou no commit `42b12978ebb49775884d689ee183e9b5261e642d`, com **26 asserções SQL reais aprovadas**, incluindo:

- Engenharia: apenas obra A; acesso a métricas incluindo zero; negação de leitura e atualização da obra B.
- Campo: acesso à obra A e atualização de tarefas da obra A, mas não de métricas ou tarefas da obra B.
- Financeiro: leitura de obra A, impossibilidade de alterar suprimentos via política RLS.
- Cliente: acesso apenas à obra A; sem alterações de tarefas.
- Gestor: atualização operacional da obra A, sem acesso à obra B.
- Pendente e suspenso: sem linhas de projetos ou métricas.
- Administrador: visualização das duas obras e respectivos dados.

**Limitação:** este é um *espelho mínimo de contratos RLS em PostgreSQL*, não o conjunto completo de migrações do Supabase local. Ele valida a semântica das políticas espelhadas em um banco real, mas não o comportamento das configurações Auth/PostgREST/Storage/Realtime ou das políticas não incluídas. Antes de produção, executar testes E2E com JWTs reais em ambiente Supabase isolado e schema completo.

A Edge Function possui testes de mock independentes que validam minimização dos dados encaminhados à IA. A consulta de colunas agora diferencia valores financeiros e métricas operacionais por papel, como defesa adicional às políticas SQL.

## Repetição gratuita no computador de desenvolvimento

Com Docker instalado e iniciado, executar a partir da raiz do repositório:

```bash
bash scripts/validate-intelligence-rls-local.sh
```

O script inicia um container PostgreSQL 16 sem expor portas de rede, executa `tests/sql/intelligence-rls-isolated.sql`, registra resultados e destrói o container ao sair. **Não configura, clona ou acessa o Supabase de produção.** Também não cria um projeto hospedado nem gera cobrança no Supabase. O teste local/CI possui senhas exclusivamente fictícias e temporárias, que não devem ser reutilizadas em serviços públicos.

Para homologação completa, permanece necessária a reprodução fiel do schema e Auth do Supabase e o teste do endpoint com JWT reais de usuários fictícios e uma API de IA configurada com limites de custo.

## Testes HTTP autenticados no CI (PostgREST 14.18)

Além dos **26 asserts SQL em PostgreSQL 16**, o workflow `Validate Planes IAM` inicia um **PostgREST descartável** e assina JWTs fictícios com um segredo que existe apenas no próprio processo de teste. Em `tests/http-intelligence-rls-e2e.mjs`, o serviço executa requisições HTTP à Data API usando os papéis `authenticated` e `anon`. A etapa passou em `https://github.com/armidiasintegradas/planes/actions/runs/45192328123`.

Os cenários exercitam:
- Usuários de engenharia, campo, financeiro, cliente e gestor: apenas a Obra A visível;
- Administrador: Obra A e Obra B;
- Usuários pendente/suspenso: zero obras e zero métricas;
- Valores zero preservados nas métricas;
- Requisição anônima e assinatura JWT inválida rejeitadas;
- `PATCH` de métricas negado para campo, permitido a engenharia na Obra A, negado na Obra B.

**Escopo do teste:** utiliza PostgREST real, SQL real e JWTs assinados, mas **não é uma instância completa do Supabase Auth** nem prova end-to-end com contas hospedadas. Postgres e PostgREST só existem durante o CI; tokens, IDs, banco e segredos são inteiramente sintéticos. Não há conexão com o Supabase de produção.

Os testes SQL e HTTP devem continuar sendo executados automaticamente a cada PR. A implantação do backend generativo e as verificações com dados de testes reais dependem de ambiente Supabase equivalente com autenticação, configurações e funções completas.
