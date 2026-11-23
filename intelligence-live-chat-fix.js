/* Planes OS legacy chat hotfix — 2026-11-23.
 * The live legacy chat is not backed by an authenticated general LLM.
 * Do not fabricate an answer by recycling the static engineering diagnosis.
 * This hotfix changes only generic/unrelated questions and audio playback.
 */
(() => {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[!?.,]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  const clock = (date = new Date()) =>
    new Intl.DateTimeFormat('pt-BR',{
      timeZone:'America/Recife',hour:'2-digit',minute:'2-digit'
    }).format(date);
  const today = (date = new Date()) =>
    new Intl.DateTimeFormat('pt-BR',{
      timeZone:'America/Recife',dateStyle:'full'
    }).format(date);

  function directAnswer(question, date = new Date()) {
    const q = normalize(question);
    if (!q) return null;
    if (/^(?:oi|ola|bom dia|boa tarde|boa noite|e ai|tudo bem|ola brita|oi brita|oi castanha)$/.test(q)) {
      return 'Olá! Estou aqui para ajudar. Posso consultar os diagnósticos da obra disponíveis no sistema, além de informar a data e a hora. Perguntas gerais e pesquisas externas dependem da conexão da nova IA.';
    }
    if (/^(?:que horas (?:sao|sao agora|sao ai|temos)|qual (?:e )?a hora|qual (?:e )?o horario|horario atual|me diga as horas)$/.test(q)) {
      return 'Agora são ' + clock(date) + ' (horário de Recife).';
    }
    if (/^(?:qual (?:e )?a data de hoje|que dia e hoje|hoje e que dia|qual (?:e )?o dia de hoje)$/.test(q)) {
      return 'Hoje é ' + today(date) + '.';
    }
    // Preserve existing engineering analysis for explicitly scoped questions.
    if (/\b(obra|empreendimento|japaratinga|pac|suprimento|validac|tarefa|engenharia|cronograma|avanco|projeto|planejamento|lookahead|risco|medicao|custo|financeiro|prazo|frente|concreto|fornecedor|material)\b/.test(q)) {
      return null;
    }
    // The current public environment has no authorized general LLM endpoint.
    // Explicitly decline instead of presenting a fixed project snapshot.
    return 'Esta pergunta não corresponde a um diagnóstico da obra. A inteligência de perguntas gerais ainda não está conectada neste ambiente; por isso não vou repetir o relatório do empreendimento nem inventar uma resposta. A nova interface está disponível em intelligence-universal.html.';
  }

  function extractQuestion(args) {
    for (const value of args) {
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        for (const key of ['question','message','prompt','text']) {
          if (typeof value[key] === 'string' && value[key].trim()) return value[key];
        }
      }
    }
    return '';
  }

  function install() {
    const current = window.askPlanesIntelligence;
    if (typeof current === 'function' && current.__planesLiveAnswerHotfix !== true) {
      const wrapped = function(...args) {
        const direct = directAnswer(extractQuestion(args));
        if (direct !== null) return Promise.resolve(direct);
        return current.apply(this,args);
      };
      wrapped.__planesLiveAnswerHotfix = true;
      window.askPlanesIntelligence = wrapped;
      window.__PLANES_CHAT_PATCH_STATUS__ = 'active';
    }
    if (typeof window.speakText === 'function' && window.speakText.__planesTextOnlyHotfix !== true) {
      const mute = async function() {
        try { if (typeof window.stopSpeaking === 'function') window.stopSpeaking(); } catch {}
      };
      mute.__planesTextOnlyHotfix = true;
      window.speakText = mute;
    }
  }

  window.planesLegacyChatDirectAnswer = directAnswer;
  window.__PLANES_CHAT_PATCH_STATUS__ = 'waiting_for_chat';
  install();
  // Legacy scripts can initialize after this file. Re-attempt when the chat
  // is opened, without injecting untrusted markup or altering authentication.
  let count = 0;
  const retry = window.setInterval(() => {
    install();
    if (++count >= 90) window.clearInterval(retry);
  }, 1000);
})();
