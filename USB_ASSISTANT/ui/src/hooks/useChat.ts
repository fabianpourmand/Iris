import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { useSettings } from './useSettings';

type ChatErrorType = 'llm_not_running' | 'streaming_unavailable' | 'unknown';

type StreamEventPayload = {
  event?: 'start' | 'delta' | 'done' | 'error';
  delta?: string;
  error?: string;
};

interface PendingMessage {
  content: string;
  category?: string;
  chatId?: string | null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ChatErrorType | null>(null);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const { settings } = useSettings();
  const messagesRef = useRef(messages);
  const pendingRef = useRef<PendingMessage | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setPending = useCallback((value: PendingMessage | null) => {
    pendingRef.current = value;
    setPendingMessage(value);
  }, []);

  const classifyError = useCallback((message: string): ChatErrorType => {
    const normalized = message.toLowerCase();
    if (normalized.includes('llm is not running') || normalized.includes('llama-server')) {
      return 'llm_not_running';
    }
    if (normalized.includes('streaming unavailable')) {
      return 'streaming_unavailable';
    }
    return 'unknown';
  }, []);

  const sendMessage = useCallback(async (content: string, category?: string, chatId?: string | null) => {
    const baseMessages = messagesRef.current;
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      category: category as ChatMessage['category'],
    };
    const newMessages = [...baseMessages, userMessage];
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      category: category as ChatMessage['category'],
    };
    const assistantIndex = newMessages.length;
    setMessages([...newMessages, assistantMessage]);
    setLoading(true);
    setError(null);
    setErrorType(null);
    setPending({ content, category, chatId });

    try {
      const streamResponse = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message: content,
          messages: newMessages,
          category,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
        }),
      });

      if (!streamResponse.ok || !streamResponse.body) {
        throw new Error('Streaming unavailable');
      }

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          const line = rawEvent.split('\n').find(item => item.startsWith('data:'));
          if (!line) continue;
          const payloadText = line.slice(5).trim();
          if (!payloadText) continue;

          let payload: StreamEventPayload | null = null;
          try {
            const parsed = JSON.parse(payloadText);
            if (parsed && typeof parsed === 'object') {
              payload = parsed as StreamEventPayload;
            }
          } catch {
            continue;
          }

          if (!payload) continue;

          if (payload.event === 'error') {
            throw new Error(payload.error || 'Stream error');
          }
          if (payload.event === 'delta' && payload.delta) {
            assistantContent += payload.delta as string;
            setMessages(prev => {
              const next = [...prev];
              if (!next[assistantIndex]) return prev;
              next[assistantIndex] = { ...next[assistantIndex], content: assistantContent };
              return next;
            });
          }
        }
      }
      setPending(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const classified = classifyError(message);
      setError(message);
      setErrorType(classified);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message: content,
            messages: newMessages,
            category,
            temperature: settings.temperature,
            max_tokens: settings.max_tokens,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const assistantContent = data.content || data.message || '';
          setMessages(prev => {
            const next = [...prev];
            if (!next[assistantIndex]) return prev;
            next[assistantIndex] = { ...next[assistantIndex], content: assistantContent };
            return next;
          });
          setError(null);
          setErrorType(null);
          setPending(null);
        }
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        const fallbackType = classifyError(fallbackMessage);
        setErrorType(fallbackType);
        setMessages(prev => {
          const next = [...prev];
          if (!next[assistantIndex]) return prev;
          next[assistantIndex] = { ...next[assistantIndex], content: `Error: ${fallbackMessage}` };
          return next;
        });
        if (fallbackType !== 'llm_not_running') {
          setPending(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [classifyError, setPending, settings]);

  const loadChat = useCallback(async (chatId?: string | null) => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load chat');
      }
      const data = await response.json();
      setMessages(data.chat?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setErrorType(null);
    setPending(null);
  }, [setPending]);

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    setMessages(prev => {
      if (prev.length < 2) return prev;
      const last = prev[prev.length - 1];
      const beforeLast = prev[prev.length - 2];
      const matchesUser = beforeLast.role === 'user' && beforeLast.content === pending.content;
      const matchesAssistant = last.role === 'assistant' && (last.content === '' || last.content.startsWith('Error:'));
      if (matchesUser && matchesAssistant) {
        return prev.slice(0, -2);
      }
      return prev;
    });
    setError(null);
    setErrorType(null);
    setPending(null);
  }, [setPending]);

  const retryPending = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearPending();
    await sendMessage(pending.content, pending.category, pending.chatId || undefined);
  }, [clearPending, sendMessage]);

  return {
    messages,
    loading,
    error,
    errorType,
    pendingMessage,
    sendMessage,
    clearMessages,
    setMessages,
    loadChat,
    clearPending,
    retryPending,
  };
}
