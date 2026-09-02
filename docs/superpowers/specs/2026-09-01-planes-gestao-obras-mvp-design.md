# Planes Gestão de Obras — Especificação do MVP

## 1. Objetivo

Construir um protótipo funcional e responsivo da plataforma digital de gestão de obras da Planes Engenharia. O piloto será a obra **Japaratinga Resort – Expansão 3**, alimentada pelos dados reais das planilhas:

- `LINHA DE BALANÇO_PLANEJAMENTO JAPARATINGA_16.03.26.xlsx`
- `MÉDIO PRAZO JAPARATINGA R4.xlsx`

O produto deve conectar planejamento, execução de campo, validação da engenharia e decisão gerencial em um fluxo único:

> planejamento → compromisso semanal → apontamento → validação → comparação → alerta → decisão

Esta primeira versão será adequada para demonstração e validação operacional com a Planes. Os dados importados e as interações do usuário serão persistidos localmente. As interfaces de acesso a dados ficarão isoladas para permitir a adoção futura de API, banco de dados, armazenamento de arquivos e autenticação corporativa.

## 2. Escopo da engenharia reversa

### 2.1 Linha de Balanço

O arquivo possui seis abas:

1. `GERAL`
2. `INFRA`
3. `ARENA`
4. `BLOCO APTOS`
5. `PRÉDIOS`
6. `ÁREA DA PISCINA`

As abas usam colunas de dias úteis como eixo temporal. A visão geral contém até 482 colunas e consolida frentes como Arena, Blocos de Apartamentos, Recepção/Restaurante/Spa/Guarita, Área da Piscina e Infraestrutura.

A importação deve reconhecer:

- título da obra;
- área ou frente;
- bloco ou torre;
- pavimento/local de produção;
- disciplina e atividade;
- data inicial e final planejadas;
- células coloridas que representam o intervalo de execução;
- marcos e divisões temporais;
- linha de base disponível no arquivo.

### 2.2 Médio Prazo

O arquivo possui quatro janelas sucessivas:

1. `MAR E ABR 26`
2. `ABR E MAI 26`
3. `MAI.JUN.JUL.AGO`
4. `AGO.SET.26`

O planejamento utiliza objetos gráficos ancorados sobre colunas semanais. Foram identificados 1.334 cartões com atividades, metas parciais, percentuais, quantidades, equipes e observações. Há também alertas e restrições em elementos gráficos.

A importação deve extrair:

- texto do cartão;
- início e fim da semana pela posição do objeto;
- grupo ou seção pela linha ocupada;
- cor usada como classificação visual;
- percentual ou quantidade presente no texto;
- equipe, quando informada;
- restrições e alertas;
- indicadores de concluídas, em andamento e em atraso;
- repetições e revisões entre janelas.

### 2.3 Limitações conhecidas da fonte

As planilhas não formam uma base relacional. Parte do significado está codificada por posição, cor, forma e texto livre. A importação será específica para os arquivos piloto e produzirá um relatório de qualidade com:

- registros importados automaticamente;
- registros normalizados por regras conhecidas;
- itens ambíguos mantidos com o texto original;
- duplicidades prováveis entre janelas;
- restrições sem atividade vinculada;
- campos ausentes.

Nenhum dado ambíguo será silenciosamente inventado.

## 3. Usuários e perfis

### Administrador

- gerencia usuários de demonstração;
- visualiza todas as áreas;
- importa ou restaura os dados do piloto;
- acessa configurações de marca e organização.

### Engenheiro/Planejamento

- consulta e filtra o planejamento;
- cria e ajusta plano semanal;
- valida ou devolve apontamentos;
- trata restrições;
- consulta painéis e desvios.

### Campo

- utiliza prioritariamente a visão mobile `Minha Obra`;
- consulta atividades atribuídas;
- registra produção, materiais, foto e impedimento;
- acompanha apontamentos devolvidos.

### Diretoria/Gestão

- acessa o painel executivo e as visões consolidadas;
- consulta desvios, tendências e atenções para decisão;
- não altera dados operacionais.

## 4. Login e controle de acesso

O MVP terá uma tela de acesso com identidade visual da Planes, login por e-mail e senha, opção de mostrar/ocultar senha, feedback de erro e encerramento de sessão.

Para demonstração, contas pré-configuradas representarão os quatro perfis. A sessão ficará restrita ao dispositivo e não será apresentada como segurança de produção. Senhas não serão expostas na interface após o primeiro acesso e não serão usadas para proteger dados sensíveis reais.

A aplicação separará:

- `AuthProvider`: estado de sessão e usuário autenticado;
- `AuthRepository`: validação das credenciais de demonstração;
- `RouteGuard`: proteção de áreas autenticadas;
- `Permissions`: autorização por perfil.

Essa separação permitirá substituir o repositório local por autenticação corporativa ou serviço de identidade sem alterar as jornadas principais.

## 5. Modelo de domínio

Todas as entidades de negócio terão `tenantId` e `projectId`.

### Hierarquia da obra

`Obra > Área/Frente > Bloco/Torre > Pavimento/Local > Disciplina > Atividade`

### Entidades principais

- **Tenant**: organização, marca e configurações.
- **User**: perfil, permissões e contexto de obra.
- **Project**: dados da obra piloto, calendário e baseline ativa.
- **LocationNode**: nós hierárquicos de área, torre e pavimento.
- **Discipline**: classificação técnica.
- **Activity**: descrição, local, disciplina, unidade, quantidade e responsável.
- **ScheduleVersion**: baseline e revisões.
- **ScheduleItem**: início, fim, dependências, quantidade planejada e peso.
- **LookaheadItem**: compromisso dentro de uma janela de 2 a 6 semanas.
- **WeeklyCommitment**: meta semanal, responsável e situação.
- **ProductionEntry**: data, quantidade, observação e autor.
- **MaterialEntry**: material, unidade, quantidade e atividade.
- **PhotoAttachment**: referência local à imagem e metadados.
- **Constraint**: tipo, descrição, responsável, prazo, impacto e situação.
- **Validation**: decisão do engenheiro, comentário e histórico.
- **ImportBatch**: origem, data, versão e relatório de qualidade.

## 6. Módulos e jornadas

### 6.1 Painel Planes

Primeiro viewport com:

- avanço físico planejado e realizado;
- aderência do plano semanal;
- atividades atrasadas;
- restrições abertas e vencidas;
- tendência de prazo;
- apontamentos aguardando validação;
- lista curta de atenções para decisão.

Os cartões terão ligação com a lista filtrada que origina o indicador.

### 6.2 Estrutura da obra

Árvore navegável da obra piloto. A seleção de um nó atualiza atividades, indicadores e planejamento relacionados. A hierarquia preservará os nomes originais e permitirá nomes normalizados para apresentação.

### 6.3 Cronograma mestre/Gantt

- lista hierárquica de atividades;
- escala temporal;
- barra de baseline;
- barra do planejamento atual;
- avanço realizado;
- filtros por frente, torre, pavimento, disciplina e situação;
- destaque de atraso e variação em dias.

O MVP não implementará edição complexa por arrastar. O foco será consulta, filtros e comparação confiável.

### 6.4 Linha de Balanço

- eixo horizontal de tempo;
- eixo vertical de localização repetitiva;
- linhas por atividade ou disciplina;
- identificação de ritmo e sobreposição;
- filtros por torre/frente e disciplina;
- destaque do ponto atual e dos desvios.

Quando uma atividade não tiver repetição suficiente, ela será exibida no Gantt, não forçada na Linha de Balanço.

### 6.5 Lookahead de 2 a 6 semanas

- seletor de horizonte;
- cartões ou tabela por semana;
- prontidão da atividade;
- restrições vinculadas;
- responsável e meta;
- origem no planejamento mestre;
- promoção para plano semanal.

### 6.6 Plano semanal

- compromissos da semana atual;
- meta planejada e execução validada;
- situação: não iniciada, em andamento, concluída ou atrasada;
- aderência semanal calculada com base nos compromissos concluídos e validados;
- justificativa para não cumprimento.

### 6.7 Minha Obra

Experiência mobile com três ações prioritárias:

1. registrar produção;
2. registrar material;
3. registrar impedimento.

A tela inicial mostrará atividades de hoje e da semana. O formulário virá preenchido com obra, local, atividade e responsável. O usuário poderá anexar foto usando arquivo local ou câmera disponível no dispositivo.

### 6.8 Validação da engenharia

- fila de apontamentos pendentes;
- detalhes da atividade e histórico recente;
- produção, material, fotos e impedimentos do envio;
- aprovar, devolver com comentário ou corrigir quantidade;
- atualização dos indicadores apenas após aprovação quando o dado afetar avanço oficial.

### 6.9 Restrições

- classificação: projeto, material, mão de obra, equipamento, acesso, segurança, qualidade, contratação, orçamento ou outro;
- vínculo com atividade e local;
- responsável e prazo;
- situação: aberta, em tratamento, liberada ou vencida;
- impacto previsto em prazo;
- evidência e histórico.

## 7. Indicadores

### Avanço físico

Razão entre avanço ponderado validado e quantidade total ponderada. Quando o peso não existir na fonte, o MVP usará peso uniforme e identificará essa premissa no detalhamento.

### Aderência semanal

Percentual dos compromissos semanais concluídos e validados dentro da semana, com contagem visível do numerador e denominador.

### Variação de prazo

Diferença entre a data atual ou conclusão realizada e a data de baseline aplicável.

### Restrições

Contagem por situação, tipo, responsável e vencimento. Atenções executivas priorizarão itens vencidos ou com impacto em atividades próximas.

### Qualidade dos dados

O painel de importação mostrará registros importados, itens ambíguos e campos incompletos. Indicadores derivados deverão apontar sua fonte e premissas.

## 8. Persistência e fluxo de dados

### Dados iniciais

Um processo de importação fora da interface transformará as duas planilhas em arquivos normalizados e versionados consumidos pelo aplicativo.

### Dados de uso

Apontamentos, validações, restrições e preferências serão persistidos no navegador. Haverá opção de restaurar a demonstração para seu estado inicial.

### Interfaces de repositório

As telas dependerão de contratos de repositório, e não diretamente do armazenamento local. O MVP terá implementações locais para:

- autenticação;
- atividades e cronograma;
- lookahead e plano semanal;
- produção e materiais;
- restrições;
- validações.

## 9. Branding Planes

A aplicação será apresentada como produto da Planes, sem protagonismo da expressão “white label”.

### Direção visual

- logotipo e assinatura da Planes;
- azul institucional como cor principal;
- paleta de apoio sóbria para estados operacionais;
- tipografia técnica, clara e corporativa;
- alto contraste e boa leitura em canteiro;
- desktop com densidade adequada à engenharia;
- mobile com controles grandes e formulários curtos;
- linguagem visual premium, robusta e objetiva.

### Preparação white label

Tokens de marca, nome do produto, logotipo, cores e metadados ficarão centralizados no objeto `TenantBrand`. Nenhuma tela deverá depender de valores visuais espalhados pelo código.

## 10. Estados e tratamento de erros

- login inválido com mensagem clara e sem revelar qual campo falhou;
- sessão expirada com retorno seguro ao acesso;
- ausência de dados com ação contextual;
- falha no carregamento com opção de tentar novamente;
- foto inválida ou grande demais com orientação antes do envio;
- apontamento incompleto preservado como rascunho;
- conflito de dados local tratado pela versão mais recente e histórico de alterações;
- importação ambígua registrada para revisão, sem descarte silencioso.

## 11. Critérios de aceite

O MVP será considerado funcional quando:

1. for possível entrar e sair usando contas de demonstração;
2. menus e rotas respeitarem os perfis de acesso;
3. a obra Japaratinga Resort – Expansão 3 aparecer com dados extraídos das duas planilhas;
4. a hierarquia real puder ser navegada e filtrada;
5. Gantt, Linha de Balanço, Lookahead e Plano Semanal utilizarem a mesma base de atividades;
6. o usuário de campo puder registrar produção, material, foto e impedimento no celular;
7. o engenheiro puder aprovar ou devolver o registro;
8. a aprovação atualizar a comparação planejado × realizado e os indicadores aplicáveis;
9. o painel executivo mostrar avanço, prazo, aderência, desvios e atenções rastreáveis;
10. dados criados durante a demonstração permanecerem após recarregar a página;
11. a demonstração puder ser restaurada para o estado inicial;
12. a interface aplicar consistentemente o branding da Planes em desktop e mobile.

## 12. Fora do escopo desta fase

- autenticação de produção ou recuperação real de senha;
- colaboração simultânea entre dispositivos;
- API e banco de dados hospedados;
- armazenamento remoto de fotos;
- notificações por e-mail ou mensageria;
- custos detalhados e integração com ERP;
- edição completa do cronograma por arrastar;
- integração com MS Project, Primavera ou BIM;
- funcionamento offline sincronizado entre dispositivos;
- aplicativo nativo para iOS ou Android.

Esses itens permanecem compatíveis com a arquitetura proposta, mas dependem da validação do fluxo operacional do piloto.

## 13. Estratégia de verificação

- testes do normalizador de datas, textos, percentuais e posições dos objetos gráficos;
- reconciliação de amostras com cada aba de origem;
- testes dos cálculos de avanço, aderência e variação;
- testes de permissões e proteção de rotas;
- teste completo: login → atividade → apontamento → validação → atualização do painel;
- verificação responsiva das jornadas desktop e mobile;
- compilação de produção sem erros bloqueantes.
