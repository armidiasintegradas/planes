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

### 4. Comportamento conversacional

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

### 5. Integração com Planes Intelligence

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

### 6. Ferramentas que a voz poderá acionar

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
- falha de rede tiver fallback seguro.

## Ordem no fluxo de desenvolvimento

### Fase V1 — Fundação
- criar Edge Function de sessão;
- configurar segredo OpenAI;
- implementar cliente WebRTC;
- estados de conexão;
- voz `marin` / `cedar`;
- conversa contínua;
- barge-in.

### Fase V2 — Planes Intelligence
- primeiro nome;
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
