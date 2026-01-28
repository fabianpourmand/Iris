import { useCallback, useEffect, useState } from 'react';
import type { ChatSession, ChatSummary, LLMCategory } from '../types';

interface ChatUpdateInput {
  title?: string;
  category_lock?: LLMCategory | null;
}

export function useChats() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to load chats');
      const data = (await response.json()) as { chats: ChatSummary[] };
      setChats(data.chats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = useCallback(async (title?: string) => {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create chat');
    }
    const data = (await response.json()) as { chat: ChatSession };
    await fetchChats();
    return data.chat;
  }, [fetchChats]);

  const getChat = useCallback(async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to load chat');
    }
    const data = (await response.json()) as { chat: ChatSession };
    return data.chat;
  }, []);

  const updateChat = useCallback(async (chatId: string, updates: ChatUpdateInput) => {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update chat');
    }
    const data = (await response.json()) as { chat: ChatSession };
    await fetchChats();
    return data.chat;
  }, [fetchChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete chat');
    }
    await fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    loading,
    error,
    refresh: fetchChats,
    createChat,
    getChat,
    updateChat,
    deleteChat,
  };
}
