# Planes Intelligence — entrada por microfone, saída apenas em texto

## Escopo desta branch

- Sessão Realtime: mantém áudio **de entrada**, habilita transcrição `gpt-4o-mini-transcribe` em português, usa `semantic_vad` e solicita respostas do modelo exclusivamente em `output_modalities: ["text"]`.
- Brita e Castanha são personas **textuais**; nenhuma voz de saída é selecionada.
- Ferramentas e políticas de autorização da sessão foram preservadas, inclusive o fluxo `prepare_*` → confirmação explícita → `confirm_pending_action`.
- O endpoint legado `planes-voice-tts` responde `410 assistant_audio_disabled`, sem solicitar síntese de fala.
- Testes antigos de geração de áudio foram substituídos por testes de regressão focados na sessão textual e no bloqueio do TTS.

## Importante — interface ainda não implementada nesta branch

O arquivo `index.html` está vazio na `main` consultada e o `app/page.tsx` não contém o cliente de voz referenciado pela documentação legada. O código que exibe o microfone, controla o início/parada da gravação, emite eventos WebRTC, renderiza transcrições e mensagens e retira estados visuais de fala **não foi localizado** entre os arquivos do repositório consultado. Portanto, esta branch não pode ser considerada uma entrega completa de UI ou de voz sem áudio.

Antes de publicar: localizar a origem real do frontend implantado, tratar eventos `conversation.item.input_audio_transcription.completed` e `response.output_text.delta/done` (ou equivalentes do cliente), preservar a transcrição editável no chat, implementar encerramento por silêncio e permitir parada por segundo toque, remover player de resposta, atalhos de TTS e opção de voz de saída. O cliente não deve forçar `output_modalities: ["audio"]` em atualizações da sessão ou respostas.

## Validação necessária antes de produção

1. Executar `npm test` na branch, verificar as suites existentes e o build.
2. Em homologação, testar permissão de microfone em desktop e mobile, dois toques, silêncio, erros de rede e entrada por teclado.
3. Validar evento real de transcrição e chegada de texto, em vez de áudio; confirmar que nenhuma saída gera som.
4. Conferir a persistência das personas e os controles de acesso por papel; confirmar alteração de dados somente após autorização explícita.
5. Confirmar que o serviço Realtime aceita a configuração de transcrição e que seu cliente processa os eventos de texto.

**Não publicar/mesclar sem esses testes.**
