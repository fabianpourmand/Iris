import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  PanelLeft, PanelRight, PanelTop, Maximize2, Minimize2, FolderSearch, ShieldAlert, Trash2,
  Camera, X, Mic, Send, Plus, Loader2, ArrowLeft, Pencil, Check,
  Sparkles, Heart, Code2, Calculator, Beaker, Tent, Sprout, Hammer, Lightbulb,
  Layout, RotateCcw, Eye, Search, ChevronUp, ShieldCheck, type LucideIcon
} from 'lucide-react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { useSystemInfo, useLLM, useChat, useModels, useProfile, useChats, useSettings } from '../hooks';
import { ChatMessage, ModelSelector, FileExplorer, FileEditor, CategoryGrid } from '../components';
import type { ModelInfo, LLMCategory, ChatSummary, ChatSession } from '../types';
import { useI18n } from '../i18n';

type ChatCategory = LLMCategory | 'auto';
type AutoHint = { category: LLMCategory; confidence: number; applied: boolean };

const STORAGE_KEYS = {
  category: 'chat.selectedCategory',
  modelSelections: 'chat.modelSelections',
  showUnavailable: 'chat.showUnavailable',
  showSandboxExplorer: 'chat.showSandboxExplorer',
  showLeftPanel: 'chat.showLeftPanel',
  showRightPanel: 'chat.showRightPanel',
  showTopPanel: 'chat.showTopPanel',
  defaultModelId: 'models.defaultModelId',
  quickPromptOffsets: 'chat.quickPromptOffsets',
};

const readStoredBoolean = (key: string, fallback: boolean) => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === 'true';
  } catch {
    return fallback;
  }
};

const readStoredString = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readStoredJson = <T,>(key: string, fallback: T) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const writeStoredJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const writeStoredBoolean = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures
  }
};

const categoryCards: { id: ChatCategory; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'auto', label: 'Auto', icon: Sparkles, description: 'IRIS chooses the clearest path for you.' },
  { id: 'general', label: 'General', icon: Lightbulb, description: 'Everyday questions, brainstorming, and planning.' },
  { id: 'coding', label: 'Code', icon: Code2, description: 'Software insight, debugging, and architecture.' },
  { id: 'medical', label: 'Medical', icon: Heart, description: 'First-aid, symptoms, and care guidance.' },
  { id: 'mathematics', label: 'Math', icon: Calculator, description: 'Equations, analysis, and quantitative help.' },
  { id: 'chemistry', label: 'Chemistry', icon: Beaker, description: 'Formulas, lab sense, and reactions.' },
  { id: 'survival', label: 'Survival', icon: Tent, description: 'Wilderness skills, shelter, and rescue tips.' },
  { id: 'planting', label: 'Planting', icon: Sprout, description: 'Gardening, crops, and food-production ideas.' },
  { id: 'building', label: 'Building', icon: Hammer, description: 'Construction, repairs, and DIY know-how.' },
  { id: 'uncensored', label: 'Uncensored', icon: ShieldAlert, description: 'Open, unfiltered exploration when needed.' },
];

const categoryLabels: Record<LLMCategory, string> = {
  general: 'General',
  coding: 'Code',
  medical: 'Medical',
  mathematics: 'Math',
  chemistry: 'Chemistry',
  uncensored: 'Uncensored',
  survival: 'Survival',
  planting: 'Planting',
  building: 'Building',
};

type QuickPrompt = {
  title: string;
  description: string;
  prompt: string;
};

const quickPromptsByCategory: Record<LLMCategory, QuickPrompt[]> = {
  general: [
    {
      title: 'Outage Checklist',
      description: 'Create a 10-minute response checklist for a home outage.',
      prompt: 'Create a 10-minute outage response checklist for a small home with no internet. Include safety, power, water, and communications.'
    },
    {
      title: 'Resource Triage',
      description: 'Prioritize supplies during a short-term outage.',
      prompt: 'Help me triage limited supplies for 48 hours without power: water, food, lighting, and communication.'
    },
    {
      title: 'Offline Brief',
      description: 'Turn notes into a short field brief.',
      prompt: 'Summarize these notes into a concise field brief with action items and open questions.'
    },
    {
      title: 'Comms Script',
      description: 'Write a short check-in script.',
      prompt: 'Write a short check-in script for safety status and immediate needs when the network is down.'
    },
  ],
  survival: [
    {
      title: 'Shelter Plan',
      description: 'Build a quick shelter plan with local materials.',
      prompt: 'Create a step-by-step shelter plan using tarp, cord, and nearby branches. Include site selection and weather checks.'
    },
    {
      title: 'Water Safety',
      description: 'Offline checklist for water collection and purification.',
      prompt: 'Provide a checklist for collecting and purifying water in the field with basic tools. Include safety warnings.'
    },
    {
      title: 'Signal & Rescue',
      description: 'Create a rescue signaling plan.',
      prompt: 'Draft a rescue signaling plan for daylight and night. Include visual, audio, and location marking steps.'
    },
    {
      title: '72-Hour Plan',
      description: 'Prioritize tasks for 72 hours offline.',
      prompt: 'Create a 72-hour survival task list prioritizing shelter, water, and heat with limited resources.'
    }
  ],
  medical: [
    {
      title: 'Bleeding Control',
      description: 'Immediate first-aid steps for bleeding.',
      prompt: 'Provide a first-aid checklist for heavy bleeding. Include what to avoid and when to escalate.'
    },
    {
      title: 'Burn Care',
      description: 'Offline burn response basics.',
      prompt: 'Give a step-by-step response for minor burns. Include cooling, dressing, and red flags.'
    },
    {
      title: 'Shock Protocol',
      description: 'Identify and respond to shock symptoms.',
      prompt: 'List signs of shock and the immediate response steps in a field setting.'
    },
    {
      title: 'Triage Notes',
      description: 'Structure patient notes quickly.',
      prompt: 'Create a simple triage note template for multiple patients when offline.'
    }
  ],
  building: [
    {
      title: 'Rapid Repair',
      description: 'Diagnose a failed tool or device.',
      prompt: 'Build a step-by-step repair plan for a device that will not power on. Assume basic tools only.'
    },
    {
      title: 'Structural Check',
      description: 'Quick safety inspection list.',
      prompt: 'Provide a quick structural safety inspection checklist for a damaged shed or small structure.'
    },
    {
      title: 'Material Plan',
      description: 'List what materials you need.',
      prompt: 'Create a materials and tools list for a temporary roof patch using common hardware store items.'
    },
    {
      title: 'Power Basics',
      description: 'Offline electrical safety checklist.',
      prompt: 'Provide an electrical safety checklist for diagnosing a tripped circuit without internet.'
    }
  ],
  planting: [
    {
      title: 'Soil Quick Test',
      description: 'Assess soil quickly in the field.',
      prompt: 'Describe a quick soil assessment process using simple tools. Include texture, drainage, and pH clues.'
    },
    {
      title: 'Watering Plan',
      description: 'Conserve water over 7 days.',
      prompt: 'Create a 7-day watering plan for a small garden with limited water.'
    },
    {
      title: 'Crop Triage',
      description: 'Prioritize crops during shortage.',
      prompt: 'Help me prioritize which crops to save during a water shortage and why.'
    },
    {
      title: 'Pest Response',
      description: 'Offline pest control checklist.',
      prompt: 'Provide a quick pest response checklist using safe, low-toxicity methods.'
    }
  ],
  coding: [
    {
      title: 'Bug Triage',
      description: 'Create a fast debug checklist.',
      prompt: 'Create a fast debug checklist for a failing script. Include environment, logs, and minimal repro steps.'
    },
    {
      title: 'Offline Patch',
      description: 'Draft a small patch plan.',
      prompt: 'Draft a minimal patch plan with risk assessment and rollback steps for a critical bug.'
    },
    {
      title: 'System Restore',
      description: 'Recover a broken build offline.',
      prompt: 'Provide a recovery plan for a broken build without internet access.'
    },
    {
      title: 'Log Summary',
      description: 'Summarize logs into root causes.',
      prompt: 'Summarize these logs into likely root causes and next diagnostic steps.'
    }
  ],
  mathematics: [
    {
      title: 'Quick Formula',
      description: 'Solve a formula and show steps.',
      prompt: 'Solve the following formula and show steps. Then provide a quick check for correctness.'
    },
    {
      title: 'Unit Conversion',
      description: 'Convert units in a table.',
      prompt: 'Convert this table of measurements from imperial to metric and show the converted values.'
    },
    {
      title: 'Estimate Check',
      description: 'Sanity-check a numeric result.',
      prompt: 'Estimate the result using back-of-the-envelope math and compare it to the given value.'
    },
    {
      title: 'Step-by-step',
      description: 'Explain a solution carefully.',
      prompt: 'Explain the solution step-by-step with clear reasoning and notation.'
    }
  ],
  chemistry: [
    {
      title: 'Reaction Safety',
      description: 'Safety checklist for a reaction.',
      prompt: 'Provide a safety checklist for a basic chemical reaction in a field or classroom setting.'
    },
    {
      title: 'Mixing Guide',
      description: 'Prepare a solution safely.',
      prompt: 'Describe how to prepare a simple solution safely, including dilution order and warnings.'
    },
    {
      title: 'Labeling',
      description: 'Create a container label template.',
      prompt: 'Create a container label template with required safety and storage fields.'
    },
    {
      title: 'Spill Response',
      description: 'Quick spill response steps.',
      prompt: 'Provide a quick spill response checklist for a small chemical spill.'
    }
  ],
  uncensored: [
    {
      title: 'Open Research',
      description: 'Explore a topic without filters.',
      prompt: 'Provide an unfiltered overview of this topic, including controversial angles and risks.'
    },
    {
      title: 'Freeform Ideas',
      description: 'Generate creative directions.',
      prompt: 'Generate a list of unconventional approaches to solve this problem.'
    },
    {
      title: 'Rapid Debate',
      description: 'Argue both sides quickly.',
      prompt: 'Present the strongest argument for and against this position in brief bullets.'
    },
    {
      title: 'Raw Notes',
      description: 'Turn raw notes into an outline.',
      prompt: 'Turn these raw notes into a structured outline without filtering.'
    }
  ],
};

// categoryColors removed as it was unused

const preferredModelIds: Partial<Record<LLMCategory, string[]>> = {
  general: ['qwen3-8b', 'qwen2.5-7b-q4', 'qwen2.5-1.5b-q4', 'qwen2.5-0.5b-q4'],
  coding: ['qwen2.5-coder-7b', 'deepseek-coder-6.7b'],
  medical: ['medichat-llama3-8b', 'openbio-llm-8b', 'medicine-llm-7b'],
  mathematics: ['qwen2.5-math-3b'],
};

  const isChatCategory = (value: string | null): value is ChatCategory => {
    if (!value) return false;
    return categoryCards.some(category => category.id === value);
  };

  const inferCategory = (text: string): LLMCategory => {
    const value = text.toLowerCase();
    if (/(code|coding|bug|error|stack|compile|build|git|javascript|typescript|python|rust|api|database|sql)/.test(value)) {
      return 'coding';
    }
    if (/(medical|symptom|injury|pain|first aid|bleeding|wound|medicine|fever)/.test(value)) {
      return 'medical';
    }
    if (/(math|equation|calculus|algebra|geometry|trigonometry|proof)/.test(value)) {
      return 'mathematics';
    }
    if (/(chemistry|chemical|reaction|molecule|compound|lab)/.test(value)) {
      return 'chemistry';
    }
    if (/(survival|wilderness|shelter|fire|water|rescue|signal|camp)/.test(value)) {
      return 'survival';
    }
    if (/(plant|garden|soil|seed|harvest|grow|crop|irrigat)/.test(value)) {
      return 'planting';
    }
    if (/(build|construction|repair|plumb|electrical|roof|lumber|shed|deck)/.test(value)) {
      return 'building';
    }
    return 'general';
  };

export function ChatPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { systemInfo, loading: systemLoading } = useSystemInfo();
  const { models, loading: modelsLoading } = useModels();
  const { status, loading: llmLoading, start } = useLLM();
  const {
    messages,
    loading: chatLoading,
    sendMessage,
    setMessages,
    loadChat,
    clearMessages,
    error: chatError,
    errorType,
    pendingMessage,
    clearPending,
    retryPending,
  } = useChat();
  const { profile, loading: profileLoading } = useProfile();
  const { chats, loading: chatsLoading, createChat, getChat, updateChat, deleteChat, refresh } = useChats();
  const { settings, updateSettings } = useSettings();
  const chatsRef = useRef(chats);

  const [selectedCategory, setSelectedCategory] = useState<ChatCategory>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.category);
    return isChatCategory(stored) ? stored : 'auto';
  });
  const [chatSearch, setChatSearch] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [, setCategoryLock] = useState<LLMCategory | null>(null);
  const [autoHint, setAutoHint] = useState<AutoHint | null>(null);

  useEffect(() => {
    if (activeChatId) {
      loadChat(activeChatId);
    } else {
      clearMessages();
    }
  }, [activeChatId, loadChat, clearMessages]);

  const [modelSelections, setModelSelections] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.modelSelections);
    if (!stored) return {};
    try {
      return JSON.parse(stored) as Record<string, string>;
    } catch {
      return {};
    }
  });

  const [showUnavailable] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.showUnavailable) === 'true';
  });
  const [showSandboxExplorer, setShowSandboxExplorer] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.showSandboxExplorer) === 'true';
  });
  const [inputValue, setInputValue] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [, setShowResetPrompt] = useState(false);
  const [visionMode, setVisionMode] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<{ label: string; reasoning: string; confidence: number } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(() => {
    const preferred = readStoredBoolean(STORAGE_KEYS.showLeftPanel, true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      return false;
    }
    return preferred;
  });
  const [showRightPanel, setShowRightPanel] = useState(() => {
    const preferred = readStoredBoolean(STORAGE_KEYS.showRightPanel, true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      return false;
    }
    return preferred;
  });
  const [showTopPanel, setShowTopPanel] = useState(() => readStoredBoolean(STORAGE_KEYS.showTopPanel, true));
  const [quickPromptOffsets, setQuickPromptOffsets] = useState<Record<string, number>>(() =>
    readStoredJson<Record<string, number>>(STORAGE_KEYS.quickPromptOffsets, {})
  );
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composerRaised, setComposerRaised] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleLoadingIds, setTitleLoadingIds] = useState<Record<string, boolean>>({});

  const isZenMode = !showLeftPanel && !showRightPanel && !showTopPanel;
  const explorerVisible = showSandboxExplorer || settings.advanced_mode;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncPanels = () => {
      if (mediaQuery.matches) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
        return;
      }

      setShowLeftPanel(readStoredBoolean(STORAGE_KEYS.showLeftPanel, true));
      setShowRightPanel(readStoredBoolean(STORAGE_KEYS.showRightPanel, true));
      setShowTopPanel(readStoredBoolean(STORAGE_KEYS.showTopPanel, true));
    };

    syncPanels();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncPanels);
    } else {
      mediaQuery.addListener(syncPanels);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', syncPanels);
      } else {
        mediaQuery.removeListener(syncPanels);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    writeStoredBoolean(STORAGE_KEYS.showLeftPanel, showLeftPanel);
  }, [showLeftPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    writeStoredBoolean(STORAGE_KEYS.showRightPanel, showRightPanel);
  }, [showRightPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    writeStoredBoolean(STORAGE_KEYS.showTopPanel, showTopPanel);
  }, [showTopPanel]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.quickPromptOffsets, quickPromptOffsets);
  }, [quickPromptOffsets]);

  const toggleZenMode = () => {
    const newState = !isZenMode;
    setShowLeftPanel(!newState);
    setShowRightPanel(!newState);
    setShowTopPanel(!newState);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastStartedModel = useRef<string | null>(null);
  const messagesCountRef = useRef(0);

  const ramAvailable = systemInfo?.ram_available_gb || 8;

  const availableModels = useMemo(() => {
    return models.filter(model => model.available !== false);
  }, [models]);

  const visibleModels = useMemo(() => {
    return showUnavailable ? models : availableModels;
  }, [availableModels, models, showUnavailable]);

  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const term = chatSearch.toLowerCase();
    return chats.filter(chat => (chat.title || '').toLowerCase().includes(term));
  }, [chats, chatSearch]);

  const compatibleModels = useMemo(() => {
    return availableModels.filter(model => model.min_ram_gb <= ramAvailable);
  }, [availableModels, ramAvailable]);

  const compatibleByCategory = useMemo(() => {
    const map: Record<LLMCategory, ModelInfo[]> = {
      general: [], coding: [], medical: [], mathematics: [], chemistry: [],
      uncensored: [], survival: [], planting: [], building: []
    };
    for (const model of compatibleModels) {
      map[model.category].push(model);
    }
    return map;
  }, [compatibleModels]);

  const recommendedByCategory = useMemo(() => {
    const result: Partial<Record<LLMCategory, string>> = {};
    (Object.keys(compatibleByCategory) as LLMCategory[]).forEach(category => {
      const candidates = compatibleByCategory[category];
      const fallback = compatibleByCategory.general;
      const selectionPool = candidates.length ? candidates : fallback;
      if (!selectionPool.length) return;
      const preferredIds = preferredModelIds[category];
      if (preferredIds) {
        const preferredMatch = preferredIds.find(id => selectionPool.some(model => model.id === id));
        if (preferredMatch) { result[category] = preferredMatch; return; }
      }
      const sorted = [...selectionPool].sort((a, b) => b.recommended_ctx - a.recommended_ctx);
      result[category] = sorted[0].id;
    });
    return result;
  }, [compatibleByCategory]);

  const defaultModelId = useMemo(() => {
    const stored = readStoredString(STORAGE_KEYS.defaultModelId);
    if (!stored) return null;
    return compatibleModels.some(model => model.id === stored) ? stored : null;
  }, [compatibleModels]);

  const resolvedAutoCategory: LLMCategory = autoHint?.applied ? autoHint.category : 'general';
  const activeCategory: LLMCategory = selectedCategory === 'auto' ? resolvedAutoCategory : selectedCategory;
  const storedModelId = modelSelections[activeCategory];
  const recommendedModelId = recommendedByCategory[activeCategory] || null;
  const activeModelId = storedModelId && compatibleModels.some(model => model.id === storedModelId)
    ? storedModelId
    : (defaultModelId || recommendedModelId);
  const activeModel = models.find(model => model.id === activeModelId) || null;

  const quickPromptRotation = useMemo(() => {
    const prompts = quickPromptsByCategory[activeCategory] || quickPromptsByCategory.general;
    if (prompts.length === 0) return prompts;
    const offset = quickPromptOffsets[activeCategory] ?? 0;
    const normalized = offset % prompts.length;
    return prompts.slice(normalized).concat(prompts.slice(0, normalized));
  }, [activeCategory, quickPromptOffsets]);

  const quickPrompts = useMemo(() => quickPromptRotation.slice(0, 4), [quickPromptRotation]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.category, selectedCategory); }, [selectedCategory]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.modelSelections, JSON.stringify(modelSelections)); }, [modelSelections]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.showUnavailable, String(showUnavailable)); }, [showUnavailable]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.showSandboxExplorer, String(showSandboxExplorer)); }, [showSandboxExplorer]);
  useEffect(() => {
    if (!messagesScrollRef.current) return;
    if (isAtBottom) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
      setUnreadCount(0);
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const applyChatSession = useCallback((chat: ChatSession) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages || []);
    setCategoryLock(chat.category_lock || null);
    setSelectedCategory(chat.category_lock ? (chat.category_lock as ChatCategory) : 'auto');
    setAutoHint(null);
  }, [setMessages]);

  const openChat = useCallback(async (chatId: string) => {
    const chat = await getChat(chatId);
    applyChatSession(chat);
  }, [applyChatSession, getChat]);

  const handleNewChat = useCallback(async () => {
    const chat = await createChat();
    applyChatSession(chat);
    setShowResetPrompt(false);
    await refresh();
  }, [applyChatSession, createChat, refresh]);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) navigate('/onboarding');
  }, [navigate, profile, profileLoading]);

  useEffect(() => {
    if (chatsLoading) return;
    if (!activeChatId) {
      if (chats.length > 0) openChat(chats[0].id).catch(() => null);
      else handleNewChat().catch(() => null);
    }
  }, [activeChatId, chats, chatsLoading, handleNewChat, openChat]);

  useEffect(() => {
    if (modelsLoading || systemLoading) return;
    if (!activeModelId) { setInitializing(false); return; }
    if (status.running && status.model_id === activeModelId) { setInitializing(false); return; }
    if (lastStartedModel.current === activeModelId && llmLoading) return;
    lastStartedModel.current = activeModelId;
    start(activeModelId).finally(() => setInitializing(false));
  }, [activeModelId, llmLoading, modelsLoading, start, status.model_id, status.running, systemLoading]);

  const handlePickSandbox = async () => {
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'pick_folder' }),
      });
      const data = await response.json();
      if (data.success && data.result) {
        updateSettings({ sandbox_root: data.result as string });
        return;
      }
      const manual = window.prompt('Enter workspace folder path:', settings.sandbox_root);
      if (manual) updateSettings({ sandbox_root: manual.trim() });
    } catch (err) {
      console.error('Failed to pick folder:', err);
      const manual = window.prompt('Enter workspace folder path:', settings.sandbox_root);
      if (manual) updateSettings({ sandbox_root: manual.trim() });
    }
  };

  const handlePickFile = async () => {
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'pick_file' }),
      });
      const data = await response.json();
      if (data.success && data.result) {
        setInputValue(prev => `${prev}\n[File: ${data.result}]`);
        return;
      }
      const manual = window.prompt('Enter file path to attach:');
      if (manual) setInputValue(prev => `${prev}\n[File: ${manual.trim()}]`);
    } catch (err) {
      console.error('Failed to pick file:', err);
      const manual = window.prompt('Enter file path to attach:');
      if (manual) setInputValue(prev => `${prev}\n[File: ${manual.trim()}]`);
    }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || chatLoading) return;
    setInputValue('');
    setShowResetPrompt(false);
    let chatId = activeChatId;
    let chatTitle = chats.find(chat => chat.id === chatId)?.title || '';
    if (!chatId) {
      const chat = await createChat();
      applyChatSession(chat);
      chatId = chat.id;
      chatTitle = chat.title || '';
    }
    const isDefaultTitle = !chatTitle.trim() || chatTitle.trim().toLowerCase() === 'new chat';
    const shouldGenerateTitle = messages.length === 0 && !!chatId && isDefaultTitle;
    let categoryToSend = activeCategory;
    if (selectedCategory === 'auto') {
      const inferred = inferCategory(trimmed);
      setAutoHint({ category: inferred, confidence: 0.7, applied: true });
      categoryToSend = inferred;

      const inferredStored = modelSelections[inferred];
      const inferredRecommended = recommendedByCategory[inferred] || null;
      const inferredModelId = inferredStored && compatibleModels.some(model => model.id === inferredStored)
        ? inferredStored
        : inferredRecommended;

      if (inferredModelId && (!status.running || status.model_id !== inferredModelId)) {
        await start(inferredModelId);
      }
    }
    await sendMessage(trimmed, categoryToSend, chatId || undefined);
    await refresh();
    if (chatId && shouldGenerateTitle) {
      void requestChatTitle(chatId, trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const updateComposerHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 180);
    el.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    updateComposerHeight();
  }, [inputValue, updateComposerHeight]);

  const handleScrollMessages = () => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distance < 140;
    setIsAtBottom(atBottom);
    setShowJump(distance > 320);
    setComposerRaised(container.scrollTop > 8);
    if (atBottom) setUnreadCount(0);
  };

  const scrollToBottom = useCallback(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    setIsAtBottom(true);
    setShowJump(false);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (messages.length > messagesCountRef.current) {
      if (!isAtBottom) {
        setUnreadCount(count => count + (messages.length - messagesCountRef.current));
        setShowJump(true);
      }
      messagesCountRef.current = messages.length;
    }
  }, [messages.length, isAtBottom]);

  const handleAutoStart = useCallback(async () => {
    if (!activeModelId || llmLoading) return;
    await start(activeModelId);
    await retryPending();
  }, [activeModelId, llmLoading, retryPending, start]);

  const handleClearPending = useCallback(() => {
    clearPending();
    setInputValue('');
  }, [clearPending]);

  const handleCategoryChange = (category: ChatCategory) => {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
    setAutoHint(null);
    const lock = category === 'auto' ? null : category as LLMCategory;
    setCategoryLock(lock);
    if (activeChatId) updateChat(activeChatId, { category_lock: lock }).catch(() => null);
    if (messages.length > 0) setShowResetPrompt(true);
  };

  const handleModelSelect = (modelId: string) => {
    setModelSelections(prev => ({ ...prev, [activeCategory]: modelId }));
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    setQuickPromptOffsets(prev => {
      const prompts = quickPromptsByCategory[activeCategory] || quickPromptsByCategory.general;
      if (!prompts.length) return prev;
      const currentOffset = prev[activeCategory] ?? 0;
      const nextOffset = (currentOffset + 1) % prompts.length;
      return { ...prev, [activeCategory]: nextOffset };
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSelectChat = (chat: ChatSummary) => {
    if (chat.id === activeChatId) return;
    openChat(chat.id).catch(() => null);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (activeChatId === chatId) {
      setActiveChatId(null); setMessages([]); handleNewChat().catch(() => null);
    }
  };

  const formatChatTime = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const updateTitleLoading = useCallback((chatId: string, loading: boolean) => {
    setTitleLoadingIds(prev => {
      const next = { ...prev };
      if (loading) next[chatId] = true;
      else delete next[chatId];
      return next;
    });
  }, []);

  const requestChatTitle = useCallback(async (chatId: string, message: string) => {
    updateTitleLoading(chatId, true);
    try {
      const response = await fetch('/api/chats/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, words: 5 }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate title');
      }
      const data = (await response.json()) as { title?: string };
      const generatedTitle = data.title?.trim();
      const currentTitle = chatsRef.current.find(chat => chat.id === chatId)?.title || '';
      const isDefaultTitle = !currentTitle.trim() || currentTitle.trim().toLowerCase() === 'new chat';
      if (generatedTitle && isDefaultTitle) {
        await updateChat(chatId, { title: generatedTitle });
      }
    } catch (err) {
      console.error('Failed to auto-title chat:', err);
    } finally {
      updateTitleLoading(chatId, false);
    }
  }, [updateChat, updateTitleLoading]);

  const handleStartTitleEdit = (chat: ChatSummary) => {
    setEditingChatId(chat.id);
    const initial = chat.title && chat.title.toLowerCase() !== 'new chat' ? chat.title : '';
    setTitleDraft(initial);
  };

  const handleCancelTitleEdit = () => {
    setEditingChatId(null);
    setTitleDraft('');
  };

  const handleSaveTitleEdit = async (chatId: string) => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      handleCancelTitleEdit();
      return;
    }
    updateTitleLoading(chatId, true);
    try {
      await updateChat(chatId, { title: trimmed });
    } catch (err) {
      console.error('Failed to update title:', err);
    } finally {
      updateTitleLoading(chatId, false);
      handleCancelTitleEdit();
    }
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, chatId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSaveTitleEdit(chatId);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelTitleEdit();
    }
  };

  const renderChatItem = (chat: ChatSummary) => {
    const isActive = activeChatId === chat.id;
    const isEditing = editingChatId === chat.id;
    const isTitleLoading = !!titleLoadingIds[chat.id];
    const titleText = isTitleLoading ? 'Generating title...' : (chat.title || 'New chat');

    return (
      <div key={chat.id} className="relative group">
        {isEditing ? (
          <div className={`w-full text-left px-2.5 py-2 pr-12 rounded-lg border transition-all ${isActive ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30' : 'bg-[var(--glass)] border-[var(--border)]'}`}>
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onKeyDown={(event) => handleTitleKeyDown(event, chat.id)}
              placeholder="Enter title"
              className="w-full bg-transparent border-0 text-sm font-semibold focus:outline-none"
              autoFocus
            />
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
              <span>{formatChatTime(chat.updated_at)}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--muted)]/60" />
              <span>{chat.message_count} msgs</span>
            </div>
          </div>
        ) : (
          <button onClick={() => handleSelectChat(chat)} className={`w-full text-left px-2.5 py-2 pr-12 rounded-lg border transition-all ${isActive ? 'bg-[#1f6d5a]/10 border-[#1f6d5a]/30' : 'bg-[var(--glass)] border-[var(--border)]'}`}>
            <div className="flex items-center gap-2">
              {isTitleLoading && <Loader2 className="w-3.5 h-3.5 text-[#1f6d5a] animate-spin" />}
              <div className="text-sm font-semibold truncate">{titleText}</div>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
              <span>{formatChatTime(chat.updated_at)}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--muted)]/60" />
              <span>{chat.message_count} msgs</span>
            </div>
          </button>
        )}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSaveTitleEdit(chat.id)}
                disabled={isTitleLoading}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--glass-strong)] disabled:opacity-40"
                title="Save title"
              >
                <Check className="w-3.5 h-3.5 text-[#1f6d5a]" />
              </button>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCancelTitleEdit}
                disabled={isTitleLoading}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--glass-strong)] disabled:opacity-40"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleStartTitleEdit(chat)}
                disabled={isTitleLoading}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--glass-strong)] disabled:opacity-40"
                title="Edit title"
              >
                <Pencil className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>
              <button onClick={() => handleDeleteChat(chat.id)} className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--glass-strong)]">
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    setCapturedImage(imageSrc);
    setVisionAnalysis(null);
    setAnalyzing(true);
    try {
      const blob = await fetch(imageSrc).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob);
      const response = await fetch('/api/vision/analyze', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setVisionAnalysis({ label: data.label, reasoning: data.reasoning, confidence: data.confidence });
      }
    } catch (err) { console.error('Vision analysis failed:', err); }
    finally { setAnalyzing(false); }
  }, []);

  const handleClearCapture = useCallback(() => {
    setCapturedImage(null);
    setVisionAnalysis(null);
  }, []);

  const handleAskFromVision = useCallback(() => {
    if (!visionAnalysis) return;
    setInputValue(`Tell me more about ${visionAnalysis.label}.`);
    setVisionMode(false);
  }, [visionAnalysis]);

  const handleVoiceToggle = useCallback(async () => {
    if (recording) { mediaRecorderRef.current?.stop(); setRecording(false); }
    else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('audio', audioBlob);
          try {
            const response = await fetch('/api/voice/stt', { method: 'POST', body: formData });
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.text) setInputValue(data.text);
            }
          } catch (err) { console.error('STT failed:', err); }
          stream.getTracks().forEach(t => t.stop());
        };
        recorder.start(); setRecording(true);
      } catch (err) { console.error('Microphone access denied:', err); }
    }
  }, [recording]);

  if (initializing || modelsLoading || systemLoading || profileLoading || chatsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[var(--paper)]">
        <Loader2 className="w-16 h-16 text-[#1f6d5a] animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-[var(--ink)] font-serif">Initializing IRIS...</h2>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch min-w-0 min-h-0 bg-transparent overflow-hidden gap-3 sm:gap-4 md:gap-5 lg:gap-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {showLeftPanel && (
        <aside className="hidden lg:flex w-[clamp(8.5rem,12vw,11rem)] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md flex-col animate-heritage shrink-0 overflow-hidden rounded-2xl shadow-[0_12px_30px_rgba(45,42,35,0.08)]">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2 bg-[var(--glass-strong)]">
            <h2 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-[0.2em] font-mono whitespace-nowrap">
              {t('chat.chats', 'Chats')}
            </h2>
            <button onClick={() => handleNewChat()} className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--glass-strong)] hover:bg-[var(--paper-2)] transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--paper)] px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder={t('chat.search', 'Search')}
                className="w-full bg-transparent border-0 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--muted)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredChats.map(renderChatItem)}
          </div>
        </aside>
      )}

      <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--glass)] border border-[var(--border)] rounded-3xl shadow-[0_20px_60px_rgba(45,42,35,0.08)] overflow-hidden">
        <header className="relative z-30 bg-[var(--glass-strong)] backdrop-blur-md border-b border-[var(--border)] px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
            <button onClick={() => navigate('/')} className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:text-[#1f6d5a] hover:bg-[var(--paper-2)] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div className="px-4 py-2.5 rounded-lg border bg-[#1f6d5a]/5 border-[#1f6d5a]/20 text-[#1f6d5a] text-sm font-bold uppercase tracking-widest font-mono">
              {selectedCategory === 'auto' ? 'Auto' : categoryLabels[activeCategory]}
            </div>
            <div className="min-w-0 w-[min(360px,55vw)]">
              <ModelSelector
                models={visibleModels}
                selectedModelId={activeModelId}
                onSelect={handleModelSelect}
                ramAvailable={ramAvailable}
                categoryFilter={activeCategory}
                showUnavailable={showUnavailable}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowLeftPanel(!showLeftPanel)} className={`h-11 w-11 inline-flex items-center justify-center rounded-lg ${showLeftPanel ? 'bg-[#1f6d5a]/10 text-[#1f6d5a]' : 'text-[var(--muted)]'}`}><PanelLeft className="w-5 h-5" /></button>
            <button onClick={() => setShowTopPanel(!showTopPanel)} className={`h-11 w-11 inline-flex items-center justify-center rounded-lg ${showTopPanel ? 'bg-[#1f6d5a]/10 text-[#1f6d5a]' : 'text-[var(--muted)]'}`}><PanelTop className="w-5 h-5" /></button>
            <button onClick={() => setShowRightPanel(!showRightPanel)} className={`h-11 w-11 inline-flex items-center justify-center rounded-lg ${showRightPanel ? 'bg-[#1f6d5a]/10 text-[#1f6d5a]' : 'text-[var(--muted)]'}`}><PanelRight className="w-5 h-5" /></button>
            <button onClick={toggleZenMode} className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-[var(--muted)]">{isZenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full border border-[#1f6d5a]/25 bg-[#1f6d5a]/10 text-[#1f6d5a] text-[10px] font-bold uppercase tracking-widest font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('chat.offline', 'Offline')}
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--glass-strong)] rounded-full border border-[var(--border)] ml-2">
              <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-[#1f6d5a] animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-sm font-bold uppercase font-mono">
                {status.running ? t('chat.ready', 'Ready') : t('chat.calibrating', 'Calibrating')}
              </span>
            </div>
          </div>
        </header>

        {showTopPanel && (
          <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[var(--paper)]/60 flex flex-col gap-4">
            <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] font-mono">
              {t('chat.categories', 'Categories')}
            </div>
            <button
              onClick={() => setShowTopPanel(false)}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[#1f6d5a]"
            >
              {t('chat.hide', 'Hide')}
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            </div>
            <CategoryGrid
              categories={categoryCards}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        )}

        <div
          ref={messagesScrollRef}
          onScroll={handleScrollMessages}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 md:px-5 lg:px-6 py-6 sm:py-8 md:py-10 space-y-4 sm:space-y-6 md:space-y-8 bg-[var(--paper)]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <img src="/logo.jpg" alt="IRIS" className="w-24 h-24 rounded-2xl grayscale" />
                <div className="text-xl font-serif italic uppercase tracking-widest text-[var(--muted)]">IRIS • Project Command</div>
              </div>
              <div className="max-w-2xl w-full">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] font-mono">
                  {t('chat.quickPromptsTitle', 'Offline quick prompts')}
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  {t('chat.quickPromptsSubtitle', 'Tap one to preload a question and get moving.')}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickPrompts.map((item, index) => (
                    <button
                      key={item.title}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className={`text-left rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] p-4 hover:border-[#1f6d5a]/40 hover:bg-[#1f6d5a]/5 transition-all ${index >= 2 ? 'hidden sm:block' : ''}`}
                    >
                      <div className="text-sm font-bold text-[var(--ink)]">{item.title}</div>
                      <div className="mt-2 text-xs text-[var(--muted)] leading-relaxed">{item.description}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-center">
                  <button
                    onClick={() => navigate('/guides')}
                    className="px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[#1f6d5a] hover:border-[#1f6d5a]/40 transition-all"
                  >
                    {t('chat.openGuides', 'Open Guides')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => <ChatMessage key={idx} message={msg} timestamp={msg.timestamp} />)
          )}
          {chatLoading && <div className="flex gap-4 animate-pulse"><div className="w-10 h-10 bg-[var(--glass-strong)] rounded-xl" /><div className="flex-1 h-12 bg-[var(--glass-strong)] rounded-xl" /></div>}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className={`p-3 sm:p-4 md:p-5 lg:p-6 pt-0 bg-[var(--paper)] border-t border-[var(--border)] shrink-0 ${composerRaised ? 'shadow-[0_-10px_25px_rgba(45,42,35,0.12)]' : ''}`}>
          {errorType === 'llm_not_running' && (
            <div className="mb-4 border border-amber-500/30 bg-amber-500/10 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-mono text-amber-700">
                LLM offline. {chatError || 'Start the active model to send the pending message.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoStart}
                  disabled={!activeModelId || llmLoading || !pendingMessage}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {llmLoading ? 'Starting' : 'Auto-start'}
                </button>
                <button
                  onClick={handleClearPending}
                  disabled={!pendingMessage}
                  className="px-3 py-2 rounded-lg border border-amber-600/40 text-amber-700 text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Prompt
                </button>
              </div>
            </div>
          )}
          {showJump && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={scrollToBottom}
                className="px-4 py-2 rounded-full border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-sm font-bold uppercase tracking-widest"
              >
                Jump to latest {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
            </div>
          )}
          {capturedImage && (
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-strong)] p-3 shadow-inner">
              <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-[var(--border)]">
                <img src={capturedImage} alt="Captured frame" className="w-full h-full object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-mono uppercase tracking-widest text-white">
                    Analyzing
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-mono uppercase tracking-[0.3em] text-[var(--muted)]">Vision Capture</div>
                <div className="text-sm font-serif italic text-[var(--ink)]">
                  {visionAnalysis ? visionAnalysis.label : 'Frame ready for scan'}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {visionAnalysis ? `Confidence ${Math.round(visionAnalysis.confidence * 100)}%` : 'Open Vision to reframe or recapture.'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVisionMode(true)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass)] text-sm font-bold uppercase tracking-widest text-[#1f6d5a] hover:bg-[var(--paper-2)] transition-all"
                >
                  Review
                </button>
                {visionAnalysis && (
                  <button
                    onClick={handleAskFromVision}
                    className="px-3 py-2 rounded-xl bg-[#1f6d5a] text-white text-sm font-bold uppercase tracking-widest hover:bg-[#1a5c4c] transition-all"
                  >
                    Ask IRIS
                  </button>
                )}
                <button
                  onClick={handleClearCapture}
                  className="p-2 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[#1f6d5a] transition-all"
                  aria-label="Clear captured frame"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="bg-[var(--glass-strong)] border border-[var(--border)] p-3 rounded-2xl flex flex-wrap gap-2.5 items-center shadow-xl">
            <button onClick={() => handleNewChat()} className="h-12 w-12 inline-flex items-center justify-center bg-[var(--glass-strong)] border border-[var(--border)] rounded-xl hover:bg-[var(--paper-2)] transition-all"><Plus className="w-5 h-5" /></button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER COMMAND..."
              rows={1}
              className="flex-1 bg-transparent border-0 px-3 py-2 text-[var(--ink)] font-mono text-base focus:outline-none resize-none max-h-[180px] overflow-y-auto"
            />
            <button
              onClick={() => setVisionMode(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass)] text-sm font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[#1f6d5a] hover:border-[#1f6d5a]/40 transition-all"
              aria-label="Open vision capture"
            >
              <Camera className="w-4 h-4" />
              Vision
            </button>
            <button onClick={handleVoiceToggle} className={`h-12 w-12 inline-flex items-center justify-center transition-all ${recording ? 'text-red-500 animate-pulse' : 'text-[var(--muted)]'}`}><Mic className="w-5 h-5" /></button>
            <button onClick={handlePickFile} className="h-12 w-12 inline-flex items-center justify-center text-[var(--muted)] hover:text-[#1f6d5a] transition-all" title="Insert File"><Plus className="w-5 h-5" /></button>
            <button onClick={handleSend} disabled={!inputValue.trim() || chatLoading} className="px-6 py-3.5 bg-[#1f6d5a] hover:bg-[#1a5c4c] text-white rounded-xl shadow-lg transition-all"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </section>

      {showRightPanel && (
        <aside className="hidden lg:flex w-[clamp(14rem,20vw,18rem)] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md flex-col p-6 space-y-8 animate-heritage overflow-y-auto shrink-0 min-w-0 rounded-2xl shadow-[0_12px_30px_rgba(45,42,35,0.08)]">
          <div>
            <div className="text-sm font-mono font-bold uppercase opacity-50 mb-3 tracking-widest">Operator Settings</div>
            <div className="text-xl font-serif font-bold italic">{profile?.name || 'IRIS_USER'}</div>
          </div>
          <div className="pt-4 border-t border-[var(--border)]">
            <div className="text-sm font-mono font-bold uppercase opacity-50 mb-4 tracking-widest flex items-center justify-between">
              <span>{settings.advanced_mode ? 'Workspace Explorer' : 'Safe Sandbox'}</span>
              <button
                onClick={() => setShowSandboxExplorer(!showSandboxExplorer)}
                className="text-[var(--muted)] hover:text-[#1f6d5a] transition-all"
                title="Toggle visual explorer"
              >
                <Layout className="w-4 h-4" />
              </button>
            </div>
            <button onClick={handlePickSandbox} className="w-full text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] hover:bg-[var(--paper-2)] transition-all group mb-4">
              <div className="flex items-center gap-3 mb-2">
                <FolderSearch className="w-5 h-5 text-[#1f6d5a]" />
                <span className="text-sm font-bold uppercase text-[#1f6d5a]">Select Workspace</span>
              </div>
              <div className="text-sm font-mono opacity-70 truncate">{settings.sandbox_root}</div>
            </button>
            {settings.advanced_mode && settings.sandbox_root === '.' && (
              <div className="mb-3 text-sm font-mono uppercase text-amber-700">
                Advanced mode needs a workspace root. Pick a folder to enable the explorer.
              </div>
            )}
            {explorerVisible && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-4">
                <FileExplorer
                  rootPath={settings.sandbox_root}
                  currentPath={settings.sandbox_root}
                  onSelect={(path) => updateSettings({ sandbox_root: path })}
                  onOpenFile={(path) => setActiveFile(path)}
                />
                <FileEditor
                  filePath={activeFile}
                  rootPath={settings.sandbox_root}
                  onClose={() => setActiveFile(null)}
                />
              </div>
            )}
          </div>
          {settings.advanced_mode && activeModel && (
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="text-sm font-mono font-bold uppercase opacity-50 mb-3 tracking-widest">Deployment Hardare</div>
              <div className="text-sm font-bold mb-1">{activeModel.display_name}</div>
              <div className="text-sm font-mono opacity-60 leading-tight">ID: {activeModel.id}<br />RAM: {activeModel.min_ram_gb}GB</div>
            </div>
          )}
        </aside>
      )}

      {showLeftPanel && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            onClick={() => setShowLeftPanel(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close conversations panel"
          />
          <aside className="absolute left-0 top-0 h-full w-[88vw] max-w-sm max-h-[calc(100vh-40px)] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md flex flex-col overflow-y-auto shadow-[0_12px_30px_rgba(45,42,35,0.2)]">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-2 bg-[var(--glass-strong)]">
            <h2 className="text-[11px] font-bold text-[var(--ink)] uppercase tracking-[0.2em] font-mono whitespace-nowrap">
              {t('chat.chats', 'Chats')}
            </h2>
            <button onClick={() => handleNewChat()} className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--glass-strong)] hover:bg-[var(--paper-2)] transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--paper)] px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
              <input
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder={t('chat.search', 'Search')}
                className="w-full bg-transparent border-0 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--muted)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredChats.map(renderChatItem)}
          </div>
          </aside>
        </div>
      )}

      {showRightPanel && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            onClick={() => setShowRightPanel(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close workspace panel"
          />
          <aside className="absolute right-0 top-0 h-full w-[85vw] max-w-[360px] max-h-[calc(100vh-40px)] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-md flex flex-col p-6 space-y-8 overflow-y-auto shadow-[0_12px_30px_rgba(45,42,35,0.2)]">
            <div>
              <div className="text-sm font-mono font-bold uppercase opacity-50 mb-3 tracking-widest">Operator Settings</div>
              <div className="text-xl font-serif font-bold italic">{profile?.name || 'IRIS_USER'}</div>
            </div>
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="text-sm font-mono font-bold uppercase opacity-50 mb-4 tracking-widest flex items-center justify-between">
                <span>{settings.advanced_mode ? 'Workspace Explorer' : 'Safe Sandbox'}</span>
                <button
                  onClick={() => setShowSandboxExplorer(!showSandboxExplorer)}
                  className="text-[var(--muted)] hover:text-[#1f6d5a] transition-all"
                  title="Toggle visual explorer"
                >
                  <Layout className="w-4 h-4" />
                </button>
              </div>
              <button onClick={handlePickSandbox} className="w-full text-left p-4 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] hover:bg-[var(--paper-2)] transition-all group mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <FolderSearch className="w-5 h-5 text-[#1f6d5a]" />
                  <span className="text-sm font-bold uppercase text-[#1f6d5a]">Select Workspace</span>
                </div>
                <div className="text-sm font-mono opacity-70 truncate">{settings.sandbox_root}</div>
              </button>
              {settings.advanced_mode && settings.sandbox_root === '.' && (
                <div className="mb-3 text-sm font-mono uppercase text-amber-700">
                  Advanced mode needs a workspace root. Pick a folder to enable the explorer.
                </div>
              )}
              {explorerVisible && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-4">
                  <FileExplorer
                    rootPath={settings.sandbox_root}
                    currentPath={settings.sandbox_root}
                    onSelect={(path) => updateSettings({ sandbox_root: path })}
                    onOpenFile={(path) => setActiveFile(path)}
                  />
                  <FileEditor
                    filePath={activeFile}
                    rootPath={settings.sandbox_root}
                    onClose={() => setActiveFile(null)}
                  />
                </div>
              )}
            </div>
            {settings.advanced_mode && activeModel && (
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="text-sm font-mono font-bold uppercase opacity-50 mb-3 tracking-widest">Deployment Hardare</div>
                <div className="text-sm font-bold mb-1">{activeModel.display_name}</div>
                <div className="text-sm font-mono opacity-60 leading-tight">ID: {activeModel.id}<br />RAM: {activeModel.min_ram_gb}GB</div>
              </div>
            )}
          </aside>
        </div>
      )}

      {visionMode && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--glass)] shadow-[0_30px_80px_rgba(15,14,10,0.35)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--glass-strong)]">
              <div>
                <div className="text-sm font-mono uppercase tracking-[0.3em] text-[var(--muted)]">Vision Capture</div>
                <div className="text-xl font-serif italic text-[var(--ink)]">Field Camera</div>
              </div>
              <button
                onClick={() => setVisionMode(false)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--glass)] text-[var(--muted)] hover:text-[#1f6d5a] transition-all"
                aria-label="Close vision capture"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid lg:grid-cols-[1.6fr,1fr]">
              <div className="relative bg-black/80 min-h-[260px]">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/70 text-sm font-mono uppercase tracking-widest text-white border border-white/20">
                  Live Feed
                </div>
                {analyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="px-4 py-2 rounded-full border border-white/20 bg-black/70 text-sm font-mono uppercase tracking-widest text-white">
                      Analyzing
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-[var(--paper)]/70 border-t border-[var(--border)] lg:border-t-0 lg:border-l space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-strong)] p-4">
                  <div className="text-sm font-mono uppercase tracking-[0.3em] text-[var(--muted)] mb-2">Guidance</div>
                  <div className="text-base text-[var(--ink)]">Center the subject, keep it steady, then capture a frame for IRIS to scan.</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-strong)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-mono uppercase tracking-[0.3em] text-[var(--muted)]">Captured Frame</div>
                    {capturedImage && (
                      <div className="text-sm font-mono uppercase text-[#1f6d5a] flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ready
                      </div>
                    )}
                  </div>
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--paper)]">
                    {capturedImage ? (
                      <img src={capturedImage} alt="Captured frame" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-mono uppercase tracking-widest text-[var(--muted)]">
                        No frame yet
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-strong)] p-4 min-h-[140px]">
                  <div className="text-sm font-mono uppercase tracking-[0.3em] text-[var(--muted)] mb-2">Scan Results</div>
                  {visionAnalysis ? (
                    <>
                      <div className="text-lg font-serif italic text-[var(--ink)] mb-1">{visionAnalysis.label}</div>
                      <div className="text-sm text-[var(--muted)] mb-3">Confidence {Math.round(visionAnalysis.confidence * 100)}%</div>
                      <div className="text-base text-[var(--ink)] opacity-80">{visionAnalysis.reasoning}</div>
                    </>
                  ) : (
                    <div className="text-base text-[var(--muted)]">Capture a frame to see identification details.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--glass-strong)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCapture}
                  disabled={analyzing}
                  className="px-6 py-3 rounded-full bg-[#1f6d5a] text-white text-sm font-bold uppercase tracking-widest shadow-lg hover:bg-[#1a5c4c] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? 'Analyzing...' : 'Capture Frame'}
                </button>
                <button
                  onClick={handleClearCapture}
                  disabled={!capturedImage && !visionAnalysis}
                  className="px-4 py-3 rounded-full border border-[var(--border)] text-sm font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[#1f6d5a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </span>
                </button>
              </div>
              {visionAnalysis && (
                <button
                  onClick={handleAskFromVision}
                  className="px-5 py-3 rounded-full border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-sm font-bold uppercase tracking-widest hover:bg-[#1f6d5a]/20 transition-all"
                >
                  Ask IRIS about this
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
