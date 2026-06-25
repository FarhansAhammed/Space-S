"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  GitBranch,
  Layers,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Search,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvasStore';
import { MarkdownRenderer } from './MarkdownRenderer';

type BranchOperation = 'explain' | 'expand' | 'shorten';

const getInitialPinnedChats = () => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem('spaceS_pinnedChatIds');
    return saved ? JSON.parse(saved) as string[] : [];
  } catch {
    return [];
  }
};

export const ChatWorkspace = () => {
  const user = useUser().user;
  const {
    nodes,
    activeParentChatId,
    setActiveParentChatId,
    openBranchTabs,
    activeBranchTabId,
    setActiveBranchTabId,
    hoveredBranchTabId,
    setHoveredBranchTabId,
    removeBranchTab,
    createBranchFromChat,
    continueNodeConversation,
    addLLMNodeFromSearch
  } = useCanvasStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threadSearch, setThreadSearch] = useState('');
  const [showThreadDropdown, setShowThreadDropdown] = useState(false);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(getInitialPinnedChats);
  const [parentInput, setParentInput] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedMsgIndex, setSelectedMsgIndex] = useState<number | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [mobilePanelIndex, setMobilePanelIndex] = useState(0);

  const parentScrollRef = useRef<HTMLDivElement>(null);
  const branchScrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const parentThreads = useMemo(() => (
    nodes
      .filter(n => !n.data.parentNodeId && n.data.type === 'llm')
      .sort((a, b) => {
        const aPinned = pinnedChatIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedChatIds.includes(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        const timeA = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
        const timeB = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
        return timeB - timeA;
      })
  ), [nodes, pinnedChatIds]);

  const filteredThreads = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) return parentThreads;

    return parentThreads.filter(thread => {
      const title = thread.data.title?.toLowerCase() || '';
      const content = thread.data.content?.toLowerCase() || '';
      return title.includes(query) || content.includes(query);
    });
  }, [parentThreads, threadSearch]);

  const activeParentNode = nodes.find(n => n.id === activeParentChatId) || parentThreads[0];
  const activeBranchTab = openBranchTabs.find(t => t.id === activeBranchTabId);
  const activeBranchNode = nodes.find(n => n.id === activeBranchTabId);
  const hasBranchWorkspace = openBranchTabs.length > 0;

  useEffect(() => {
    if (!activeParentChatId && activeParentNode) {
      setActiveParentChatId(activeParentNode.id);
    }
  }, [activeParentChatId, activeParentNode, setActiveParentChatId]);

  useEffect(() => {
    window.localStorage.setItem('spaceS_pinnedChatIds', JSON.stringify(pinnedChatIds));
  }, [pinnedChatIds]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    parentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeParentNode?.data.conversationHistory, activeParentNode?.data.isLoading]);

  useEffect(() => {
    branchScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeBranchNode?.data.conversationHistory, activeBranchNode?.data.isLoading]);

  useEffect(() => {
    if (!hasBranchWorkspace) {
      setMobilePanelIndex(0);
    }
  }, [hasBranchWorkspace]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionPosition(null);
        setSelectedText('');
        setSelectedMsgIndex(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length > 500) {
        setSelectionPosition(null);
        return;
      }

      const anchorElement = selection.anchorNode?.parentElement;
      const messageContainer = anchorElement?.closest('.ai-response-message');
      if (!messageContainer) {
        setSelectionPosition(null);
        return;
      }

      const msgIndexAttr = messageContainer.getAttribute('data-message-index');
      if (msgIndexAttr === null) return;

      try {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        setSelectionPosition({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: (isMobile ? rect.bottom + 10 : rect.top - 46) + window.scrollY
        });
        setSelectedText(text);
        setSelectedMsgIndex(parseInt(msgIndexAttr, 10));
      } catch {
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const togglePinnedChat = (chatId: string) => {
    setPinnedChatIds(current =>
      current.includes(chatId)
        ? current.filter(id => id !== chatId)
        : [chatId, ...current]
    );
  };

  const selectThread = (threadId: string) => {
    setActiveParentChatId(threadId);
    setShowThreadDropdown(false);
    setMobilePanelIndex(0);
  };

  const handleAskInNewBranch = (e: React.MouseEvent, operation: BranchOperation) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeParentNode || selectedMsgIndex === null || !selectedText) return;

    createBranchFromChat(activeParentNode.id, selectedMsgIndex, selectedText, operation).catch(err => {
      console.error('Failed to create branch from chat:', err);
    });

    window.getSelection()?.removeAllRanges();
    setSelectionPosition(null);
    setMobilePanelIndex(1);
  };

  const handleSendParent = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = parentInput.trim();
    if (!prompt) return;

    if (activeParentNode) {
      continueNodeConversation(activeParentNode.id, prompt);
    } else {
      addLLMNodeFromSearch(prompt);
    }
    setParentInput('');
  };

  const handleSendBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = branchInput.trim();
    if (!prompt || !activeBranchNode || activeBranchNode.data.isLoading) return;

    continueNodeConversation(activeBranchNode.id, prompt);
    setBranchInput('');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0 && hasBranchWorkspace) {
      setMobilePanelIndex(1);
    } else if (deltaX > 0) {
      setMobilePanelIndex(0);
    }
  };

  const renderMessageList = (
    node: typeof activeParentNode,
    endRef: React.RefObject<HTMLDivElement>,
    options?: { branchTab?: typeof activeBranchTab }
  ) => {
    if (!node || node.data.conversationHistory.length === 0) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center text-center select-none px-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/50 bg-white/70 text-[#7c4dff] shadow-[0_18px_44px_-20px_rgba(124,77,255,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Chat
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Ask a question, then highlight any AI response to open a branch beside the original chat.
          </p>
        </div>
      );
    }

    const inheritedCount = options?.branchTab?.history.length ?? 0;

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        {node.data.conversationHistory.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isInherited = index < inheritedCount;
          const highlightSnippet = !options?.branchTab && hoveredBranchTabId
            ? openBranchTabs.find(t => t.id === hoveredBranchTabId && t.parentMessageId === `${node.id}_${index}`)?.textSnippet
            : undefined;

          return (
            <div
              key={`${node.id}_${index}`}
              data-message-index={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start ai-response-message'} ${isInherited ? 'opacity-60' : ''}`}
            >
              {!isUser && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-[#7c4dff]/20 bg-[#7c4dff]/10 text-[#7c4dff] shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}

              <div className={`flex max-w-[84%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <span className="mb-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {isInherited ? 'Inherited context' : isUser ? 'You' : 'Space-S AI'}
                </span>
                <div
                  className={`rounded-[24px] border px-4 py-3 text-sm leading-6 shadow-sm backdrop-blur-xl ${
                    isUser
                      ? 'rounded-tr-lg border-[#7c4dff]/20 bg-[#7c4dff]/10 text-zinc-900 dark:bg-[#7c4dff]/20 dark:text-zinc-100'
                      : 'rounded-tl-lg border-white/60 bg-white/75 text-zinc-700 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300'
                  }`}
                >
                  <MarkdownRenderer
                    content={msg.content}
                    isLoading={node.data.isLoading && index === node.data.conversationHistory.length - 1}
                    highlightSnippet={highlightSnippet}
                  />
                </div>
              </div>

              {isUser && (
                <div className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-zinc-100 shadow-sm dark:border-white/10 dark:bg-zinc-800">
                  <img
                    src={user?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60'}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}

        {node.data.isLoading && (
          <div className="flex items-start gap-3 select-none">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-[#7c4dff]/20 bg-[#7c4dff]/10 text-[#7c4dff] shadow-sm">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div className="rounded-[24px] rounded-tl-lg border border-white/60 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#7c4dff]" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#7c4dff]" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#7c4dff]" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    );
  };

  const chatInput = (
    value: string,
    setValue: (value: string) => void,
    onSubmit: (e: React.FormEvent) => void,
    placeholder: string,
    disabled?: boolean
  ) => (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl px-4 pb-5 sm:px-6">
      <div className="flex min-h-[58px] items-center gap-2 rounded-[28px] border border-white/60 bg-white/80 p-2.5 shadow-[0_24px_80px_-38px_rgba(24,24,27,0.45)] backdrop-blur-2xl transition-all focus-within:border-[#7c4dff]/40 dark:border-white/10 dark:bg-zinc-950/70">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-wait dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-950/15 transition-all hover:-translate-y-0.5 hover:bg-[#7c4dff] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-[#a080ff]"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );

  const sidebar = (
    <aside className={`${sidebarOpen ? 'w-[292px]' : 'w-[82px]'} hidden shrink-0 border-r border-white/40 bg-white/50 backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-zinc-950/50 md:flex md:flex-col`}>
      <div className="flex h-[72px] items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-zinc-600 shadow-sm transition-all hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:text-zinc-100"
          title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        {sidebarOpen && (
          <div className="text-right">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Chat history</p>
            <p className="text-[10px] font-medium text-zinc-400">{parentThreads.length} threads</p>
          </div>
        )}
      </div>

      {sidebarOpen && (
        <div className="px-4 pb-3">
          <div className="flex h-10 items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-3 text-zinc-500 shadow-inner dark:border-white/10 dark:bg-zinc-900/70">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search chats"
              className="min-w-0 flex-1 bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredThreads.map(thread => {
          const isActive = activeParentNode?.id === thread.id;
          const isPinned = pinnedChatIds.includes(thread.id);

          return (
            <div
              key={thread.id}
              role="button"
              tabIndex={0}
              onClick={() => selectThread(thread.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectThread(thread.id);
                }
              }}
              className={`group mb-1.5 flex w-full items-center gap-2 rounded-2xl border p-2.5 text-left transition-all ${
                isActive
                  ? 'border-[#7c4dff]/25 bg-[#7c4dff]/10 shadow-sm'
                  : 'border-transparent hover:border-white/50 hover:bg-white/50 dark:hover:border-white/10 dark:hover:bg-white/5'
              }`}
              title={thread.data.title || 'Untitled chat'}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-[#7c4dff] text-white' : 'bg-white/75 text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400'}`}>
                {isPinned ? <Pin className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </div>
              {sidebarOpen && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold ${isActive ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {thread.data.title || 'Untitled chat'}
                    </p>
                    <p className="truncate text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                      {thread.data.conversationHistory.length} messages
                    </p>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinnedChat(thread.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinnedChat(thread.id);
                      }
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 opacity-100 transition-all hover:bg-white/70 hover:text-[#7c4dff] dark:hover:bg-white/10"
                    title={isPinned ? 'Unpin chat' : 'Pin chat'}
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden text-zinc-900 dark:text-zinc-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(124,77,255,0.18),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(14,165,233,0.14),transparent_24%),linear-gradient(135deg,#f7f4ee_0%,#eef7f6_48%,#f7f1ff_100%)] dark:bg-[radial-gradient(circle_at_20%_15%,rgba(124,77,255,0.20),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(20,184,166,0.13),transparent_24%),linear-gradient(135deg,#11100f_0%,#111827_48%,#171021_100%)]" />

      {selectionPosition && (
        <div
          style={{
            position: 'fixed',
            left: selectionPosition.x,
            top: selectionPosition.y,
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          className="flex animate-in items-center rounded-2xl border border-white/15 bg-zinc-950/90 p-1 text-white shadow-2xl backdrop-blur-xl duration-150 fade-in slide-in-from-bottom-1"
        >
          {[
            { label: 'Explain', icon: Sparkles, op: 'explain' as const, color: 'text-[#a080ff]' },
            { label: 'Expand', icon: GitBranch, op: 'expand' as const, color: 'text-cyan-300' },
            { label: 'Brief', icon: FileText, op: 'shorten' as const, color: 'text-amber-300' }
          ].map((item) => (
            <button
              key={item.op}
              onMouseDown={(e) => handleAskInNewBranch(e, item.op)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-200 transition-all hover:bg-white/10 active:scale-95"
            >
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {sidebar}

      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="md:hidden flex h-12 shrink-0 items-center justify-between border-b border-white/45 bg-white/58 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/58">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 text-zinc-600 shadow-sm dark:bg-zinc-900/75 dark:text-zinc-300"
            title="Chat history"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-white/75 px-2 py-1 text-[10px] font-bold text-zinc-500 shadow-sm dark:bg-zinc-900/75 dark:text-zinc-400">
            <span className={`h-1.5 w-1.5 rounded-full ${mobilePanelIndex === 0 ? 'bg-[#7c4dff]' : 'bg-zinc-300'}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${mobilePanelIndex === 1 ? 'bg-[#7c4dff]' : 'bg-zinc-300'}`} />
          </div>
          {mobilePanelIndex === 1 ? (
            <button
              type="button"
              onClick={() => setMobilePanelIndex(0)}
              className="flex h-9 items-center gap-1 rounded-xl bg-white/75 px-3 text-[11px] font-bold text-zinc-600 shadow-sm dark:bg-zinc-900/75 dark:text-zinc-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Chat
            </button>
          ) : (
            <div className="h-9 w-16" />
          )}
        </div>

        {sidebarOpen && (
          <div className="md:hidden absolute left-3 top-14 z-40 w-[min(320px,calc(100%-24px))] rounded-[28px] border border-white/60 bg-white/90 p-3 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/90">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Chat history</span>
              <button onClick={() => setSidebarOpen(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex h-10 items-center gap-2 rounded-2xl bg-zinc-100/70 px-3 dark:bg-white/5">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="Search chats"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none dark:text-zinc-100"
              />
            </div>
            <div className="max-h-[56vh] overflow-y-auto">
              {filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    selectThread(thread.id);
                    setSidebarOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectThread(thread.id);
                      setSidebarOpen(false);
                    }
                  }}
                  className="mb-1.5 flex w-full items-center gap-2 rounded-2xl p-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-[#7c4dff]" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-300">{thread.data.title || 'Untitled chat'}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinnedChat(thread.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinnedChat(thread.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-zinc-400"
                  >
                    {pinnedChatIds.includes(thread.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex min-h-0 flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`flex min-h-0 transition-transform duration-300 ease-out md:w-full md:translate-x-0 ${hasBranchWorkspace ? 'w-[200%]' : 'w-full'} ${mobilePanelIndex === 1 ? '-translate-x-1/2' : 'translate-x-0'}`}
          >
            <div className={`${hasBranchWorkspace ? 'w-1/2 md:w-[52%]' : 'w-full'} flex min-h-0 shrink-0 flex-col border-r border-white/35 dark:border-white/10`}>
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/40 bg-white/40 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/40">
                <div className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowThreadDropdown(!showThreadDropdown)}
                    className="flex max-w-[56vw] items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm transition-all hover:bg-white/90 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-[#7c4dff]" />
                    <span className="truncate">{activeParentNode?.data.title || 'Chat'}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  </button>
                  {showThreadDropdown && parentThreads.length > 1 && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowThreadDropdown(false)} />
                      <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-white/60 bg-white/90 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90">
                        {parentThreads.map(thread => (
                          <button
                            key={thread.id}
                            onClick={() => selectThread(thread.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-[#7c4dff]/10 dark:text-zinc-300 dark:hover:bg-white/5"
                          >
                            {pinnedChatIds.includes(thread.id) ? <Pin className="h-3.5 w-3.5 text-[#7c4dff]" /> : <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />}
                            <span className="truncate">{thread.data.title || 'Untitled chat'}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <span className="hidden rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 shadow-sm dark:bg-white/5 sm:block">
                  Main chat
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto select-text">
                {renderMessageList(activeParentNode, parentScrollRef)}
              </div>
              {chatInput(parentInput, setParentInput, handleSendParent, 'Message Space-S...', activeParentNode?.data.isLoading)}
            </div>

            {hasBranchWorkspace && (
              <div className="flex w-1/2 shrink-0 flex-col md:w-[48%]">
                <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-white/40 bg-white/40 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/40">
                  <div className="flex items-center gap-2">
                    {openBranchTabs.map(tab => {
                      const isActive = tab.id === activeBranchTabId;
                      const nodeState = nodes.find(n => n.id === tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveBranchTabId(tab.id);
                            setMobilePanelIndex(1);
                          }}
                          onMouseEnter={() => setHoveredBranchTabId(tab.id)}
                          onMouseLeave={() => setHoveredBranchTabId(null)}
                          className={`group flex h-9 min-w-[132px] max-w-[200px] items-center gap-2 rounded-2xl border px-3 text-xs font-bold transition-all ${
                            isActive
                              ? 'border-[#7c4dff]/30 bg-[#7c4dff]/10 text-[#6d28d9] shadow-sm dark:text-[#c4b5fd]'
                              : 'border-transparent bg-white/50 text-zinc-500 hover:bg-white/80 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10'
                          }`}
                        >
                          <GitBranch className={`h-4 w-4 shrink-0 ${nodeState?.data.isLoading ? 'animate-pulse text-[#7c4dff]' : ''}`} />
                          <span className="truncate">{tab.textSnippet}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBranchTab(tab.id);
                            }}
                            className="ml-auto rounded-lg p-0.5 text-zinc-400 transition-colors hover:bg-black/10 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeBranchNode ? (
                  <>
                    <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#7c4dff]/10 bg-[#7c4dff]/10 px-4 text-[11px] font-bold text-[#6d28d9] dark:text-[#c4b5fd]">
                      <span className="flex min-w-0 items-center gap-2">
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Branch tab: {activeBranchTab?.textSnippet || activeBranchNode.data.title}</span>
                      </span>
                      <span className="rounded-full border border-[#7c4dff]/20 bg-white/50 px-2 py-0.5 text-[9px] uppercase tracking-wide dark:bg-white/5">
                        Inherited
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto select-text">
                      {renderMessageList(activeBranchNode, branchScrollRef, { branchTab: activeBranchTab })}
                    </div>
                    {chatInput(branchInput, setBranchInput, handleSendBranch, 'Message this branch...', activeBranchNode.data.isLoading)}
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center select-none">
                    <GitBranch className="mb-4 h-10 w-10 text-[#7c4dff]/50" />
                    <h2 className="text-4xl font-semibold tracking-normal text-zinc-900 dark:text-zinc-50">Chat</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      Select text in the main response to open a branch here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChatWorkspace;
