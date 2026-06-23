"use client";
 
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, FileText, HelpCircle, StickyNote, Maximize2, Minimize2 } from 'lucide-react';
import { useCanvasStore, NodeType } from '@/store/canvasStore';
import { useUser } from '@clerk/nextjs';
import { MarkdownRenderer } from './MarkdownRenderer';
 
export const RightSidebar = () => {
  const user = useUser().user;
  const { activeNodeId, nodes, selectNode, continueNodeConversation, showMobileSidebar } = useCanvasStore();
  const [chatMessage, setChatMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
 
  // Retrieve current active node
  const activeNode = nodes.find(n => n.id === activeNodeId);
 
  // Scroll to bottom of chat list on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNode?.data.conversationHistory, activeNode?.data.isLoading]);

  // Synchronize sidebar states to document.body classes for layout reaction
  useEffect(() => {
    if (activeNode) {
      if (isExpanded) {
        document.body.classList.add('sidebar-expanded');
        document.body.classList.remove('sidebar-open');
      } else {
        document.body.classList.add('sidebar-open');
        document.body.classList.remove('sidebar-expanded');
      }
    } else {
      document.body.classList.remove('sidebar-open');
      document.body.classList.remove('sidebar-expanded');
    }

    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.classList.remove('sidebar-expanded');
    };
  }, [activeNode, isExpanded]);
 
  if (!activeNodeId || !activeNode) return null;
 
  const data = activeNode.data;
 
  // Semantic styles mapping
  const getTagStyles = (type: NodeType) => {
    switch (type) {
      case 'llm':
        return { text: 'text-[#7c4dff]', bg: 'bg-[#7c4dff]/10', label: 'AI Response', icon: <Sparkles className="w-3.5 h-3.5" /> };
      case 'note':
        return { text: 'text-[#b78103]', bg: 'bg-[#b78103]/10', label: 'Note', icon: <StickyNote className="w-3.5 h-3.5" /> };
      case 'image':
        return { text: 'text-[#2e7d32]', bg: 'bg-[#2e7d32]/10', label: 'Image', icon: <FileText className="w-3.5 h-3.5" /> };
      case 'doc':
        return { text: 'text-[#6d4c41]', bg: 'bg-[#6d4c41]/10', label: 'Document', icon: <FileText className="w-3.5 h-3.5" /> };
      case 'question':
        return { text: 'text-[#c62828]', bg: 'bg-[#c62828]/10', label: 'Question', icon: <HelpCircle className="w-3.5 h-3.5" /> };
      case 'merge':
        return { text: 'text-[#6200ea]', bg: 'bg-[#6200ea]/10', label: 'AI Synthesis', icon: <Sparkles className="w-3.5 h-3.5" /> };
      default:
        return { text: 'text-zinc-600', bg: 'bg-zinc-100', label: 'Node', icon: <Sparkles className="w-3.5 h-3.5" /> };
    }
  };
 
  const tagStyle = getTagStyles(data.type);
 
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || data.isLoading) return;
 
    continueNodeConversation(activeNodeId, chatMessage.trim());
    setChatMessage('');
  };
 
  return (
    <aside className={`w-full ${isExpanded ? 'md:w-[800px]' : 'md:w-[450px]'} bg-white/80 dark:bg-zinc-950/80 border-t md:border border-white/20 dark:border-zinc-800/50 shadow-[0_20px_40px_rgba(45,38,32,0.08)] rounded-t-[24px] md:rounded-[24px] ${showMobileSidebar ? 'flex' : 'hidden md:flex'} flex-col fixed bottom-0 md:bottom-[24px] left-0 md:left-auto right-0 md:right-[24px] top-auto md:top-[84px] h-[60vh] md:h-auto z-40 overflow-hidden backdrop-blur-md transition-all duration-300 dark:text-zinc-200`}>
      
      {/* Header Info */}
      <div className="p-5 border-b border-black/5 dark:border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${tagStyle.bg} ${tagStyle.text}`}>
            {tagStyle.icon}
            <span>{tagStyle.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse panel" : "Expand panel"}
              className="w-7 h-7 rounded-xl border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all"
            >
              {isExpanded ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>
            <button 
              type="button"
              onClick={() => selectNode(null)}
              className="w-7 h-7 rounded-xl border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
        <h2 className="text-sm font-semibold font-display text-zinc-800 dark:text-zinc-100 line-clamp-2 mt-1">
          {data.title}
        </h2>
      </div>
 
      {/* Tab Contents - Chat Only */}
      <div className="flex-1 overflow-y-auto p-5 no-canvas-wheel">
        <div className="flex flex-col gap-4">
          {data.conversationHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
              <Sparkles className="w-8 h-8 text-[#7c4dff]/40 mb-2 animate-pulse" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Ask this node anything!</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px]">Any questions here remain isolated to this node context.</p>
            </div>
          ) : (
            data.conversationHistory.map((msg, index) => {
              if (msg.role === 'user') {
                const isMe = !msg.senderId || msg.senderId === user?.id;
                if (isMe) {
                  return (
                    <div key={index} className="flex flex-row-reverse items-start gap-2 max-w-[85%] self-end">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                        <img src={user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=60"} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-semibold text-zinc-400 mb-1">You</span>
                        <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm border bg-[#7c4dff]/5 dark:bg-[#7c4dff]/10 border-[#7c4dff]/15 dark:border-[#7c4dff]/30 text-zinc-800 dark:text-zinc-200 rounded-tr-none select-text">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const initials = msg.sender?.username ? msg.sender.username.slice(0, 2).toUpperCase() : 'U';
                  const avatarColor = msg.sender?.avatarColor || '#7c4dff';
                  return (
                    <div key={index} className="flex flex-row items-start gap-2 max-w-[85%] self-start">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 select-none shadow-sm"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-semibold text-zinc-400 mb-1">@{msg.sender?.username || 'Collaborator'}</span>
                        <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-100 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 rounded-tl-none select-text">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                    </div>
                  );
                }
              } else {
                return (
                  <div key={index} className="flex flex-row items-start gap-2 max-w-[85%] self-start">
                    <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space S AI</span>
                      <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-100 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 rounded-tl-none select-text">
                        <MarkdownRenderer content={msg.content} isLoading={data.isLoading && index === data.conversationHistory.length - 1} />
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}

          {/* Thinking Indicator */}
          {data.isLoading && (
            <div className="flex flex-row items-start gap-2 max-w-[85%] self-start">
              <div className="w-6 h-6 rounded-full bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space S AI</span>
                <div className="rounded-xl rounded-tl-none px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Floating Chat Input Footer */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t border-black/5 dark:border-white/5 bg-transparent flex items-center gap-2 transition-colors duration-200"
      >
        <input 
          type="text" 
          placeholder="Ask something..."
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          disabled={data.isLoading}
          className="flex-1 h-9 px-3.5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] text-xs bg-black/5 dark:bg-white/5 focus:bg-white/70 dark:focus:bg-zinc-900/70 text-zinc-800 dark:text-zinc-200 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
        />
        <button 
          type="submit"
          disabled={!chatMessage.trim() || data.isLoading}
          className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
 
    </aside>
  );
};
 
export default RightSidebar;
