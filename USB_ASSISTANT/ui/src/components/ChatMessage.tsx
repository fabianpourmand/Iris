import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';
import { useSettings } from '../hooks';

interface ChatMessageProps {
  message: ChatMessageType;
  timestamp?: string;
}

export function ChatMessage({ message, timestamp }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { settings } = useSettings();
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSupported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;
  const canUseSpeech = !isUser && settings.tts_enabled && speechSupported;
  const hasContent = message.content.trim().length > 0;

  const resetSpeechState = () => {
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  const stopSpeaking = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    resetSpeechState();
  };

  const startSpeaking = () => {
    if (!speechSupported || !hasContent) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = resetSpeechState;
    utterance.onerror = resetSpeechState;
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (!speechSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (!speechSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  useEffect(() => {
    if (!canUseSpeech || !hasContent) {
      if (isSpeaking || isPaused) {
        stopSpeaking();
      }
    }
  }, [canUseSpeech, hasContent, isPaused, isSpeaking]);

  useEffect(() => {
    return () => {
      if (utteranceRef.current && speechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechSupported]);

  return (
    <div className={`flex flex-col mb-7 w-full animate-heritage ${isUser ? 'items-end' : 'items-start'}`}>

      {/* HEADER / METADATA */}
      <div className={`flex items-center gap-2 mb-2 opacity-80 ${isUser ? 'flex-row-reverse' : ''}`}>
        <span className={`text-sm font-mono uppercase tracking-[0.2em] font-bold ${isUser ? 'text-[#b07b2c]' : 'text-[#1f6d5a]'}`}>
          {isUser ? 'OPERATOR' : 'IRIS_SYSTEM'}
        </span>
        <span className="text-sm font-mono text-[var(--muted)] opacity-60">
          [{time}]
        </span>
        {canUseSpeech && (
          <div className="flex items-center gap-1">
            {!isSpeaking && (
              <button
                type="button"
                onClick={startSpeaking}
                disabled={!hasContent}
                aria-label="Play assistant message"
                title="Play"
                className="rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--ink)] hover:border-[rgba(45,42,35,0.35)] disabled:opacity-40"
                style={{ minWidth: '0', minHeight: '0', padding: '0.4rem' }}
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {isSpeaking && !isPaused && (
              <button
                type="button"
                onClick={pauseSpeaking}
                aria-label="Pause assistant message"
                title="Pause"
                className="rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--ink)] hover:border-[rgba(45,42,35,0.35)]"
                style={{ minWidth: '0', minHeight: '0', padding: '0.4rem' }}
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {isSpeaking && isPaused && (
              <button
                type="button"
                onClick={resumeSpeaking}
                aria-label="Resume assistant message"
                title="Resume"
                className="rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--ink)] hover:border-[rgba(45,42,35,0.35)]"
                style={{ minWidth: '0', minHeight: '0', padding: '0.4rem' }}
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {(isSpeaking || isPaused) && (
              <button
                type="button"
                onClick={stopSpeaking}
                aria-label="Stop assistant message"
                title="Stop"
                className="rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--ink)] hover:border-[rgba(45,42,35,0.35)]"
                style={{ minWidth: '0', minHeight: '0', padding: '0.4rem' }}
              >
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT BOX */}
      <div className={`
        relative max-w-[78%] border px-6 py-4 shadow-[0_12px_30px_rgba(45,42,35,0.12)] transition-all
        ${isUser
          ? 'bg-[var(--paper-2)] border-[var(--border)] text-[var(--ink)] font-mono rounded-2xl rounded-tr-sm'
          : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--ink)] font-serif rounded-2xl rounded-tl-sm'
        }
      `}
        style={{
          fontFamily: isUser ? '"IBM Plex Mono", monospace' : '"EB Garamond", serif',
          fontSize: isUser ? '1rem' : '1.125rem',
        }}>
        {/* TACTICAL CORNERS */}
        {!isUser && (
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#1f6d5a]/40 -translate-x-1 -translate-y-1" />
        )}
        {isUser && (
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#b07b2c]/40 translate-x-1 translate-y-1" />
        )}

        <p className="whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
