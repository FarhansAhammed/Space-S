import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { ArrowRight, X } from 'lucide-react';

export const ChatboxNode = ({ id, data }: any) => {
  const [prompt, setPrompt] = useState('');
  const deleteNode = useCanvasStore(state => state.deleteNode);
  const deriveNode = useCanvasStore(state => state.deriveNode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const parentNodeId = data.parentNodeId;
    const position = data.targetPosition;

    // Trigger deriveNode at this exact flow coordinate
    deriveNode(parentNodeId, 'llm', prompt.trim(), undefined, position);

    // Delete this temporary chatbox node
    deleteNode(id);
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-2 flex items-center gap-2 nodrag"
      style={{ width: 300 }}
    >
      <input 
        type="text"
        placeholder="Derive child topic here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 text-[11px] border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] bg-white/70 dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-200 transition-colors duration-200 font-sans"
        autoFocus
      />
      <button 
        type="submit" 
        className="p-1.5 rounded-lg bg-[#7c4dff] text-white hover:bg-[#6200ea] transition-all flex items-center justify-center shrink-0"
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => deleteNode(id)}
        type="button" 
        className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all flex items-center justify-center shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};

export default ChatboxNode;
