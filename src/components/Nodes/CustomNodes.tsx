"use client";
 
import React, { useState } from 'react';
import { Handle, Position, NodeProps, NodeResizeControl } from 'reactflow';
import { 
  Bot, 
  FileText, 
  Image as ImageIcon, 
  HelpCircle, 
  StickyNote, 
  MessageSquare, 
  GitBranch, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { NodeData, useCanvasStore, NodeType } from '@/store/canvasStore';
 
export const CustomNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const { 
    deleteNode, 
    deriveNode, 
    collapseNode, 
    expandNode, 
    selectNode,
    triggerNodeOperation,
    updateNodeSizeLocally,
    updateNodeSize
  } = useCanvasStore();

  const rfStyle = useCanvasStore(state => state.nodes.find(n => n.id === id)?.style);
  
  // Compute a text scale factor proportional to the node's current width
  // Base width is 260px — scale grows up to 2× at ~520px+
  const DEFAULT_WIDTH = 260;
  const nodeWidth = (rfStyle?.width as number | undefined) ?? DEFAULT_WIDTH;
  const textScale = Math.min(2, Math.max(1, nodeWidth / DEFAULT_WIDTH));
  
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isHoveringResize, setIsHoveringResize] = useState(false);
 
  // Semantic styles mapping based on node type
  const getTypeStyles = (type: NodeType) => {
    switch (type) {
      case 'llm':
        return {
          bg: 'bg-[#faf8ff] dark:bg-[#1a152b]',
          border: selected ? 'border-[#7c4dff] ring-2 ring-[#7c4dff]/20' : 'border-[#7c4dff]/20 dark:border-[#7c4dff]/30',
          accent: '#7c4dff',
          tag: 'AI Response',
          icon: <Sparkles className="w-3 h-3 text-[#7c4dff]" />
        };
      case 'note':
        return {
          bg: 'bg-[#fffdf5] dark:bg-[#261f0e]',
          border: selected ? 'border-[#b78103] ring-2 ring-[#b78103]/20' : 'border-[#d89b00]/25 dark:border-[#d89b00]/40',
          accent: '#b78103',
          tag: 'Note',
          icon: <StickyNote className="w-3 h-3 text-[#b78103]" />
        };
      case 'image':
        return {
          bg: 'bg-[#f5faf6] dark:bg-[#112115]',
          border: selected ? 'border-[#2e7d32] ring-2 ring-[#2e7d32]/20' : 'border-[#76af50]/20 dark:border-[#76af50]/45',
          accent: '#2e7d32',
          tag: 'Image',
          icon: <ImageIcon className="w-3 h-3 text-[#2e7d32]" />
        };
      case 'doc':
        return {
          bg: 'bg-[#faf8f5] dark:bg-[#1f1816]',
          border: selected ? 'border-[#6d4c41] ring-2 ring-[#6d4c41]/20' : 'border-[#8d6e63]/25 dark:border-[#8d6e63]/45',
          accent: '#6d4c41',
          tag: 'Document',
          icon: <FileText className="w-3 h-3 text-[#6d4c41]" />
        };
      case 'question':
        return {
          bg: 'bg-[#fff5f5] dark:bg-[#2b1616]',
          border: selected ? 'border-[#c62828] ring-2 ring-[#c62828]/20' : 'border-[#f44336]/20 dark:border-[#f44336]/45',
          accent: '#c62828',
          tag: 'Question',
          icon: <HelpCircle className="w-3 h-3 text-[#c62828]" />
        };
      case 'merge':
        return {
          bg: 'bg-[#faf9ff] dark:bg-[#1b122b]',
          border: selected ? 'border-[#6200ea] ring-2 ring-[#6200ea]/20' : 'border-dashed border-[#7c4dff]/40 dark:border-dashed dark:border-[#7c4dff]/50',
          accent: '#6200ea',
          tag: 'AI Synthesis',
          icon: <Sparkles className="w-3 h-3 text-[#6200ea]" />
        };
      default:
        return {
          bg: 'bg-white dark:bg-zinc-900',
          border: selected ? 'border-zinc-800 dark:border-zinc-200 ring-2 ring-zinc-800/10' : 'border-zinc-200 dark:border-zinc-800',
          accent: '#18181b',
          tag: 'Node',
          icon: <Bot className="w-3 h-3 text-zinc-800 dark:text-zinc-200" />
        };
    }
  };
 
  const typeStyle = getTypeStyles(data.type);
 
  const handleDerive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // Derive a child node (generation increments in store)
    deriveNode(id, 'llm', prompt);
    setPrompt('');
    setShowPromptInput(false);
  };
 
  return (
    <div 
      data-node-id={id}
      onClick={() => selectNode(id)}
      className={`relative rounded-2xl border bg-white dark:bg-[#181716] shadow-node dark:shadow-none transition-all duration-200 cursor-pointer overflow-visible flex flex-col ${typeStyle.border} ${selected ? 'shadow-md scale-[1.01]' : 'hover:shadow-md'} ${data.justUpdated ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 animate-pulse border-indigo-500 dark:border-indigo-400' : ''}`}
      style={{
        width: rfStyle?.width ?? 260,
        height: data.isCollapsed ? undefined : (rfStyle?.height ?? undefined),
      }}
    >
      {/* React Flow Handles - Styled as clean connect circles on borders */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: typeStyle.accent, 
          width: 8, 
          height: 8, 
          border: '2px solid white', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          left: -4
        }} 
      />
      
      {/* Header Tag Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/60 ${typeStyle.bg} transition-colors duration-200 rounded-t-2xl`}>
        <div className="flex items-center gap-1.5">
          {typeStyle.icon}
          <span className="text-[10px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 font-display">
            {typeStyle.tag}
          </span>
        </div>
        
        {/* Toggle Collapse */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (data.isCollapsed) expandNode(id);
            else collapseNode(id);
          }}
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-350 transition-colors p-0.5 rounded"
        >
          {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
 
      {/* Main Body */}
      {!data.isCollapsed && (
        <div className="p-4 flex-1 flex flex-col min-h-0 relative">
          <h3
            className="font-semibold text-zinc-800 dark:text-zinc-200 font-display mb-1.5 truncate"
            style={{ fontSize: `${Math.round(12 * textScale)}px` }}
          >
            {data.title}
          </h3>
          
          {/* Document File details if Doc node */}
          {data.type === 'doc' && data.sourceFile && (
            <div className="flex items-center gap-3 p-2.5 mb-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/60 transition-colors duration-200">
              <div className="p-2 rounded bg-amber-50 dark:bg-[#6d4c41]/20 text-[#8d6e63] dark:text-[#a1887f]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{data.sourceFile}</p>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500">PDF • 14.8 MB</p>
              </div>
            </div>
          )}
 
          {/* Image Node preview */}
          {data.type === 'image' && (
            <div className="relative w-full h-32 mb-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-center transition-colors duration-200">
              <svg className="w-20 h-20 text-emerald-600/30 dark:text-emerald-500/20" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                <circle cx="50" cy="50" r="1" fill="currentColor" />
              </svg>
              <div className="absolute bottom-2 left-2 right-2 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm px-2 py-1 rounded border border-black/5 dark:border-white/5 transition-colors duration-200">
                <p className="text-[9px] text-zinc-650 dark:text-zinc-350 truncate">{data.imagePrompt || 'Bloch sphere visualization'}</p>
              </div>
            </div>
          )}
 
          {/* Node content area */}
          <div
            className={`nodrag no-canvas-wheel overflow-y-auto leading-relaxed text-zinc-600 dark:text-zinc-300 pr-1 select-text ${rfStyle?.height ? 'flex-1' : 'max-h-48'}`}
            style={{ fontSize: `${Math.round(11 * textScale)}px` }}
          >
            {data.isLoading ? (
              <div className="flex items-center gap-1.5 py-1 text-zinc-400 dark:text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[9px] ml-1">Thinking...</span>
              </div>
            ) : data.isBranchSelection ? (
              <div className="flex flex-col gap-2">
                <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 p-2 rounded-lg font-mono text-[9px] text-zinc-500 dark:text-zinc-400 italic max-h-16 overflow-y-auto transition-colors duration-200">
                  &ldquo;{data.content}&rdquo;
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'explain');
                    }}
                    className="py-1 px-1 rounded bg-purple-50 dark:bg-[#7c4dff]/10 text-[#7c4dff] hover:bg-[#7c4dff] dark:hover:bg-[#7c4dff] hover:text-white dark:hover:text-white border border-[#7c4dff]/20 dark:border-[#7c4dff]/30 text-[9px] font-semibold text-center transition-all"
                  >
                    Explain
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'expand');
                    }}
                    className="py-1 px-1 rounded bg-emerald-50 dark:bg-[#2e7d32]/10 text-[#2e7d32] dark:text-[#4caf50] hover:bg-[#2e7d32] dark:hover:bg-[#2e7d32] hover:text-white dark:hover:text-white border border-[#2e7d32]/20 dark:border-[#2e7d32]/30 text-[9px] font-semibold text-center transition-all"
                  >
                    Expand
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'shorten');
                    }}
                    className="py-1 px-1 rounded bg-amber-50 dark:bg-[#b78103]/10 text-[#b78103] dark:text-[#ffb300] hover:bg-[#b78103] dark:hover:bg-[#b78103] hover:text-white dark:hover:text-white border border-[#d89b00]/20 dark:border-[#d89b00]/30 text-[9px] font-semibold text-center transition-all"
                  >
                    Shorten
                  </button>
                </div>
              </div>
            ) : (
              renderMarkdown(data.content, textScale)
            )}
          </div>
        </div>
      )}
 
      {/* Collapsed view text indicator */}
      {data.isCollapsed && (
        <div className="px-4 py-2 bg-zinc-50/50 dark:bg-zinc-900/20">
          <p className="text-[9px] text-zinc-455 dark:text-zinc-400 italic truncate">{data.content || 'Note node collapsed.'}</p>
        </div>
      )}
 
      {/* Footer Controls */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 transition-colors duration-200 ${!showPromptInput ? 'rounded-b-2xl' : ''}`}>
        {/* Comments Icon / Indicator */}
        <div className="flex items-center gap-1.5 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">
            {data.conversationHistory.filter(h => h.role === 'user').length || 0}
          </span>
        </div>
 
        <div className="flex items-center gap-2">
          {/* Derive button (triggers derivation input box) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowPromptInput(!showPromptInput);
            }}
            title="Derive child node"
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all ${showPromptInput ? 'text-[#7c4dff] bg-purple-50 dark:bg-[#7c4dff]/15' : ''}`}
          >
            <GitBranch className="w-3.5 h-3.5" />
          </button>
 
          {/* Delete node */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            title="Delete node"
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
 
      {/* Inline Child Derivation input form */}
      {showPromptInput && (
        <form 
          onSubmit={handleDerive}
          onClick={(e) => e.stopPropagation()}
          className="border-t border-zinc-100 dark:border-zinc-800/60 p-2.5 bg-zinc-50 dark:bg-zinc-900/40 flex items-center gap-2 transition-colors duration-200 rounded-b-2xl"
        >
          <input 
            type="text"
            placeholder="Derive child topic..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 text-[10px] border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-colors duration-200"
            autoFocus
          />
          <button 
            type="submit" 
            className="p-1 rounded bg-[#7c4dff] text-white hover:bg-[#6200ea] transition-all"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>
      )}
 
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ 
          background: typeStyle.accent, 
          width: 8, 
          height: 8, 
          border: '2px solid white', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          right: -4
        }} 
      />

      {!data.isCollapsed && (
        <NodeResizeControl 
          minWidth={200}
          minHeight={120}
          onResize={(event, params) => {
            updateNodeSizeLocally(id, params.width, params.height);
          }}
          onResizeEnd={(event, params) => {
            updateNodeSize(id, params.width, params.height);
          }}
          className="absolute bottom-[-6px] right-[-6px] cursor-se-resize select-none"
          style={{
            background: 'transparent',
            border: 'none',
            width: 24,
            height: 24,
            zIndex: 10,
          }}
        >
          <div 
            onMouseEnter={() => setIsHoveringResize(true)}
            onMouseLeave={() => setIsHoveringResize(false)}
            className="w-full h-full flex items-center justify-center"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              className="text-zinc-400 dark:text-zinc-650 transition-colors duration-200"
            >
              <path 
                d="M 6 22 A 16 16 0 0 0 22 6" 
                stroke={isHoveringResize ? typeStyle.accent : 'currentColor'} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
        </NodeResizeControl>
      )}
    </div>
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
 
const renderMarkdown = (text: string, textScale = 1): React.ReactNode => {
  if (!text) return null;

  const base = (px: number) => `${Math.round(px * textScale)}px`;

  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} style={{ fontSize: base(11) }} className="font-semibold text-zinc-950 dark:text-white mt-1 mb-0.5">{parseInlineStyles(trimmed.slice(4))}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} style={{ fontSize: base(12) }} className="font-bold text-zinc-950 dark:text-white mt-1.5 mb-1">{parseInlineStyles(trimmed.slice(3))}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} style={{ fontSize: base(14) }} className="font-extrabold text-zinc-950 dark:text-white mt-2 mb-1">{parseInlineStyles(trimmed.slice(2))}</h2>;
        }

        // Unordered lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <ul key={idx} className="list-disc pl-3">
              <li style={{ fontSize: base(11) }} className="text-zinc-600 dark:text-zinc-300">{parseInlineStyles(trimmed.slice(2))}</li>
            </ul>
          );
        }

        // Ordered lists
        const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numListMatch) {
          return (
            <ol key={idx} className="list-decimal pl-3" start={parseInt(numListMatch[1], 10)}>
              <li style={{ fontSize: base(11) }} className="text-zinc-600 dark:text-zinc-300">{parseInlineStyles(numListMatch[2])}</li>
            </ol>
          );
        }

        // Standard Paragraphs
        return (
          <p key={idx} style={{ fontSize: base(11) }} className="text-zinc-650 dark:text-zinc-300 leading-relaxed min-h-[4px]">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
};
 
export default CustomNode;
