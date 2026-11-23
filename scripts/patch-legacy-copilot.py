#!/usr/bin/env python3
"""One-time surgical repair for the legacy inline Planes Intelligence handler.
Run only against a checkout of gh-pages. Fails on unexpected source structure.
"""
from pathlib import Path

path = Path("index.html")
source = path.read_text(encoding="utf-8")
anchor = "    async function askPlanesIntelligence(predefinedPrompt) {"
flow_anchor = "      const intelligenceTopic = inferIntelligenceTopic(promptText);"
tts_call = "      speakText(summarizeIntelligenceForVoice(promptText, analysis.answer));"
marker = "function answerLegacyChatSpecificQuestion(rawQuestion) {"

if marker in source:
    print("Legacy chat direct response patch already installed")
    raise SystemExit(0)
for token in [anchor, flow_anchor, tts_call]:
    count = source.count(token)
    if count != 1:
        raise SystemExit(f"Unsafe patch: expected exactly 1 occurrence of {token!r}, got {count}")

helper = r"""    // Live chat guard: answer the actual question rather than recycling the project report.
    function answerLegacyChatSpecificQuestion(rawQuestion) {
      const q = String(rawQuestion || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!q) return null;
      const now = new Date();
      const asksTime = /(?:^|\s)(?:que horas (?:sao|sao agora|temos)|qual (?:e )?(?:a hora|o horario)|me diga as horas|horario atual)(?:\s|$)/.test(q);
      const asksDate = /(?:^|\s)(?:que dia e hoje|qual (?:e )?a data de hoje|hoje e que dia)(?:\s|$)/.test(q);
      if (asksTime) {
        return 'Agora são ' + new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit'
        }).format(now) + ' (horário de Recife).';
      }
      if (asksDate) {
        return 'Hoje é ' + new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Recife', dateStyle: 'full'
        }).format(now) + '.';
      }
      if (/^(?:oi|ola|bom dia|boa tarde|boa noite|ola brita|oi brita|tudo bem)$/.test(q)) {
        return 'Olá! Como posso ajudar? Posso responder sobre a obra e informar data e hora. Perguntas gerais pela IA externa ainda dependem da integração.';
      }
      // Explicit engineering questions retain the existing analysis.
      if (/\b(obra|empreendimento|japaratinga|pac|supriment\w*|validac\w*|tarefa\w*|engenharia|cronograma|avanco|planejamento|lookahead|risco|medicao|fornecedor|material|frente|concreto|progresso)\b/.test(q)) {
        return null;
      }
      return 'Não vou substituir sua pergunta por um relatório automático da obra. A inteligência de perguntas gerais ainda não está conectada neste ambiente. Para diagnósticos da obra, faça uma pergunta específica sobre o projeto.';
    }

"""
direct = """      const specificAnswer = answerLegacyChatSpecificQuestion(rawPromptText);
      if (specificAnswer !== null) {
        intelligenceChatHistory.push({
          sender: 'ai',
          text: specificAnswer,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
        render();
        return;
      }

"""
source = source.replace(anchor, helper + anchor, 1)
source = source.replace(flow_anchor, direct + flow_anchor, 1)
source = source.replace(tts_call, "      // Text-only Copiloto: never start synthesized voice for chat answers.", 1)
path.write_text(source, encoding="utf-8")
assert "answerLegacyChatSpecificQuestion(rawPromptText)" in source
assert tts_call not in source
print("PATCHED: direct questions routed before static engineering analysis; TTS disabled")
