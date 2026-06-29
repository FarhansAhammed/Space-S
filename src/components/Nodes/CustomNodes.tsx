"use client";
 
import React, { useState } from 'react';
import { Handle, Position, Node, NodeProps, NodeResizeControl } from 'reactflow';
import { MarkdownRenderer } from '../UI/MarkdownRenderer';
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
  const deleteNode = useCanvasStore(state => state.deleteNode);
  const deriveNode = useCanvasStore(state => state.deriveNode);
  const collapseNode = useCanvasStore(state => state.collapseNode);
  const expandNode = useCanvasStore(state => state.expandNode);
  const selectNode = useCanvasStore(state => state.selectNode);
  const triggerNodeOperation = useCanvasStore(state => state.triggerNodeOperation);
  const updateNodeSizeLocally = useCanvasStore(state => state.updateNodeSizeLocally);
  const updateNodeSize = useCanvasStore(state => state.updateNodeSize);

  const theme = useCanvasStore(state => state.theme);

  // Compute creation order index using a Zustand selector to prevent re-rendering when other nodes are dragged
  const nodeIndex = useCanvasStore(state => {
    const getCreationTime = (node: Node<NodeData>): number => {
      const dateStr = node.data.createdAt;
      if (dateStr) {
        const parsed = new Date(dateStr).getTime();
        if (!isNaN(parsed)) return parsed;
      }
      if (node.id && node.id.startsWith('node_')) {
        const parts = node.id.split('_');
        const ts = parseInt(parts[1], 10);
        if (!isNaN(ts)) return ts;
      }
      return 0;
    };

    const sorted = [...state.nodes].sort((a, b) => {
      const timeA = getCreationTime(a);
      const timeB = getCreationTime(b);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });
    return sorted.findIndex(n => n.id === id) + 1;
  });

  // Select width and height separately (primitive values) to avoid re-rendering on other node style/position updates
  const rfWidth = useCanvasStore(state => state.nodes.find(n => n.id === id)?.style?.width);
  const rfHeight = useCanvasStore(state => state.nodes.find(n => n.id === id)?.style?.height);
  
  // Local state for size during active resize dragging to ensure smooth performance without canvas re-renders
  const [localSize, setLocalSize] = useState<{ width: number; height: number | undefined } | null>(null);

  // Compute a text scale factor proportional to the node's current width
  // Base width is 260px — scale grows up to 2× at ~520px+
  const DEFAULT_WIDTH = 260;
  const nodeWidth = localSize?.width ?? (rfWidth as number | undefined) ?? DEFAULT_WIDTH;
  const nodeHeight = data.isCollapsed ? undefined : (localSize?.height ?? (rfHeight as number | undefined));
  const textScale = Math.min(2, Math.max(1, nodeWidth / DEFAULT_WIDTH));
  
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const [contextVisible, setContextVisible] = useState(false);
  const contextChain = data.contextChain;
 
  // Semantic styles mapping based on node type
  const getTypeStyles = (type: NodeType) => {
    switch (type) {
      case 'llm':
        return {
          bg: 'bg-gradient-to-b from-[#f3f1ff] to-[#e6e0ff] dark:from-[#1b152d] dark:to-[#120d20]',
          border: selected ? 'border-[#7c4dff] ring-2 ring-[#7c4dff]/25' : 'border-[#dfd7ff] dark:border-[#3c2f66]',
          accent: '#7c4dff',
          tag: 'AI Response',
          icon: <Sparkles className="w-3.5 h-3.5 text-[#7c4dff]" />
        };
      case 'note':
        return {
          bg: 'bg-gradient-to-b from-[#fffbe6] to-[#fff3cc] dark:from-[#2a2415] dark:to-[#1d190e]',
          border: selected ? 'border-[#b78103] ring-2 ring-[#b78103]/25' : 'border-[#ffe4a3] dark:border-[#594923]',
          accent: '#b78103',
          tag: 'Note',
          icon: <StickyNote className="w-3.5 h-3.5 text-[#b78103]" />
        };
      case 'image':
        return {
          bg: 'bg-gradient-to-b from-[#f2faf4] to-[#e2f5e7] dark:from-[#132318] dark:to-[#0c180f]',
          border: selected ? 'border-[#2e7d32] ring-2 ring-[#2e7d32]/25' : 'border-[#cbeed4] dark:border-[#294a33]',
          accent: '#2e7d32',
          tag: 'Image',
          icon: <ImageIcon className="w-3.5 h-3.5 text-[#2e7d32]" />
        };
      case 'doc':
        return {
          bg: 'bg-gradient-to-b from-[#fff8f2] to-[#ffebd9] dark:from-[#291e17] dark:to-[#1c140f]',
          border: selected ? 'border-[#6d4c41] ring-2 ring-[#6d4c41]/25' : 'border-[#ffd8b3] dark:border-[#543b2b]',
          accent: '#6d4c41',
          tag: 'Document',
          icon: <FileText className="w-3.5 h-3.5 text-[#6d4c41]" />
        };
      case 'question':
        return {
          bg: 'bg-gradient-to-b from-[#fff3f3] to-[#ffe3e3] dark:from-[#2c1515] dark:to-[#1f0e0e]',
          border: selected ? 'border-[#c62828] ring-2 ring-[#c62828]/25' : 'border-[#ffc7c7] dark:border-[#5e2929]',
          accent: '#c62828',
          tag: 'Question',
          icon: <HelpCircle className="w-3.5 h-3.5 text-[#c62828]" />
        };
      case 'branch':
        return {
          bg: 'bg-gradient-to-b from-[#f0fafc] to-[#e0f5fa] dark:from-[#102128] dark:to-[#0a161b]',
          border: selected ? 'border-[#00b8d4] ring-2 ring-[#00b8d4]/25' : 'border-[#bcecf2] dark:border-[#204552]',
          accent: '#00b8d4',
          tag: 'Branch',
          icon: <GitBranch className="w-3.5 h-3.5 text-[#00b8d4]" />
        };
      case 'merge':
        return {
          bg: 'bg-gradient-to-b from-[#faf9ff] to-[#ecdfff] dark:from-[#1b122d] dark:to-[#110b1f]',
          border: selected ? 'border-[#6200ea] ring-2 ring-[#6200ea]/25' : 'border-dashed border-[#e0c4ff] dark:border-dashed dark:border-[#3f256a]',
          accent: '#6200ea',
          tag: 'AI Synthesis',
          icon: <Sparkles className="w-3.5 h-3.5 text-[#6200ea]" />
        };
      default:
        return {
          bg: 'bg-gradient-to-b from-white to-[#faf9f6] dark:from-zinc-900 dark:to-zinc-950',
          border: selected ? 'border-zinc-800 dark:border-zinc-200 ring-2 ring-zinc-800/10' : 'border-zinc-200 dark:border-zinc-800',
          accent: '#18181b',
          tag: 'Node',
          icon: <Bot className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
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
      className={`relative rounded-[20px] border shadow-[0_12px_32px_rgba(45,38,32,0.07),0_2px_8px_rgba(45,38,32,0.04)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_16px_36px_-6px_rgba(45,38,32,0.12),0_4px_16px_-4px_rgba(45,38,32,0.06)] dark:hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.45),0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer overflow-visible flex flex-col ${typeStyle.bg} ${typeStyle.border} ${selected ? 'scale-[1.01]' : ''} ${data.justUpdated ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 animate-pulse border-indigo-500 dark:border-indigo-400' : ''}`}
      style={{
         width: nodeWidth,
         height: nodeHeight ?? undefined,
      }}
    >
      {/* React Flow Handles - Styled as clean connect circles on borders */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: typeStyle.accent, 
          width: 12, 
          height: 12, 
          border: theme === 'dark' ? '2.5px solid #121110' : '2.5px solid #ffffff', 
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.15)',
          left: -8
        }} 
      />
      
      {/* Header Tag Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b border-black/5 dark:border-white/5 bg-transparent transition-colors duration-200 rounded-t-[20px]`}>
        <div className="flex items-center gap-1.5">
          {typeStyle.icon}
          <span className="text-[10px] font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400 font-display">
            NODE {nodeIndex}
          </span>
        </div>
        
        {/* Toggle Collapse */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (data.isCollapsed) expandNode(id);
            else collapseNode(id);
          }}
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
        >
          {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
 
      {/* Main Body */}
      {!data.isCollapsed && (
        <div className="p-4 flex-1 flex flex-col min-h-0 relative">
          <h3
            className="font-semibold text-zinc-800 dark:text-zinc-200 font-display mb-1.5 break-words whitespace-pre-wrap"
            style={{ fontSize: `${Math.round(12 * textScale)}px` }}
          >
            {data.title}
          </h3>

          {/* Context Inheritance indicator */}
          {contextChain && contextChain.length > 0 && (
            <div className="mb-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextVisible(!contextVisible);
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50/50 dark:bg-[#7c4dff]/5 hover:bg-purple-100 dark:hover:bg-[#7c4dff]/10 text-[#7c4dff] dark:text-[#be9eff] transition-colors duration-200 text-[9px] font-semibold border border-[#7c4dff]/10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-pulse" />
                <span>Context Inherited</span>
                <span className="text-[8px] opacity-70">
                  {contextVisible ? '▲' : '▼'}
                </span>
              </button>
              
              {contextVisible && (
                <div className="mt-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl p-2.5 text-[9px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-h-24 overflow-y-auto no-canvas-wheel transition-colors duration-200">
                  {contextChain.map((entry, i) => (
                    <div key={entry.nodeId} className="flex gap-1.5 mb-1 last:mb-0">
                      <span className="text-[#7c4dff] shrink-0 font-bold">{i === contextChain.length - 1 ? '↳' : '·'}</span>
                      <span className="break-words">{entry.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Document File details if Doc node */}
          {data.type === 'doc' && data.sourceFile && (
            <div className="flex items-center gap-3 p-2.5 mb-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-colors duration-200">
              <div className="p-2 rounded bg-amber-50 dark:bg-[#6d4c41]/20 text-[#8d6e63] dark:text-[#a1887f]">
                {data.sourceFile.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/) ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{data.sourceFile}</p>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                  {data.sourceFile.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/) ? 'Image' : 'PDF'} 
                  {data.fileSize ? ` • ${data.fileSize}` : ''}
                </p>
              </div>
            </div>
          )}
 
          {/* Image Node preview */}
          {data.type === 'image' && (
            <div className="relative w-full h-32 mb-3 bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden border border-black/5 dark:border-white/5 flex items-center justify-center transition-colors duration-200">
              <svg className="w-20 h-20 text-emerald-600/30 dark:text-emerald-500/20" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
                <circle cx="50" cy="50" r="1" fill="currentColor" />
              </svg>
              <div className="absolute bottom-2 left-2 right-2 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm px-2 py-1 rounded border border-black/5 dark:border-white/5 transition-colors duration-200">
                <p className="text-[9px] text-zinc-600 dark:text-zinc-300 truncate">{data.imagePrompt || 'Bloch sphere visualization'}</p>
              </div>
            </div>
          )}
 
          {/* Node content area */}
          <div
            className={`nodrag no-canvas-wheel overflow-y-auto break-words whitespace-normal leading-relaxed text-zinc-600 dark:text-zinc-300 pr-1 select-text ${rfHeight ? 'flex-1' : 'max-h-48'}`}
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
                <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-2 rounded-xl font-mono text-[9px] text-zinc-500 dark:text-zinc-400 italic max-h-16 overflow-y-auto transition-colors duration-200">
                  &ldquo;{data.content}&rdquo;
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'explain');
                    }}
                    className="py-1 px-1 rounded-full bg-purple-50 dark:bg-[#7c4dff]/10 text-[#7c4dff] hover:bg-[#7c4dff] dark:hover:bg-[#7c4dff] hover:text-white dark:hover:text-white border border-[#7c4dff]/20 dark:border-[#7c4dff]/30 text-[9px] font-semibold text-center transition-all hover:shadow-sm"
                  >
                    Explain
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'expand');
                    }}
                    className="py-1 px-1 rounded-full bg-emerald-50 dark:bg-[#2e7d32]/10 text-[#2e7d32] dark:text-[#4caf50] hover:bg-[#2e7d32] dark:hover:bg-[#2e7d32] hover:text-white dark:hover:text-white border border-[#2e7d32]/20 dark:border-[#2e7d32]/30 text-[9px] font-semibold text-center transition-all hover:shadow-sm"
                  >
                    Expand
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNodeOperation(id, 'shorten');
                    }}
                    className="py-1 px-1 rounded-full bg-amber-50 dark:bg-[#b78103]/10 text-[#b78103] dark:text-[#ffb300] hover:bg-[#b78103] dark:hover:bg-[#b78103] hover:text-white dark:hover:text-white border border-[#d89b00]/20 dark:border-[#d89b00]/30 text-[9px] font-semibold text-center transition-all hover:shadow-sm"
                  >
                    Shorten
                  </button>
                </div>
              </div>
            ) : (
              <MarkdownRenderer content={data.content} textScale={textScale} isLoading={data.isLoading} />
            )}
          </div>
        </div>
      )}
 
      {/* Collapsed view text indicator */}
      {data.isCollapsed && (
        <div className="px-4 py-2 bg-black/5 dark:bg-white/5 rounded-b-[20px]">
          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 italic truncate">{data.content || 'Node collapsed.'}</p>
        </div>
      )}
 
      {/* Footer Controls */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-colors duration-200 ${!showPromptInput ? 'rounded-b-[20px]' : ''}`}>
        {/* Comments Icon / Indicator */}
        <div className="flex items-center gap-1.5 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
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
            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all ${showPromptInput ? 'text-[#7c4dff] bg-purple-50 dark:bg-[#7c4dff]/15' : ''}`}
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
          className="border-t border-black/5 dark:border-white/5 p-2.5 bg-black/5 dark:bg-white/5 flex items-center gap-2 transition-colors duration-200 rounded-b-[20px]"
        >
          <input 
            type="text"
            placeholder="Derive child topic..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 text-[10px] border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] bg-white/70 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-200 transition-colors duration-200"
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
          width: 12, 
          height: 12, 
          border: theme === 'dark' ? '2.5px solid #121110' : '2.5px solid #ffffff', 
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.15)',
          right: -8
        }} 
      />
 
      {!data.isCollapsed && (
        <NodeResizeControl 
          minWidth={200}
          minHeight={120}
          onResize={(event, params) => {
            setLocalSize({ width: params.width, height: params.height });
          }}
          onResizeEnd={(event, params) => {
            setLocalSize(null);
            updateNodeSizeLocally(id, params.width, params.height);
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
 
export default CustomNode;
