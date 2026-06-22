"use client";
 
import React from 'react';
import { 
  Home, 
  Link2, 
  Plus, 
  Minus, 
  Maximize2,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvasStore';
import { useReactFlow, useViewport } from 'reactflow';

export const LeftSidebar = () => {
  const router = useRouter();
  const { getToken } = useAuth();
  const { nodes, addMergeNode, organizeCanvas } = useCanvasStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  const handleCreateNewCanvas = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/canvas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: 'Untitled Canvas' })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.canvas?.id) {
        router.push(`/board/${data.canvas.id}`);
      }
    } catch (e) {
      console.error('Failed to create new empty canvas:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`Error creating canvas: ${errMsg}`);
    }
  };

  const handleOrganizeAction = async () => {
    await organizeCanvas();
    fitView({ duration: 1000, padding: 0.1 });
  };

  const handleMergeAction = () => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedNodeIds.length < 2) {
      alert("Please select at least 2 nodes on the canvas (hold Ctrl & click nodes) to merge them.");
      return;
    }
    addMergeNode(selectedNodeIds, "Synthesize connections between selected topics.");
  };

  const selectedCount = nodes.filter(n => n.selected).length;
  const hasNodes = nodes.length > 0;

  const buttons = [
    { 
      label: 'Home', 
      icon: <Home className="w-4 h-4" />, 
      onClick: () => router.push('/dashboard'),
      tooltip: {
        title: 'Home',
        description: 'Navigate back to your dashboard to view all your boards, templates, and recent files.',
        instruction: 'Click to leave the current board and open the home dashboard.'
      }
    },
    { 
      label: 'Organize', 
      icon: <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400" />, 
      onClick: handleOrganizeAction,
      tooltip: {
        title: 'Organize Canvas',
        description: 'Automatically clean up and auto-arrange all nodes into a structured, readable layout.',
        instruction: 'Arranges nodes using a hierarchical layout to resolve overlaps and restore order.'
      }
    },
    { 
      label: 'Merge', 
      icon: <Link2 className="w-4 h-4 text-violet-500 dark:text-violet-400" />, 
      onClick: handleMergeAction,
      tooltip: {
        title: 'Merge Nodes',
        description: 'Synthesize and merge multiple selected nodes into a single, cohesive AI summary node.',
        instruction: 'Hold Ctrl/Cmd & click to select 2+ nodes, then click this button to synthesize.'
      }
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (visible on md screens and up) */}
      <aside className="hidden md:flex w-[72px] border border-white/20 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex-col items-center py-6 fixed left-4 top-[84px] bottom-4 z-40 justify-between rounded-[24px] shadow-[0_16px_36px_-6px_rgba(45,38,32,0.06)] transition-all duration-200">
        
        {/* Top Buttons & Tabs */}
        <div className="flex flex-col items-center gap-6 w-full">
          {/* New Node trigger (plus icon inside rounded dark square) */}
          <button 
            onClick={handleCreateNewCanvas}
            title="Create New Empty Canvas"
            className="w-11 h-11 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
   
          {/* Vertical Tabs List */}
          <nav className="flex flex-col gap-2.5 w-full px-2">
            {buttons.map((item, idx) => (
              <div key={idx} className="relative group w-full flex justify-center">
                <button
                  onClick={item.onClick}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all gap-1 ${idx === 0 ? 'text-zinc-900 dark:text-zinc-100 bg-black/5 dark:bg-white/5' : ''}`}
                >
                  {item.icon}
                  <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                </button>

                {/* Custom Hover Explanation Tooltip */}
                <div className="absolute left-[56px] top-1/2 -translate-y-1/2 w-64 p-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.12)] backdrop-blur-md text-left opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 translate-x-0 transition-all duration-200 ease-out z-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${
                      item.label === 'Organize' 
                        ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400' 
                        : item.label === 'Merge' 
                          ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400' 
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{item.tooltip.title}</span>
                  </div>
                  <p className="text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed mb-2.5">
                    {item.tooltip.description}
                  </p>
                  <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    How it works
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-450 bg-zinc-50 dark:bg-zinc-950/40 p-2 rounded-lg border border-black/5 dark:border-white/5 leading-normal">
                    {item.tooltip.instruction}
                  </div>

                  {/* Live Contextual Details */}
                  {item.label === 'Organize' && (
                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] font-medium">
                      <span className="text-zinc-400 dark:text-zinc-500">Total nodes:</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono ${
                        hasNodes 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-405 font-semibold' 
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                      }`}>
                        {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
                      </span>
                    </div>
                  )}

                  {item.label === 'Merge' && (
                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] font-medium">
                      <span className="text-zinc-400 dark:text-zinc-500">Selected nodes:</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono ${
                        selectedCount >= 2 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-405 font-bold' 
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-650 dark:text-amber-405'
                      }`}>
                        {selectedCount} selected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>
   
        {/* Bottom Zoom Controls */}
        <div className="flex flex-col items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-11 text-zinc-500 dark:text-zinc-400 transition-colors duration-200">
          <button 
            onClick={() => zoomIn()}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" 
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] font-semibold select-none font-mono py-0.5">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => zoomOut()}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" 
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="w-6 border-t border-black/5 dark:border-white/5 my-0.5"></div>
          <button 
            onClick={() => fitView({ duration: 800 })}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" 
            title="Zoom Fit"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
   
      </aside>

      {/* Mobile Floating Toolbar (Visible only on mobile/tablet screens) */}
      <div className="flex md:hidden fixed left-4 top-[78px] z-40 bg-white/80 dark:bg-zinc-950/80 border border-white/20 dark:border-zinc-850/50 backdrop-blur-md p-1.5 rounded-2xl shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] gap-1 items-center">
        {/* Home Button */}
        <button
          onClick={() => router.push('/dashboard')}
          title="Home"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

        {/* Create New Canvas Button */}
        <button
          onClick={handleCreateNewCanvas}
          title="Create New Empty Canvas"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-850 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

        {/* Organize Canvas Button */}
        <button
          onClick={handleOrganizeAction}
          title="Organize Canvas"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-orange-500 dark:text-orange-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

        {/* Merge Nodes Button */}
        <button
          onClick={handleMergeAction}
          title="Merge Selected Nodes"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-violet-500 dark:text-violet-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};

export default LeftSidebar;
