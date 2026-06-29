import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { ArrowRight, X } from 'lucide-react';
import { Position, Handle } from 'reactflow';

export const ChatboxNode = ({ id, data }: any) => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [contextVisible, setContextVisible] = useState(false);

  const deleteNode = useCanvasStore(state => state.deleteNode);
  const deriveNode = useCanvasStore(state => state.deriveNode);

  const contextChain = data.contextChain || [];
  const parentIds = data.parentIds || [data.parentNodeId];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parentNodeId = data.parentNodeId;
    const position = data.targetPosition;

    try {
      // Trigger deriveNode and wait for database insertion & store creation to complete
      await deriveNode(parentNodeId, 'llm', prompt.trim(), undefined, position, parentIds);
      
      // Node is successfully created and rendered on the canvas. Now transition the chatbox away.
      setIsFadingOut(true);
      setTimeout(() => {
        deleteNode(id);
      }, 300);
    } catch (err) {
      console.error('Failed to derive node:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Left target handle to connect the parent edge lines */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: '#7c4dff', 
          width: 10, 
          height: 10, 
          border: '2px solid #ffffff', 
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.15)',
          left: -5
        }} 
      />

      <form 
        onSubmit={handleSubmit}
        className={`bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-3 flex flex-col gap-2.5 nodrag transition-all duration-300 ease-out transform ${
          isFadingOut ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        style={{ width: 300 }}
      >
        {/* Context Inheritance indicator */}
        {contextChain.length > 0 && (
          <div className="w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setContextVisible(!contextVisible);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50/50 dark:bg-[#7c4dff]/5 hover:bg-purple-100 dark:hover:bg-[#7c4dff]/10 text-[#7c4dff] dark:text-[#be9eff] transition-colors duration-200 text-[9px] font-semibold border border-[#7c4dff]/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-pulse" />
              <span>Context Inherited ({contextChain.length})</span>
              <span className="text-[8px] opacity-70">
                {contextVisible ? '▲' : '▼'}
              </span>
            </button>
            
            {contextVisible && (
              <div className="mt-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl p-2.5 text-[9px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-h-24 overflow-y-auto no-canvas-wheel transition-colors duration-200">
                {contextChain.map((entry: any, i: number) => (
                  <div key={entry.nodeId} className="flex gap-1.5 mb-1.5 last:mb-0">
                    <span className="text-[#7c4dff] shrink-0 font-bold">{i === contextChain.length - 1 ? '↳' : '·'}</span>
                    <span className="break-words">{entry.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input & Action Row */}
        <div className="flex items-center gap-2 w-full">
          <input 
            type="text"
            placeholder="Derive child topic here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 text-[11px] border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] bg-white/70 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-200 transition-colors duration-200 font-sans disabled:opacity-75 disabled:cursor-not-allowed"
            autoFocus
            disabled={isSubmitting}
          />
          <button 
            type="submit" 
            disabled={isSubmitting || !prompt.trim()}
            className="p-1.5 rounded-lg bg-[#7c4dff] text-white hover:bg-[#6200ea] transition-all flex items-center justify-center shrink-0 disabled:opacity-60"
            title={isSubmitting ? 'Deriving node...' : 'Derive node'}
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button 
            onClick={() => deleteNode(id)}
            type="button" 
            disabled={isSubmitting}
            className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
            title="Cancel derivation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatboxNode;
