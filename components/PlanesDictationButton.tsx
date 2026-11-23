'use client';

import { useEffect, useRef, useState } from 'react';

type DictationResult = { isFinal: boolean; 0: { transcript: string } };
type DictationEvent = { resultIndex: number; results: ArrayLike<DictationResult> };
type DictationErrorEvent = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: DictationErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Props = {
  /** Appends dictated text to the existing, editable chat input. Never submits automatically. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function PlanesDictationButton({ onTranscript, disabled = false, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const recognizer = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const mounted = useRef(true);
  const stopping = useRef(false);
  const transcriptParts = useRef<string[]>([]);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recognizer.current?.abort();
      recognizer.current = null;
    };
  }, []);

  function finish() {
    stopping.current = true;
    recognizer.current?.stop();
  }

  function toggle() {
    if (disabled) return;
    if (recognizer.current) {
      finish();
      return;
    }

    const recognitionWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setMessage('Seu navegador não oferece ditado por voz. Digite sua mensagem normalmente.');
      setState('error');
      return;
    }

    const current = new Recognition();
    recognizer.current = current;
    transcriptParts.current = [];
    stopping.current = false;
    current.lang = 'pt-BR';
    current.continuous = false; // Browser closes after a pause or silence.
    current.interimResults = true;

    current.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0]?.transcript?.trim();
          if (text) transcriptParts.current.push(text);
        }
      }
    };

    current.onerror = (event) => {
      if (!mounted.current) return;
      // A browser may emit "aborted" after a deliberate stop.
      if (stopping.current && event.error === 'aborted') return;
      const errors: Record<string, string> = {
        'not-allowed': 'Permita o acesso ao microfone nas configurações do navegador.',
        'audio-capture': 'Microfone indisponível. Verifique o dispositivo.',
        'network': 'Não foi possível transcrever. Verifique sua conexão.',
        'no-speech': 'Nenhuma fala detectada. Toque para tentar novamente.'
      };
      setMessage(errors[event.error] || 'Não foi possível transcrever. Tente novamente.');
      setState('error');
    };

    current.onend = () => {
      if (!mounted.current || recognizer.current !== current) return;
      recognizer.current = null;
      const text = transcriptParts.current.join(' ').trim();
      transcriptParts.current = [];
      stopping.current = false;
      if (text) {
        onTranscriptRef.current(text);
        setMessage('Transcrição adicionada à mensagem. Revise antes de enviar.');
      }
      setState((previous) => previous === 'error' ? 'error' : 'idle');
    };

    try {
      current.start();
      setMessage('Ouvindo. Toque novamente para encerrar.');
      setState('listening');
    } catch {
      recognizer.current = null;
      setMessage('Não foi possível iniciar a gravação.');
      setState('error');
    }
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={state === 'listening'}
        aria-label={state === 'listening' ? 'Encerrar ditado' : 'Iniciar ditado'}
        title={state === 'listening' ? 'Encerrar ditado' : 'Ditar mensagem'}
      >
        {state === 'listening' ? '■ Parar' : '🎙 Ditar'}
      </button>
      <span role="status" aria-live="polite" style={{ marginLeft: 8, fontSize: 12 }}>
        {message}
      </span>
    </span>
  );
}
