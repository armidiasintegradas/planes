/* Planes Intelligence: no-playback dictation adapter for the legacy gh-pages chat.
 * Loaded only into candidate preview artifacts. Does not publish itself.
 */
(() => {
  'use strict';

  let recognizer = null;
  let results = [];
  let errorState = false;

  function getField() {
    return document.getElementById('planes-v2-input');
  }
  function getMic() {
    return document.getElementById('planes-v2-mic');
  }
  function status(text) {
    const mic = getMic();
    if (mic) {
      mic.setAttribute('aria-label', recognizer ? 'Encerrar ditado' : 'Iniciar ditado');
      mic.setAttribute('aria-pressed', recognizer ? 'true' : 'false');
      mic.textContent = recognizer ? '■' : '🎙';
      mic.title = text;
    }
    const field = getField();
    if (field && text) field.setAttribute('aria-description', text);
  }
  function appendTranscript(text) {
    const field = getField();
    if (!field || !text) return;
    field.value = [field.value.trim(), text].filter(Boolean).join(' ');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
  }
  function stop() {
    if (recognizer) {
      try { recognizer.stop(); } catch (_) {}
    }
  }
  function toggle() {
    if (recognizer) {
      stop();
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      status('Ditado indisponível neste navegador. Digite normalmente.');
      return;
    }
    const instance = new SpeechRec();
    recognizer = instance;
    results = [];
    errorState = false;
    instance.lang = 'pt-BR';
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onstart = () => status('Ouvindo: toque novamente para encerrar.');
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const entry = event.results[i];
        results[i] = entry[0] && entry[0].transcript ? String(entry[0].transcript) : '';
      }
    };
    instance.onerror = (event) => {
      errorState = true;
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Autorize o acesso ao microfone nas configurações do navegador.'
        : event.error === 'network'
          ? 'Erro de rede na transcrição. Digite normalmente.'
          : 'Ditado interrompido. Digite ou tente novamente.';
      status(message);
    };
    instance.onend = () => {
      if (recognizer !== instance) return;
      recognizer = null;
      const text = results.join(' ').replace(/\s+/g, ' ').trim();
      results = [];
      if (text) appendTranscript(text);
      status(text ? 'Transcrição adicionada. Revise antes de enviar.' :
        errorState ? 'Ditado indisponível. Digite normalmente.' : 'Nenhuma fala reconhecida.');
    };
    try {
      instance.start();
      status('Solicitando acesso ao microfone…');
    } catch (_) {
      recognizer = null;
      status('Não foi possível iniciar o microfone.');
    }
  }

  // Capturing prevents the legacy handler from starting audio generation/WebRTC.
  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest && event.target.closest('#planes-v2-mic');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle();
  }, true);

  document.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('[data-v2-close]')) stop();
  }, true);

  // Use a text-only path for any legacy helper that tries to synthesize replies.
  // This function is a global in the published classic-script app.
  if (typeof window.speakText === 'function') {
    window.speakText = async () => {
      if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
    };
  }

  // Route small, objectively answerable requests before the legacy
  // keyword-based project summary. No external provider or fabricated data.
  // In production, open-ended questions require the authenticated generative
  // endpoint (not the legacy summary generator).
  function answerDirectQuestion(message, now = new Date()) {
    const text = String(message || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[!?.,]/g, ' ').trim();
    if (!text) return null;
    if (/^(?:que horas (?:sao|sao agora|e|temos)|qual (?:e )?a hora|me diga as horas|horario atual)$/.test(text)) {
      return 'Agora são ' + new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' }).format(now) + ' (horário de Recife).';
    }
    if (/^(?:qual (?:e )?a data de hoje|que dia e hoje|hoje e que dia)$/.test(text)) {
      return 'Hoje é ' + new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', dateStyle: 'full' }).format(now) + '.';
    }
    return null;
  }

  // The legacy classic-script app exposes this global on builds that allow
  // runtime adaptation. Keep technical answers untouched until the real
  // authenticated LLM backend is enabled; only direct factual intents are
  // intercepted here.
  if (typeof window.askPlanesIntelligence === 'function') {
    const legacyAsk = window.askPlanesIntelligence;
    window.askPlanesIntelligence = function (...args) {
      const first = args[0];
      const question = typeof first === 'string' ? first
        : first && typeof first === 'object' ? (first.message || first.question || '') : '';
      const direct = answerDirectQuestion(question);
      if (direct !== null) return Promise.resolve(direct);
      return legacyAsk.apply(this, args);
    };
  }
  window.planesIntelligenceDirectQuestion = answerDirectQuestion;

  window.planesIntelligenceDictation = { stop, toggle };
})();
