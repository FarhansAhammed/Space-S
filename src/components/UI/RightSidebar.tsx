"use client";
 
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, FileText, Link, HelpCircle, StickyNote } from 'lucide-react';
import { useCanvasStore, NodeType } from '@/store/canvasStore';
import { useUser } from '@clerk/nextjs';
 
export const RightSidebar = () => {
  const { user } = useUser();
  const { activeNodeId, nodes, selectNode, continueNodeConversation } = useCanvasStore();
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'info' | 'links' | 'more'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);
 
  // Retrieve current active node
  const activeNode = nodes.find(n => n.id === activeNodeId);
 
  // Scroll to bottom of chat list on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNode?.data.conversationHistory, activeNode?.data.isLoading]);
 
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
    <aside className="w-full md:w-[360px] bg-white/95 dark:bg-[#1a1917]/95 border-t md:border border-zinc-200/60 dark:border-zinc-800/80 shadow-glass rounded-t-2xl md:rounded-2xl flex flex-col fixed bottom-0 md:bottom-[24px] left-0 md:left-auto right-0 md:right-[24px] top-auto md:top-[84px] h-[60vh] md:h-auto z-40 overflow-hidden transition-all duration-300 dark:text-zinc-200">
      
      {/* Header Info */}
      <div className="p-5 border-b border-zinc-100/80 dark:border-zinc-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${tagStyle.bg} ${tagStyle.text}`}>
            {tagStyle.icon}
            <span>{tagStyle.label}</span>
          </div>
          <button 
            onClick={() => selectNode(null)}
            className="w-7 h-7 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-sm font-semibold font-display text-zinc-800 dark:text-zinc-100 line-clamp-2 mt-1">
          {data.title}
        </h2>
      </div>
 
      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
        {(['chat', 'info', 'links', 'more'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-[#7c4dff] text-zinc-800 dark:text-zinc-200 font-semibold' : 'border-transparent hover:text-zinc-600 dark:hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>
 
      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 no-canvas-wheel">
        {activeTab === 'chat' && (
          <div className="flex flex-col gap-4">
            {data.conversationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
                <Sparkles className="w-8 h-8 text-[#7c4dff]/40 mb-2 animate-pulse" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Ask this node anything!</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1 max-w-[200px]">Any questions here remain isolated to this node context.</p>
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
                            {renderMarkdown(msg.content)}
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
                          <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-100 dark:border-zinc-800/80 text-zinc-655 dark:text-zinc-300 rounded-tl-none select-text">
                            {renderMarkdown(msg.content)}
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
                        <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space-S AI</span>
                        <div className="rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm border bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-100 dark:border-zinc-800/80 text-zinc-655 dark:text-zinc-300 rounded-tl-none select-text">
                          {renderMarkdown(msg.content)}
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
                  <span className="text-[9px] font-semibold text-zinc-400 mb-1">Space-S AI</span>
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
        )}
 
        {activeTab === 'info' && (
          <div className="flex flex-col gap-4 text-xs text-zinc-600 dark:text-zinc-400 font-sans">
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Generational Index</p>
              <p className="text-zinc-550 dark:text-zinc-450 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 p-2.5 rounded-lg font-mono">
                Generation {data.generation} {data.generation === 0 ? '(Root Board Parent)' : `(Derived Child level)`}
              </p>
            </div>
            {data.parentNodeId && (
              <div>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Parent Node Ref</p>
                <p className="text-zinc-550 dark:text-zinc-455 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 p-2.5 rounded-lg font-mono truncate">
                  {data.parentNodeId}
                </p>
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Topic Summary</p>
              <p className="text-zinc-550 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 p-2.5 rounded-lg">
                This node contains contextual responses parsed from Poolside models. 
                Any chat responses stream directly and update the node layout values.
              </p>
            </div>
          </div>
        )}
 
        {activeTab === 'links' && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
            <Link className="w-6 h-6 mb-2" />
            <p className="text-xs">No external links found.</p>
          </div>
        )}
 
        {activeTab === 'more' && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
            <p className="text-xs">Additional tools not configured.</p>
          </div>
        )}
      </div>
 
      {/* Floating Chat Input Footer */}
      {activeTab === 'chat' && (
        <form 
          onSubmit={handleSendMessage}
          className="p-4 border-t border-zinc-100/85 dark:border-zinc-800/80 bg-white dark:bg-[#1a1917] flex items-center gap-2 transition-colors duration-200"
        >
          <input 
            type="text" 
            placeholder="Ask something..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            disabled={data.isLoading}
            className="flex-1 h-9 px-3.5 border border-zinc-200 dark:border-zinc-850 rounded-lg outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] text-xs bg-zinc-50/50 dark:bg-zinc-900/50 focus:bg-white dark:focus:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
          />
          <button 
            type="submit"
            disabled={!chatMessage.trim() || data.isLoading}
            className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
 
    </aside>
  );
};
 
// Simple Markdown-to-React elements parser (no dangerouslySetInnerHTML)
const parseInlineStyles = (text: string): React.ReactNode[] => {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold text-zinc-900 dark:text-zinc-100">{part}</strong>;
    }
    return part;
  });
};
 
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
 
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="font-semibold text-[11px] text-zinc-950 dark:text-white mt-1 mb-0.5">{parseInlineStyles(trimmed.slice(4))}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-xs text-zinc-950 dark:text-white mt-1.5 mb-1">{parseInlineStyles(trimmed.slice(3))}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="font-extrabold text-sm text-zinc-950 dark:text-white mt-2 mb-1">{parseInlineStyles(trimmed.slice(2))}</h2>;
        }
 
        // Unordered lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <ul key={idx} className="list-disc pl-3">
              <li className="text-[11px] text-zinc-655 dark:text-zinc-300">{parseInlineStyles(trimmed.slice(2))}</li>
            </ul>
          );
        }
 
        // Ordered lists
        const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numListMatch) {
          return (
            <ol key={idx} className="list-decimal pl-3" start={parseInt(numListMatch[1], 10)}>
              <li className="text-[11px] text-zinc-655 dark:text-zinc-300">{parseInlineStyles(numListMatch[2])}</li>
            </ol>
          );
        }
 
        // Standard Paragraphs
        return (
          <p key={idx} className="text-[11px] text-zinc-655 dark:text-zinc-300 leading-relaxed min-h-[4px]">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
};
 
export default RightSidebar;
