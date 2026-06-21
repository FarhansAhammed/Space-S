"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Sparkles, 
  Undo2, 
  Redo2, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Link2, 
  StickyNote, 
  Eye, 
  EyeOff, 
  Search,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { useCanvasStore, NodeType } from '@/store/canvasStore';
import { useReactFlow } from 'reactflow';

interface ContextMenuProps {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  targetType: 'canvas' | 'node';
  targetNodeId?: string;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  flowX,
  flowY,
  targetType,
  targetNodeId,
  onClose
}) => {
  const { 
    nodes, 
    deleteNode, 
    undoDeleteNode, 
    deletedNodesHistory, 
    organizeCanvas, 
    addNodeAtPosition,
    deriveNode,
    addMergeNode,
    collapseNode,
    expandNode,
    triggerNodeOperation
  } = useCanvasStore();

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [activeSubView, setActiveSubView] = useState<'main' | 'createNode' | 'createNote' | 'createBranch' | 'mergeNodes'>('main');
  const [inputText, setInputText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Adjust positioning to avoid going off screen edges
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let left = x;
      let top = y;

      if (x + rect.width > screenWidth) {
        left = screenWidth - rect.width - 12;
      }
      if (y + rect.height > screenHeight) {
        top = screenHeight - rect.height - 12;
      }

      setAdjustedPos({ left, top });
    }
  }, [x, y, activeSubView]);

  // Active selections
  const selectedNodes = nodes.filter(n => n.selected);
  const selectedCount = selectedNodes.length;
  const targetNode = targetNodeId ? nodes.find(n => n.id === targetNodeId) : null;
  const isTargetNodeSelected = targetNode?.selected;

  // Handlers
  const handleCreateNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onClose();
    await addNodeAtPosition('llm', flowX, flowY, inputText.trim());
  };

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onClose();
    await addNodeAtPosition('note', flowX, flowY, inputText.trim());
  };

  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !targetNodeId) return;
    onClose();
    await deriveNode(targetNodeId, 'llm', inputText.trim());
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = selectedNodes.map(n => n.id);
    if (ids.length < 2) return;
    onClose();
    await addMergeNode(ids, inputText.trim() || "Synthesize connections between selected topics.");
  };

  // Render Sub Views
  if (activeSubView === 'createNode') {
    return (
      <div 
        ref={menuRef}
        style={{ left: adjustedPos.left, top: adjustedPos.top }}
        className="fixed bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/50 dark:border-zinc-800/80 backdrop-blur-md shadow-2xl rounded-2xl p-3 z-[100] w-64 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
          Create AI Node
        </div>
        <form onSubmit={handleCreateNodeSubmit} className="flex flex-col gap-2">
          <input 
            autoFocus
            type="text"
            placeholder="Type a topic or question..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500 transition-colors"
          />
          <div className="flex justify-end gap-1.5">
            <button 
              type="button" 
              onClick={() => setActiveSubView('main')}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (activeSubView === 'createNote') {
    return (
      <div 
        ref={menuRef}
        style={{ left: adjustedPos.left, top: adjustedPos.top }}
        className="fixed bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/50 dark:border-zinc-800/80 backdrop-blur-md shadow-2xl rounded-2xl p-3 z-[100] w-64 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
          Create Sticky Note
        </div>
        <form onSubmit={handleCreateNoteSubmit} className="flex flex-col gap-2">
          <textarea 
            autoFocus
            placeholder="Write note contents..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            rows={3}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-amber-500 transition-colors resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button 
              type="button" 
              onClick={() => setActiveSubView('main')}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (activeSubView === 'createBranch') {
    return (
      <div 
        ref={menuRef}
        style={{ left: adjustedPos.left, top: adjustedPos.top }}
        className="fixed bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/50 dark:border-zinc-800/80 backdrop-blur-md shadow-2xl rounded-2xl p-3 z-[100] w-64 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
          Create AI Branch
        </div>
        <form onSubmit={handleCreateBranchSubmit} className="flex flex-col gap-2">
          <input 
            autoFocus
            type="text"
            placeholder="Describe the branch topic..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-violet-500 transition-colors"
          />
          <div className="flex justify-end gap-1.5">
            <button 
              type="button" 
              onClick={() => setActiveSubView('main')}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors"
            >
              Branch Node
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (activeSubView === 'mergeNodes') {
    return (
      <div 
        ref={menuRef}
        style={{ left: adjustedPos.left, top: adjustedPos.top }}
        className="fixed bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/50 dark:border-zinc-800/80 backdrop-blur-md shadow-2xl rounded-2xl p-3 z-[100] w-64 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1">
          Merge Selected Nodes ({selectedCount})
        </div>
        <form onSubmit={handleMergeSubmit} className="flex flex-col gap-2">
          <input 
            autoFocus
            type="text"
            placeholder="Custom instructions (optional)..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#7c4dff] transition-colors"
          />
          <div className="flex justify-end gap-1.5">
            <button 
              type="button" 
              onClick={() => setActiveSubView('main')}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              Back
            </button>
            <button 
              type="submit" 
              className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[#7c4dff] hover:bg-[#6200ea] text-white shadow-sm transition-colors"
            >
              Synthesize Merge
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Main Menu Render ---
  return (
    <div 
      ref={menuRef}
      style={{ left: adjustedPos.left, top: adjustedPos.top }}
      className="fixed bg-white/80 dark:bg-zinc-950/80 border border-white/20 dark:border-zinc-850/50 backdrop-blur-md shadow-[0_16px_36px_-6px_rgba(45,38,32,0.15)] rounded-[20px] p-1.5 z-[100] w-56 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. Multi-selection Options */}
      {selectedCount >= 2 ? (
        <>
          <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3.5 py-1.5 select-none">
            Selected: {selectedCount} Nodes
          </div>
          <button 
            onClick={() => setActiveSubView('mergeNodes')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#7c4dff] dark:text-[#a380ff] hover:bg-[#7c4dff]/5 dark:hover:bg-[#7c4dff]/10 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Sparkles className="w-4 h-4" />
            <span>Merge selected ({selectedCount})</span>
          </button>
          <button 
            onClick={() => {
              onClose();
              selectedNodes.forEach(n => deleteNode(n.id));
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete selected ({selectedCount})</span>
          </button>
        </>
      ) : targetType === 'node' && targetNode ? (
        // 2. Single Node Options
        <>
          <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3.5 py-1.5 select-none truncate">
            Node: {targetNode.data.title || "Untitled"}
          </div>
          <button 
            onClick={() => setActiveSubView('createBranch')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Link2 className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span>Create AI Branch...</span>
          </button>
          
          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* AI operations */}
          {targetNode.data.type !== 'note' && (
            <>
              <button 
                onClick={async () => {
                  onClose();
                  await triggerNodeOperation(targetNode.id, 'explain');
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
              >
                <HelpCircle className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Explain Concept</span>
              </button>
              <button 
                onClick={async () => {
                  onClose();
                  await triggerNodeOperation(targetNode.id, 'expand');
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
              >
                <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                <span>Expand in Detail</span>
              </button>
              <button 
                onClick={async () => {
                  onClose();
                  await triggerNodeOperation(targetNode.id, 'shorten');
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
              >
                <Maximize2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Summarize / Shorten</span>
              </button>
              
              <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
            </>
          )}

          {/* Visibility Toggle / Collapse */}
          <button 
            onClick={() => {
              onClose();
              if (targetNode.data.isCollapsed) {
                expandNode(targetNode.id);
              } else {
                collapseNode(targetNode.id);
              }
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            {targetNode.data.isCollapsed ? (
              <>
                <Eye className="w-4 h-4 text-zinc-500" />
                <span>Expand Node UI</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-zinc-500" />
                <span>Collapse Node UI</span>
              </>
            )}
          </button>

          <button 
            onClick={() => {
              onClose();
              // Update node selection manually
              useCanvasStore.setState(state => ({
                nodes: state.nodes.map(n => n.id === targetNode.id ? { ...n, selected: !n.selected } : n)
              }));
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Plus className="w-4 h-4 text-zinc-500" />
            <span>{isTargetNodeSelected ? 'Deselect Node' : 'Select Node'}</span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* Delete Node */}
          <button 
            onClick={() => {
              onClose();
              deleteNode(targetNode.id);
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Node</span>
          </button>
        </>
      ) : (
        // 3. Canvas (Pane) Options
        <>
          <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3.5 py-1.5 select-none">
            Canvas Options
          </div>
          <button 
            onClick={() => setActiveSubView('createNode')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Plus className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span>Create AI Node...</span>
          </button>
          <button 
            onClick={() => setActiveSubView('createNote')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <StickyNote className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Create Sticky Note...</span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          <button 
            onClick={async () => {
              onClose();
              await organizeCanvas();
              fitView({ duration: 800, padding: 0.1 });
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span>Auto-Arrange Canvas</span>
          </button>

          <button 
            onClick={() => {
              onClose();
              undoDeleteNode();
            }}
            disabled={deletedNodesHistory.length === 0}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Undo2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>Undo Delete</span>
          </button>

          <button 
            disabled
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Redo2 className="w-4 h-4 text-zinc-400" />
            <span>Redo</span>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* View controls */}
          <button 
            onClick={() => {
              onClose();
              fitView({ duration: 800 });
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <Maximize2 className="w-4 h-4 text-zinc-550 dark:text-zinc-450" />
            <span>Fit Canvas View</span>
          </button>

          <button 
            onClick={() => {
              onClose();
              zoomIn();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <ZoomIn className="w-4 h-4 text-zinc-550 dark:text-zinc-450" />
            <span>Zoom In</span>
          </button>

          <button 
            onClick={() => {
              onClose();
              zoomOut();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-all text-left w-full"
          >
            <ZoomOut className="w-4 h-4 text-zinc-550 dark:text-zinc-450" />
            <span>Zoom Out</span>
          </button>
        </>
      )}
    </div>
  );
};
export default ContextMenu;
