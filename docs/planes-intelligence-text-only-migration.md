# Planes Intelligence — entrada por microfone, saída apenas em texto

## Escopo desta branch

- Sessão Realtime: mantém áudio **de entrada**, habilita transcrição `gpt-4o-mini-transcribe` em português, usa `semantic_vad` e solicita respostas do modelo exclusivamente em `output_modalities: ["text"]`.
- Brita e Castanha são personas **textuais**; nenhuma voz de saída é selecionada.
- Ferramentas e políticas de autorização da sessão foram preservadas, inclusive o fluxo `prepare_*` → confirmação explícita → `confirm_pending_action`.
- O endpoint legado `planes-voice-tts` responde `410 assistant_audio_disabled`, sem solicitar síntese de fala.
- Testes antigos de geração de áudio foram substituídos por testes de regressão focados na sessão textual e no bloqueio do TTS.

## Origem do frontend e integração na homologação

A afirmação anterior de que `index.html` estava vazio era incorreta: a leitura resumida do conector retornou um conteúdo vazio, mas uma consulta direta ao endpoint do GitHub confirmou um arquivo de aproximadamente 1,44 MB em `main` e outro de aproximadamente 1,46 MB em `gh-pages`. A versão publicada é montada a partir do `gh-pages`; não se deve substituir essa fonte sem testes de equivalência.

O `index.html` da branch de homologação foi atualizado para conectar o microfone da experiência existente (`planes-v2-mic`) ao campo editável de conversa (`planes-v2-input`). O adaptador acrescenta ditado por `SpeechRecognition` quando disponível, botão liga/desliga, encerramento após silêncio pelo navegador e revisão do texto antes do envio. Entradas por texto continuam disponíveis.

A branch também usa retornos antecipados nas rotas legadas `startRealtimeVoiceAssistant`, `toggleVoiceAssistant`, `startVoiceAssistant` e `speakText` para bloquear síntese de voz no cliente candidato. O pipeline monta um artefato temporário a partir do site `gh-pages` com o adaptador `public/intelligence-dictation-preview.js` e executa testes de regressão, sem alterar o site público.

**Não é garantia de entrega integral:** eventos de transcrição do Realtime antigo ainda existem no HTML legado, a integração com o backend textual Realtime não foi exercitada ponta a ponta, o ditado depende do suporte do navegador, e a publicação das Edge Functions textuais não foi realizada.

## Validação necessária antes de produção

1. Executar `npm test` na branch, verificar as suites existentes e o build.
2. Em homologação, testar permissão de microfone em desktop e mobile, dois toques, silêncio, erros de rede e entrada por teclado.
3. Validar evento real de transcrição e chegada de texto, em vez de áudio; confirmar que nenhuma saída gera som.
4. Conferir a persistência das personas e os controles de acesso por papel; confirmar alteração de dados somente após autorização explícita.
5. Confirmar que o serviço Realtime aceita a configuração de transcrição e que seu cliente processa os eventos de texto.

**Não publicar/mesclar sem esses testes.**

## Componente de entrada preparado

`components/PlanesDictationButton.tsx` oferece ditado em português com botão iniciar/parar, encerramento nativo após pausa e tratamento de erros de microfone. Usa Web Speech quando disponibilizado pelo navegador e é **apenas entrada de texto**. O componente não inicia síntese, não executa chamadas para alterar dados e não envia automaticamente mensagens ao assistente.

Para integrar a um campo controlado de chat já existente:

```tsx
import PlanesDictationButton from '../components/PlanesDictationButton';

// No mesmo componente que detém o estado da mensagem:
<PlanesDictationButton
  onTranscript={(transcript) =>
    setDraftMessage((previous) => [previous.trim(), transcript].filter(Boolean).join(' '))
  }
/>
```

O nome `setDraftMessage` é ilustrativo: substitua pelo setter real do chat. Não anexar a uma tela diferente da experiência de conversa aprovada. Se o navegador não oferecer `SpeechRecognition` / `webkitSpeechRecognition`, a digitação continua disponível, com aviso acessível.

**Privacidade:** alguns navegadores enviam fala a seus próprios serviços de reconhecimento; revisar consentimento e política de privacidade antes de disponibilizar essa opção em produção.

**Limite:** o adaptador legado está integrado ao chat em homologação; o componente React permanece reutilizável e não é usado diretamente pelo HTML legado. Nenhuma Edge Function da migração foi publicada.

## Revisão de experiência e confiabilidade — 23/11/2026

- O envio do chat agora preserva o texto digitado quando `askPlanesIntelligence` estiver indisponível ou lançar erro, permitindo nova tentativa. Após sucesso, limpa o campo.
- Escolher Brita/Castanha não liga microfone automaticamente e a preferência de saída de voz é gravada como desabilitada.
- Respostas de `askPlanesIntelligence` deixaram de chamar `speakText`.
- Consultas e preparação de alterações exigem sincronização bem-sucedida de dados do projeto em Supabase; não respondem a partir do fallback local quando o backend não está confirmado.
- Métricas com valor zero não são substituídas por valores anteriores devido ao uso de `||`.
- Testes de regressão foram adicionados para os novos contratos.

**Limites reais da implementação:** o motor principal de `askPlanesIntelligence` continua baseado em `buildPlanesIntelligenceAnalysis` e regras por palavras-chave, não em um LLM conversacional geral. A Edge Function de sessão Realtime foi configurada para texto, porém não está publicada na produção, e o chat textual antigo não é uma integração completa com esse serviço. Não classificar como inteligência generativa conectada e homologada antes de implementar e validar esse contrato.

**Próximos testes obrigatórios:** resposta com banco indisponível; isolamento entre projetos e perfis; cenários com valor zero; confirmações de alterações; regressão visual de chat e ditado no iOS/Android/desktop; execução dos pipelines do GitHub na revisão mais recente.
