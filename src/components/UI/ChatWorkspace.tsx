"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, Sparkles, GitBranch, ArrowLeft, ChevronDown, 
  MessageSquare, Layers, HelpCircle, FileText, StickyNote 
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useUser } from '@clerk/nextjs';
import { MarkdownRenderer } from './MarkdownRenderer';

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

  // Resize state
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // Selector state
  const [showThreadDropdown, setShowThreadDropdown] = useState(false);

  // Message inputs
  const [parentInput, setParentInput] = useState('');
  const [branchInput, setBranchInput] = useState('');

  // Floating selection menu state
  const [selectedText, setSelectedText] = useState('');
  const [selectedMsgIndex, setSelectedMsgIndex] = useState<number | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // Mobile layout state
  const [mobileActivePanel, setMobileActivePanel] = useState<'parent' | 'branch'>('parent');

  // Scroll references
  const parentScrollRef = useRef<HTMLDivElement>(null);
  const branchScrollRef = useRef<HTMLDivElement>(null);

  // Find root nodes for thread switching
  const parentThreads = nodes.filter(n => !n.data.parentNodeId && n.data.type === 'llm');
  const activeParentNode = nodes.find(n => n.id === activeParentChatId) || parentThreads[0];

  // Sync activeParentChatId if null
  useEffect(() => {
    if (!activeParentChatId && activeParentNode) {
      setActiveParentChatId(activeParentNode.id);
    }
  }, [activeParentChatId, activeParentNode, setActiveParentChatId]);

  // Find active branch tab and node
  const activeBranchTab = openBranchTabs.find(t => t.id === activeBranchTabId);
  const activeBranchNode = nodes.find(n => n.id === activeBranchTabId);

  // Auto-scroll on loading/new messages
  useEffect(() => {
    parentScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeParentNode?.data.conversationHistory, activeParentNode?.data.isLoading]);

  useEffect(() => {
    branchScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeBranchNode?.data.conversationHistory, activeBranchNode?.data.isLoading]);

  // Resize logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      if (newWidth > 25 && newWidth < 75) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Highlight selection listener
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

      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      const anchorElement = anchorNode.parentElement;
      if (!anchorElement) return;

      // Ensure selection is inside Left Panel AI response message
      const messageContainer = anchorElement.closest('.ai-response-message');
      if (!messageContainer) {
        setSelectionPosition(null);
        return;
      }

      const msgIndexAttr = messageContainer.getAttribute('data-message-index');
      if (msgIndexAttr === null) return;
      const messageIndex = parseInt(msgIndexAttr, 10);

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        const isMobile = window.innerWidth < 768;
        
        setSelectionPosition({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: isMobile 
            ? rect.bottom + 8 + window.scrollY 
            : rect.top - 44 + window.scrollY
        });
        setSelectedText(text);
        setSelectedMsgIndex(messageIndex);
      } catch {
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Action handlers
  const handleAskInNewBranch = async (e: React.MouseEvent, operation: 'explain' | 'expand' | 'shorten') => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeParentNode || selectedMsgIndex === null || !selectedText) return;

    // Create the branch node & tab with the selected operation
    const branchId = await createBranchFromChat(activeParentNode.id, selectedMsgIndex, selectedText, operation);
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelectionPosition(null);

    // Switch to branch view on mobile
    if (window.innerWidth < 768) {
      setMobileActivePanel('branch');
    }
  };

  const handleSendParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentInput.trim()) return;

    if (activeParentNode) {
      continueNodeConversation(activeParentNode.id, parentInput.trim());
      setParentInput('');
    } else {
      // First node fallback
      addLLMNodeFromSearch(parentInput.trim());
      setParentInput('');
    }
  };

  const handleSendBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchInput.trim() || !activeBranchNode || activeBranchNode.data.isLoading) return;

    continueNodeConversation(activeBranchNode.id, branchInput.trim());
    setBranchInput('');
  };

  // Mobile Swipe Physics
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      if (deltaX < 0) {
        // Swipe left -> Show Branch Workspace
        if (openBranchTabs.length > 0) {
          setMobileActivePanel('branch');
        }
      } else {
        // Swipe right -> Show Parent Chat Workspace
        setMobileActivePanel('parent');
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div className="w-full h-full flex flex-col relative text-zinc-800 dark:text-zinc-200">
      
      {/* Selection Floating Tooltip */}
      {selectionPosition && (
        <div 
          style={{
            position: 'fixed',
            left: selectionPosition.x,
            top: selectionPosition.y,
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          className="animate-in fade-in slide-in-from-bottom-1 duration-150 flex items-center bg-zinc-950/95 dark:bg-zinc-900/95 text-white rounded-xl border border-white/10 dark:border-zinc-800/80 shadow-2xl p-1 select-none backdrop-blur-md"
        >
          <button
            onMouseDown={(e) => handleAskInNewBranch(e, 'explain')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 duration-100 whitespace-nowrap text-zinc-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#a080ff]" />
            <span>Explain</span>
          </button>
          <div className="w-px h-4 bg-white/10 dark:bg-zinc-800" />
          <button
            onMouseDown={(e) => handleAskInNewBranch(e, 'expand')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 duration-100 whitespace-nowrap text-zinc-200"
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>Expand</span>
          </button>
          <div className="w-px h-4 bg-white/10 dark:bg-zinc-800" />
          <button
            onMouseDown={(e) => handleAskInNewBranch(e, 'shorten')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-zinc-800 text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 duration-100 whitespace-nowrap text-zinc-200"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Brief</span>
          </button>
        </div>
      )}

      {/* Mobile Breadcrumb Rail */}
      <div className="md:hidden flex items-center justify-between px-4 h-10 border-b border-black/10 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950 z-30 select-none">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 font-sans tracking-wide truncate pr-4">
          <span className="truncate max-w-[120px]">{activeParentNode?.data.title || 'Untitled Thread'}</span>
          {mobileActivePanel === 'branch' && activeBranchTab && (
            <>
              <span className="text-zinc-400">&gt;</span>
              <span className="text-[#7c4dff] dark:text-[#a080ff] truncate max-w-[120px]">{activeBranchTab.textSnippet}</span>
            </>
          )}
        </div>
        {mobileActivePanel === 'branch' && (
          <button 
            onClick={() => setMobileActivePanel('parent')}
            className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-2 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 active:bg-black/10"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Desktop Panel Workspace Wrapper */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full h-[calc(100%-40px)] md:h-full relative overflow-hidden flex"
      >
        {/* Dynamic viewport layout for mobile vs desktop */}
        <div 
          className={`flex w-[200%] md:w-full h-full transition-transform duration-300 ease-out md:translate-x-0 ${
            mobileActivePanel === 'branch' ? '-translate-x-1/2' : 'translate-x-0'
          }`}
        >
          {/* LEFT PANEL: Main Thread (50% to 100% depending on resizing / mobile state) */}
          <div 
            style={{ width: window.innerWidth >= 768 ? `${100 - (openBranchTabs.length > 0 ? rightPanelWidth : 0)}%` : '50%' }}
            className="h-full flex flex-col border-r border-black/10 dark:border-zinc-800/60 bg-[#f8f5f0] dark:bg-[#121110] relative transition-all duration-300"
          >
            {/* Header: Selector / Thread meta */}
            <div className="h-[52px] border-b border-black/10 dark:border-zinc-800/60 flex items-center justify-between px-5 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md z-20">
              <div className="relative">
                <button
                  onClick={() => setShowThreadDropdown(!showThreadDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-semibold font-sans transition-all active:scale-95 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#7c4dff]" />
                  <span className="max-w-[200px] truncate">{activeParentNode?.data.title || 'Start a Chat...'}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {showThreadDropdown && parentThreads.length > 1 && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowThreadDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100 max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide border-b border-black/5 dark:border-white/5 mb-1">
                        Select Main Thread
                      </div>
                      {parentThreads.map(thread => (
                        <button
                          key={thread.id}
                          onClick={() => {
                            setActiveParentChatId(thread.id);
                            setShowThreadDropdown(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors truncate ${
                            activeParentChatId === thread.id ? 'text-[#7c4dff] bg-[#7c4dff]/5' : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {thread.data.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-sans select-none">
                Main Thread
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text">
              {!activeParentNode || activeParentNode.data.conversationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 dark:text-zinc-500 select-none">
                  <Sparkles className="w-10 h-10 text-[#7c4dff]/40 mb-3 animate-pulse" />
                  <p className="text-xs font-bold text-zinc-650 dark:text-zinc-450">Welcome to Chat View</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px] leading-relaxed">
                    Type a prompt below to start a linear thread. Highlighting any AI response will allow you to ask in a new branch tab!
                  </p>
                </div>
              ) : (
                activeParentNode.data.conversationHistory.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  const highlightSnippet = hoveredBranchTabId && openBranchTabs.find(t => t.id === hoveredBranchTabId)?.parentMessageId === `${activeParentNode.id}_${index}`
                    ? openBranchTabs.find(t => t.id === hoveredBranchTabId)?.textSnippet
                    : undefined;

                  if (isUser) {
                    const isMe = !msg.senderId || msg.senderId === user?.id;
                    return (
                      <div key={index} className="flex flex-row-reverse items-start gap-2.5 max-w-[85%] self-end">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 select-none shadow-sm">
                          <img src={user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60"} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none">You</span>
                          <div className="rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-sm border bg-[#7c4dff]/5 dark:bg-[#7c4dff]/10 border-[#7c4dff]/15 dark:border-[#7c4dff]/30 text-zinc-850 dark:text-zinc-200 rounded-tr-none">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} className="flex flex-row items-start gap-2.5 max-w-[85%] self-start ai-response-message" data-message-index={index}>
                        <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0 select-none shadow-sm">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none font-sans">Space-S AI</span>
                          <div className="rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-850/50 text-zinc-700 dark:text-zinc-300 rounded-tl-none transition-all duration-300">
                            <MarkdownRenderer 
                              content={msg.content} 
                              isLoading={activeParentNode.data.isLoading && index === activeParentNode.data.conversationHistory.length - 1} 
                              highlightSnippet={highlightSnippet}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              )}

              {/* Loader */}
              {activeParentNode?.data.isLoading && (
                <div className="flex flex-row items-start gap-2.5 max-w-[85%] self-start select-none">
                  <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space-S AI</span>
                    <div className="rounded-xl rounded-tl-none px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-850/50 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={parentScrollRef} />
            </div>

            {/* Input area */}
            <form 
              onSubmit={handleSendParent}
              className="p-4 border-t border-black/10 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/40 flex items-center gap-2"
            >
              <input 
                type="text" 
                placeholder="Ask or search topic..."
                value={parentInput}
                onChange={(e) => setParentInput(e.target.value)}
                disabled={activeParentNode?.data.isLoading}
                className="flex-1 h-9 px-3.5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] text-xs bg-black/5 dark:bg-white/5 focus:bg-white dark:focus:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all placeholder-zinc-400 dark:placeholder-zinc-500 shadow-inner"
              />
              <button 
                type="submit"
                disabled={!parentInput.trim() || activeParentNode?.data.isLoading}
                className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* DRAGGABLE DIVIDER (Desktop only, if branches exist) */}
          {openBranchTabs.length > 0 && (
            <div 
              onMouseDown={handleMouseDown}
              className={`hidden md:block w-1.5 h-full cursor-col-resize hover:bg-[#7c4dff] transition-all relative z-40 ${
                isResizing ? 'bg-[#7c4dff]' : 'bg-black/10 dark:bg-zinc-850/50'
              }`}
            />
          )}

          {/* RIGHT PANEL: Branch Workspace (0% to 50% depending on branches) */}
          <div 
            style={{ 
              width: window.innerWidth >= 768 
                ? (openBranchTabs.length > 0 ? `${rightPanelWidth}%` : '0px') 
                : '50%',
              display: openBranchTabs.length > 0 ? 'flex' : 'none'
            }}
            className="h-full flex-col bg-white dark:bg-zinc-950 relative overflow-hidden transition-all duration-300"
          >
            {/* Header: Browser horizontal tab bar */}
            <div className="h-[52px] border-b border-black/10 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-md flex items-center px-2 select-none overflow-x-auto no-scrollbar scroll-smooth">
              <div className="flex items-center gap-1.5 h-full py-2">
                {openBranchTabs.map(tab => {
                  const isActive = tab.id === activeBranchTabId;
                  const nodeState = nodes.find(n => n.id === tab.id);
                  const isTabLoading = nodeState?.data.isLoading;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        setActiveBranchTabId(tab.id);
                        if (window.innerWidth < 768) {
                          setMobileActivePanel('branch');
                        }
                      }}
                      onMouseEnter={() => setHoveredBranchTabId(tab.id)}
                      onMouseLeave={() => setHoveredBranchTabId(null)}
                      className={`h-8 px-3 rounded-lg flex items-center gap-2 cursor-pointer transition-all border text-xs font-semibold ${
                        isActive 
                          ? 'bg-[#7c4dff]/10 border-[#7c4dff]/30 text-[#7c4dff] dark:text-[#be9eff] dark:bg-[#7c4dff]/15'
                          : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isTabLoading ? 'animate-pulse text-[#7c4dff]' : ''}`} />
                      <span className="truncate max-w-[80px] font-sans">{tab.textSnippet}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBranchTab(tab.id);
                        }}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-700 dark:hover:text-zinc-200 text-zinc-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab content - Isolated chat box session */}
            {activeBranchNode ? (
              <div className="flex-1 flex flex-col h-[calc(100%-52px)] overflow-hidden">
                {/* Inherited context header */}
                <div className="bg-[#7c4dff]/5 dark:bg-[#7c4dff]/10 border-b border-[#7c4dff]/10 px-5 py-2 flex items-center justify-between text-[10px] font-semibold text-[#7c4dff] dark:text-[#a080ff] select-none shadow-sm">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>Context Inherited (Up to branch point)</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#7c4dff]/15 text-[8.5px] uppercase tracking-wide border border-[#7c4dff]/20">
                    Badge
                  </span>
                </div>

                {/* Conversation area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text bg-[#faf9f6] dark:bg-zinc-950/30">
                  {activeBranchNode.data.conversationHistory.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    // We mark inherited messages as those matching the index and count from the tab's history.
                    const isInherited = index < activeBranchTab!.history.length;
                    
                    if (isUser) {
                      const isMe = !msg.senderId || msg.senderId === user?.id;
                      return (
                        <div 
                          key={index} 
                          className={`flex flex-row-reverse items-start gap-2.5 max-w-[85%] self-end ${
                            isInherited ? 'opacity-70' : ''
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 select-none shadow-sm">
                            <img src={user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60"} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none">
                              {isInherited ? 'Inherited Context' : 'You'}
                            </span>
                            <div className={`rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-sm border rounded-tr-none ${
                              isInherited 
                                ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-850/50 text-zinc-550 dark:text-zinc-450' 
                                : 'bg-[#7c4dff]/5 dark:bg-[#7c4dff]/10 border-[#7c4dff]/15 dark:border-[#7c4dff]/30 text-zinc-850 dark:text-zinc-200'
                            }`}>
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div 
                          key={index} 
                          className={`flex flex-row items-start gap-2.5 max-w-[85%] self-start ${
                            isInherited ? 'opacity-70' : ''
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0 select-none shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[9px] font-semibold text-zinc-400 mb-1 select-none">
                              {isInherited ? 'Inherited Response' : 'Space-S AI'}
                            </span>
                            <div className="rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-250 dark:border-zinc-850/50 text-zinc-700 dark:text-zinc-300 rounded-tl-none">
                              <MarkdownRenderer 
                                content={msg.content} 
                                isLoading={activeBranchNode.data.isLoading && index === activeBranchNode.data.conversationHistory.length - 1} 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}

                  {activeBranchNode.data.isLoading && (
                    <div className="flex flex-row items-start gap-2.5 max-w-[85%] self-start select-none">
                      <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space-S AI</span>
                        <div className="rounded-xl rounded-tl-none px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={branchScrollRef} />
                </div>

                {/* Input area */}
                <form 
                  onSubmit={handleSendBranch}
                  className="p-4 border-t border-black/10 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/40 flex items-center gap-2"
                >
                  <input 
                    type="text" 
                    placeholder="Ask about this branch..."
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    disabled={activeBranchNode.data.isLoading}
                    className="flex-1 h-9 px-3.5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] text-xs bg-black/5 dark:bg-white/5 focus:bg-white dark:focus:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all placeholder-zinc-400 dark:placeholder-zinc-500 shadow-inner"
                  />
                  <button 
                    type="submit"
                    disabled={!branchInput.trim() || activeBranchNode.data.isLoading}
                    className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-500 select-none">
                <GitBranch className="w-10 h-10 text-zinc-350 dark:text-zinc-700 mb-3" />
                <p className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Select or Create a Branch</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                  Click on an open tab above or highlight AI responses in the left panel to branch off.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWorkspace;
