# Planes Intelligence — Evolução de Voz Natural em Tempo Real

## Objetivo

Substituir o fluxo atual baseado em `SpeechRecognition` + `speechSynthesis` do navegador por uma experiência de voz speech-to-speech de baixa latência, fluida, interrompível e natural.

A meta é aproximar a interação da experiência moderna de voz do ChatGPT: o usuário fala normalmente, pode interromper o assistente, ouvir respostas enquanto elas são geradas e continuar a conversa sem o ciclo rígido "gravar → esperar → transcrever → responder → ler".

## Estado atual

O Planes usa hoje:

- `window.SpeechRecognition || window.webkitSpeechRecognition` para entrada;
- `window.speechSynthesis` / `SpeechSynthesisUtterance` para saída;
- turnos únicos e discretos;
- voz escolhida entre as vozes locais disponíveis no navegador.

Esse fluxo permanece apenas como fallback de compatibilidade.

## Arquitetura alvo

### 1. Transporte

Usar WebRTC no navegador para áudio em tempo real.

Fluxo:

```
Microfone
  ↓
WebRTC
  ↓
OpenAI GPT-Live / Realtime
  ↓
áudio streaming
  ↓
alto-falante
```

O canal de dados WebRTC também transportará eventos de sessão, transcrição, ações e chamadas de ferramentas.

### 2. Backend seguro

O Planes é publicado como frontend estático, portanto nenhuma chave secreta da OpenAI pode existir em `index.html`.

Usar uma Supabase Edge Function como gateway seguro:

```
Planes Browser
   ↓
Supabase Edge Function
   ↓
OpenAI Live / Realtime API
```

Responsabilidades da Edge Function:

- autenticar o usuário Supabase;
- verificar acesso ao projeto/obra;
- manter `OPENAI_API_KEY` apenas no servidor;
- criar a sessão de voz;
- devolver ao navegador somente os dados temporários necessários para iniciar WebRTC.

### 3. Modelo de voz

Começar com uma das vozes recomendadas de maior qualidade da API, avaliando inicialmente:

- `marin`
- `cedar`

A escolha final deve ser feita ouvindo as duas em português brasileiro com vocabulário de engenharia civil.

Não tentar replicar ou clonar uma voz específica do aplicativo ChatGPT. O objetivo é naturalidade equivalente de interação, não identidade vocal idêntica.

### 4. Personas de voz do Planes Intelligence

O usuário poderá escolher entre duas personas oficiais de voz dentro do próprio Planes Intelligence:

- **Castanha** — voz masculina;
- **Brita** — voz feminina.

A escolha deve acontecer no **primeiro uso do assistente de voz**. Não usar popup externo ou tela separada do sistema: o onboarding deve aparecer dentro da própria tela do Planes Intelligence, integrado ao layout do assistente.

No primeiro acesso à voz, exibir uma escolha simples com as duas opções e um botão de prévia para ouvir cada voz antes de confirmar.

A preferência será salva por usuário e deverá sincronizar entre dispositivos. A escolha precisa permanecer disponível posteriormente em **Planes Intelligence → Voz**, permitindo trocar entre Castanha e Brita a qualquer momento.

#### Saudação diária

Na primeira interação de voz de cada dia, o assistente deve se apresentar automaticamente usando o primeiro nome do usuário e a persona escolhida.

**Castanha:**
> "Oi, [primeiro nome], tudo bem? Aqui é o Castanha. Vamos trabalhar?"

**Brita:**
> "Oi, [primeiro nome], tudo bem? Aqui é a Brita. Vamos trabalhar?"

Regras:

- a saudação ocorre somente na primeira interação de voz do dia para aquele usuário;
- novas sessões no mesmo dia não devem repetir a apresentação completa;
- a data da última saudação deve ser persistida por usuário;
- se o usuário trocar a persona durante o dia, a nova voz pode fazer uma apresentação curta: "Oi, [nome]. Agora quem fala é a Brita." / "Oi, [nome]. Agora quem fala é o Castanha.";
- o usuário deve continuar podendo interromper a saudação naturalmente;
- a persona escolhida deve manter o mesmo nome e identidade em desktop, tablet e mobile;
- Castanha e Brita são nomes de produto/persona; a voz técnica subjacente da API pode ser alterada no futuro sem mudar a identidade apresentada ao usuário.

#### Persistência

Adicionar à memória/perfil do usuário uma preferência de voz e o controle da saudação diária. Estrutura recomendada:

- `voice_persona`: `castanha` | `brita`;
- `voice_onboarding_completed_at`;
- `voice_last_daily_greeting_at`;
- `voice_enabled`;
- opcionalmente `voice_settings` em JSON para futuras preferências.

Esses dados devem ficar vinculados ao usuário autenticado, nunca somente no `localStorage`. O armazenamento local pode ser usado apenas como cache/fallback.

### 5. Comportamento conversacional

O Planes Voice deve:

- tratar o usuário sempre pelo primeiro nome;
- falar em português brasileiro por padrão;
- usar frases curtas e naturais;
- evitar ler blocos longos de tela;
- usar entonação conversacional, não locução;
- responder imediatamente quando houver segurança suficiente;
- permitir interrupção pelo usuário enquanto fala (barge-in);
- interromper o áudio atual quando detectar nova fala;
- aceitar pequenas hesitações e pausas naturais;
- manter contexto da conversa durante a sessão;
- consultar memória/hábitos do usuário e contexto da obra;
- confirmar verbalmente somente ações destrutivas ou importantes;
- executar navegação e ações do Planes por tool/function calling.

### 6. Integração com Planes Intelligence

A sessão de voz deve receber contexto mínimo e atualizado:

- primeiro nome;
- perfil/cargo;
- projeto ativo;
- PAC e avanço físico;
- suprimentos críticos;
- validações pendentes;
- tarefas abertas;
- prioridades do Intelligence;
- itens em "Para acompanhar";
- preferências e hábitos relevantes.

Evitar enviar todo o banco a cada turno. O modelo deve chamar funções do Planes para consultar dados quando necessário.

### 7. Ferramentas que a voz poderá acionar

Primeira versão:

- abrir módulo;
- consultar PAC;
- consultar avanço físico;
- consultar suprimentos;
- consultar validações;
- consultar tarefas;
- consultar prioridades;
- consultar memória "Para acompanhar";
- marcar prioridade para depois;
- retomar acompanhamento.

Segunda versão:

- criar tarefa;
- atualizar tarefa;
- editar suprimento;
- aprovar/devolver validação;
- atualizar PAC;
- registrar observação.

Ações de escrita devem usar a mesma camada bidirecional Supabase já prevista para as telas.

## Estados visuais da interface

O botão de voz deixará de representar apenas "microfone ligado/desligado".

Estados:

1. **Disponível** — "Fale com o Planes"
2. **Conectando**
3. **Ouvindo**
4. **Pensando**
5. **Falando**
6. **Interrompido pelo usuário**
7. **Reconectando**
8. **Fallback de voz local**

Durante a conversa, usar um painel discreto com waveform/atividade e transcrição opcional, sem popup bloqueando o sistema.

## Fallback

Se GPT-Live / Realtime estiver indisponível:

1. manter texto do Planes Intelligence funcionando;
2. tentar transcrição em tempo real + resposta textual;
3. por último, usar o Web Speech API existente.

O fallback não deve impedir o restante do Planes OS.

## Critérios de aceite

A nova voz só substitui a implementação atual quando:

- conversa puder continuar por vários turnos sem tocar repetidamente no microfone;
- o usuário puder interromper a fala do assistente;
- primeira resposta começar sem pausa perceptivelmente artificial;
- voz soar natural em português brasileiro;
- nomes de pessoas, projetos e termos de engenharia forem compreendidos com boa consistência;
- o assistente mantiver contexto da obra e do usuário;
- nenhuma chave OpenAI estiver exposta no navegador;
- funcionar em desktop, tablet e mobile;
- escolha entre Castanha e Brita persistir por usuário e entre dispositivos;
- onboarding de voz aparecer apenas no primeiro uso;
- troca de persona permanecer disponível dentro da tela do assistente;
- saudação "Oi, [nome], tudo bem? Aqui é o Castanha/Brita. Vamos trabalhar?" ocorrer somente na primeira interação de voz do dia;
- falha de rede tiver fallback seguro.

## Ordem no fluxo de desenvolvimento

### Fase V1 — Fundação
- criar Edge Function de sessão;
- configurar segredo OpenAI;
- implementar cliente WebRTC;
- estados de conexão;
- implementar as duas personas oficiais: **Castanha** (masculina) e **Brita** (feminina);
- mapear cada persona para a voz técnica de melhor qualidade disponível na API, começando pelos testes com `marin` e `cedar`;
- criar onboarding de voz dentro da tela do Intelligence no primeiro uso;
- permitir prévia das duas vozes antes da escolha;
- persistir a persona selecionada no perfil do usuário;
- permitir troca posterior da voz dentro da tela do assistente;
- implementar saudação diária na primeira interação de voz;
- conversa contínua;
- barge-in.

### Fase V2 — Planes Intelligence
- primeiro nome;
- identidade persistente Castanha/Brita;
- saudação diária personalizada;
- estado de último cumprimento diário;
- contexto do projeto;
- memória e hábitos;
- prioridades;
- transcrição na interface;
- chamadas de ferramentas somente leitura.

### Fase V3 — Ações bidirecionais
- conectar function calling às mutações Supabase;
- criar/editar tarefas;
- suprimentos;
- validações;
- PAC;
- confirmações de ações sensíveis.

### Fase V4 — Refinamento
- testes mobile/tablet/desktop;
- ruído de canteiro;
- Bluetooth/headsets;
- reconexão;
- métricas de latência;
- custo por sessão;
- comparação A/B de voz.

## Decisão de arquitetura

**Novo padrão:** GPT-Live / Realtime + WebRTC + Supabase Edge Function.

**Legado:** Web Speech API apenas como fallback.

**Regra:** nunca expor chave secreta OpenAI no frontend.
