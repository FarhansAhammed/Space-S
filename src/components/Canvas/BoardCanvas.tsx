"use client";
 
import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useViewport
} from 'reactflow';
import 'reactflow/dist/style.css';
 
import { useCanvasStore } from '@/store/canvasStore';
import CustomNode from '../Nodes/CustomNodes';
import { useRouter } from 'next/navigation';
 
// Floating canvas bottom bar
import { Plus, Image as ImageIcon, FileText, Globe, ArrowUp, Link2, Sparkles } from 'lucide-react';
 
export const BoardCanvas = () => {
  const router = useRouter();
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    addLLMNodeFromSearch,
    addMergeNode,
    deleteNode,
    theme,
    broadcastCursor,
    otherUsersCursors,
    newlyCreatedNodeId,
    setNewlyCreatedNodeId,
    isLoadingCanvas,
    selectNode,
    organizeCanvas
  } = useCanvasStore();
 
  const [bottomPrompt, setBottomPrompt] = useState('');
  const [showNodeList, setShowNodeList] = useState(false);
  const hasNodes = nodes.length > 0;

  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const timeA = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      const timeB = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [nodes]);

  const nodeItems = useMemo(() => {
    return sortedNodes.map((n, idx) => ({
      id: n.id,
      number: idx + 1,
      title: n.data.title,
      position: n.position
    }));
  }, [sortedNodes]);

 
  const { screenToFlowPosition, setCenter, fitView } = useReactFlow();

  React.useEffect(() => {
    if (newlyCreatedNodeId) {
      const targetNode = nodes.find(n => n.id === newlyCreatedNodeId);
      if (targetNode) {
        setCenter(targetNode.position.x + 130, targetNode.position.y + 100, {
          zoom: 1.05,
          duration: 800
        });
        setNewlyCreatedNodeId(null);
      }
    }
  }, [newlyCreatedNodeId, nodes, setCenter, setNewlyCreatedNodeId]);

  // Keyboard Delete key: delete all currently selected nodes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;
      // Don't fire when user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      const selectedNodes = nodes.filter(n => n.selected);
      selectedNodes.forEach(n => deleteNode(n.id));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, deleteNode]);
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  const lastBroadcast = React.useRef(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastBroadcast.current > 30) { // ~30fps throttle
      const flowCoords = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      broadcastCursor(flowCoords.x, flowCoords.y);
      lastBroadcast.current = now;
    }
  };

  // Map custom node types
  const nodeTypes = useMemo(() => ({
    llmNode: CustomNode
  }), []);
 
  const handleBottomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomPrompt.trim()) return;
 
    addLLMNodeFromSearch(bottomPrompt.trim());
    setBottomPrompt('');
  };
 
  // Action: Trigger merge synthesis between connected nodes
  const handleMergeAction = () => {
    // Collect all nodes that are currently selected, or just merge the first two for demo
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedNodeIds.length < 2) {
      alert("Please select at least 2 nodes on the canvas (hold Shift and click nodes) to merge them.");
      return;
    }
    addMergeNode(selectedNodeIds, "Synthesize connections between selected topics.");
  };

  const handleOrganizeAction = async () => {
    await organizeCanvas();
    fitView({ duration: 1000, padding: 0.1 });
  };
 
  // Skeleton node configs: position, size and color accent to mimic real varied nodes
  const skeletonNodes = [
    { top: '18%', left: '12%', width: 240, color: '#7c4dff' },
    { top: '28%', left: '44%', width: 280, color: '#00b8d4' },
    { top: '52%', left: '24%', width: 220, color: '#ff9100' },
  ];

  return (
    <div 
      className="w-full h-full relative" 
      style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}
      onMouseMove={handleMouseMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        multiSelectionKeyCode="Control"
        fitView
        noWheelClassName="no-canvas-wheel"
        className={theme === 'dark' ? "bg-[#121110] transition-colors duration-200" : "bg-[#f8f5f0] transition-colors duration-200"} // Match exact light/dark warm background
      >
        {/* Warm grey dots background - updates dynamically */}
        <Background 
          color={theme === 'dark' ? "#3a3834" : "#d0cbbf"} 
          gap={22} 
          size={1.5} 
          variant={BackgroundVariant.Dots} 
        />
 
        {/* Custom Panel: Toolbar at top-left */}
        {nodes.length >= 1 && (
          <Panel position="top-left" className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/80 p-2.5 rounded-xl shadow-sm flex items-center gap-2 m-4 transition-colors">
            <button 
              onClick={handleOrganizeAction}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ff5722] to-[#ff9100] text-white hover:from-[#f4511e] hover:to-[#ff8000] active:scale-95 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Organize Canvas</span>
              <span className="inline sm:hidden">Organize</span>
            </button>

            {nodes.length >= 2 && (
              <>
                <div className="h-4 w-px bg-zinc-250 dark:bg-zinc-800" />
                <button 
                  onClick={handleMergeAction}
                  className="px-3 py-1.5 rounded-lg bg-[#7c4dff] text-white hover:bg-[#6200ea] active:scale-95 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Merge Nodes</span>
                  <span className="inline sm:hidden">Merge</span>
                </button>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[150px] leading-tight hidden sm:inline">
                  Hold Ctrl & click to select multiple, then merge
                </span>
              </>
            )}
          </Panel>
        )}

        {/* Node count box which opens a sorted node list popover on click */}
        <Panel position="top-right" className="z-50 m-4 relative select-none">
          <div className="flex flex-col items-end">
            <button 
              type="button"
              onClick={() => setShowNodeList(!showNodeList)}
              className="bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/80 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-semibold text-zinc-650 dark:text-zinc-350 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#7c4dff]" />
              <span>Nodes: {nodes.length}</span>
            </button>

            {showNodeList && nodes.length > 0 && (
              <div className="mt-2 w-64 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-glass backdrop-blur-md overflow-hidden flex flex-col z-50 text-left">
                <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Node List</span>
                  <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">Order of Creation</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-850 no-canvas-wheel nodrag">
                  {nodeItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        selectNode(item.id);
                        setCenter(item.position.x + 130, item.position.y + 100, {
                          zoom: 1.05,
                          duration: 800
                        });
                        setShowNodeList(false);
                      }}
                      className="w-full px-3.5 py-2.5 hover:bg-[#7c4dff]/5 dark:hover:bg-[#7c4dff]/10 text-left transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <span className="font-bold text-[#7c4dff] text-[10px] bg-[#7c4dff]/10 px-1.5 py-0.5 rounded leading-none shrink-0 mt-0.5">
                        #{item.number}
                      </span>
                      <span className="font-medium text-zinc-755 dark:text-zinc-300 line-clamp-2 leading-snug">
                        {item.title || 'Untitled Node'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
 
        {/* React Flow Controls - placed bottom-left */}
        {hasNodes && (
          <Controls 
            className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm rounded-lg p-1 transition-colors"
            showInteractive={false}
          />
        )}
 
        {/* React Flow MiniMap - styled transparently matching beige theme */}
        {hasNodes && (
          <MiniMap 
            className="bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-sm !m-4 transition-colors"
            nodeColor={(n) => {
              if (theme === 'dark') {
                if (n.data.type === 'llm') return '#2c1e54';
                if (n.data.type === 'note') return '#3e2e0e';
                if (n.data.type === 'image') return '#172e1c';
                if (n.data.type === 'doc') return '#2b211d';
                return '#3d1c1c';
              }
              if (n.data.type === 'llm') return '#e8e2ff';
              if (n.data.type === 'note') return '#fff8e1';
              if (n.data.type === 'image') return '#e8f5e9';
              if (n.data.type === 'doc') return '#efebe9';
              return '#ffebee';
            }}
            maskColor={theme === 'dark' ? "rgba(18, 17, 16, 0.6)" : "rgba(248, 245, 240, 0.6)"}
          />
        )}
      </ReactFlow>
 
      {/* Skeleton Loading Overlay - shown while active canvas data is loading */}
      {isLoadingCanvas && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center overflow-hidden ${
            theme === 'dark' ? 'bg-[#121110]' : 'bg-[#f8f5f0]'
          }`}
        >
          {/* Dotted background matching canvas theme */}
          <svg className="absolute inset-0 w-full h-full opacity-30" style={{ pointerEvents: 'none' }}>
            <defs>
              <pattern id="skeletonDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill={theme === 'dark' ? '#3a3834' : '#d0cbbf'} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#skeletonDots)" />
          </svg>

          {/* Animated SVG curved connector lines between skeleton nodes */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* Node 1 → Node 2 */}
            <path
              d="M 320 230 C 420 230 460 330 550 340"
              fill="none"
              stroke={theme === 'dark' ? '#7c4dff44' : '#7c4dff33'}
              strokeWidth="2.5"
              strokeDasharray="8 6"
              className="animate-pulse"
            />
            {/* Node 2 → Node 3 */}
            <path
              d="M 560 380 C 530 440 400 480 430 520"
              fill="none"
              stroke={theme === 'dark' ? '#00b8d444' : '#00b8d433'}
              strokeWidth="2.5"
              strokeDasharray="8 6"
              className="animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </svg>

          {/* Skeleton node cards */}
          {skeletonNodes.map((node, i) => (
            <div
              key={i}
              className={`absolute rounded-2xl border shadow-sm animate-pulse ${
                theme === 'dark'
                  ? 'bg-zinc-900/70 border-zinc-800/80'
                  : 'bg-white/80 border-zinc-200/70'
              }`}
              style={{
                top: node.top,
                left: node.left,
                width: node.width,
                animationDelay: `${i * 150}ms`
              }}
            >
              {/* Node header bar */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: node.color + '66', animationDelay: `${i * 200}ms` }}
                />
                <div
                  className={`h-2 rounded-full ${
                    theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'
                  }`}
                  style={{ width: node.width * 0.4 }}
                />
              </div>
              {/* Node body lines */}
              <div className="p-3 flex flex-col gap-2">
                <div className={`h-2.5 rounded-full ${ theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100' }`} style={{ width: '100%' }} />
                <div className={`h-2 rounded-full ${ theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100' }`} style={{ width: '75%' }} />
                <div className={`h-2 rounded-full ${ theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100' }`} style={{ width: '85%' }} />
                <div className={`h-2 rounded-full ${ theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100' }`} style={{ width: '60%' }} />
              </div>
            </div>
          ))}

          {/* Bottom loading text */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 select-none">Loading canvas...</span>
          </div>
        </div>
      )}

      {/* Floating Main Chat Box Container */}
      <div 
        className="absolute left-1/2 w-[90%] max-w-[640px] z-30 transition-all duration-700 ease-in-out flex flex-col items-center"
        style={{
          top: (hasNodes || isLoadingCanvas) ? 'calc(100% - 24px)' : '50%',
          transform: (hasNodes || isLoadingCanvas) ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)',
        }}
      >
        {/* Onboarding Header */}
        <div className={`text-center w-full transition-all duration-500 ease-in-out ${
          (hasNodes || isLoadingCanvas)
            ? 'opacity-0 scale-95 max-h-0 mb-0 pointer-events-none overflow-hidden' 
            : 'opacity-100 scale-100 max-h-[220px] mb-8'
        }`}>
          {/* Brand/Logo Icon */}
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Space S Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-display mb-3 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-[#7c4dff] to-[#ff5722] dark:from-zinc-50 dark:via-[#9e75ff] dark:to-[#ff7a47]">
            Space S
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[360px] mx-auto font-sans leading-relaxed">
            A free-form AI canvas for non linear thinking. Type your first topic or question below to visualize it.
          </p>
        </div>
 
        {/* The Chat Form */}
        <form 
          onSubmit={handleBottomSubmit}
          className="w-full bg-white/95 dark:bg-[#1e1d1a]/95 border border-zinc-200/60 dark:border-zinc-800/80 shadow-glass rounded-2xl p-2.5 flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-305 hover:border-zinc-350 dark:hover:border-zinc-700/80"
        >
          <div className="flex items-center gap-1 px-1.5">
            {[
              { label: 'Attach', icon: <Plus className="w-3.5 h-3.5" /> },
              { label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { label: 'Document', icon: <FileText className="w-3.5 h-3.5" /> },
              { label: 'Web', icon: <Globe className="w-3.5 h-3.5" /> }
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                title={btn.label}
                className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-[10px] font-semibold"
              >
                {btn.icon}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            ))}
          </div>
 
          <div className="flex-1 flex items-center gap-2 border-l border-zinc-100 dark:border-zinc-800/80 pl-3">
            <input 
              type="text" 
              placeholder={isLoadingCanvas ? 'Loading canvas...' : 'Ask anything or create a new node...'}
              value={bottomPrompt}
              onChange={(e) => setBottomPrompt(e.target.value)}
              disabled={isLoadingCanvas}
              className="w-full border-none outline-none text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 bg-transparent py-1.5 disabled:cursor-wait"
            />
            <button 
              type="submit"
              disabled={!bottomPrompt.trim() || isLoadingCanvas}
              className="w-8 h-8 rounded-full bg-[#7c4dff] text-white flex items-center justify-center hover:bg-[#6200ea] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </form>
 
        {/* Load Sample Board Action */}
        {!hasNodes && !isLoadingCanvas && (
          <button
            type="button"
            onClick={() => router.push('/board/sample-board')}
            className="mt-4 text-xs font-semibold text-[#7c4dff] hover:text-[#6200ea] dark:text-[#a380ff] dark:hover:text-[#be9eff] transition-colors flex items-center gap-1.5 opacity-90 hover:opacity-100"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Or, load the sample board to see how it works</span>
          </button>
        )}
      </div>

      {/* Other users live cursors */}
      {Object.keys(otherUsersCursors).map(userId => {
        const cursor = otherUsersCursors[userId];
        const screenX = cursor.x * vpZoom + vpX;
        const screenY = cursor.y * vpZoom + vpY;
        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-50 flex flex-col items-start transition-all duration-75"
            style={{
              left: screenX,
              top: screenY,
            }}
          >
            <svg 
              className="w-5 h-5 drop-shadow" 
              viewBox="0 0 24 24" 
              fill="none" 
              style={{ color: cursor.avatarColor }}
            >
              <path 
                d="M5.5 3.21V20.21L10.18 15.53L16.29 21.64L19.14 18.79L13.03 12.68L18.79 12.68L5.5 3.21Z" 
                fill="currentColor" 
                stroke="white" 
                strokeWidth="1.5" 
              />
            </svg>
            <div 
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap mt-1 select-none"
              style={{ backgroundColor: cursor.avatarColor }}
            >
              {cursor.username}
            </div>
          </div>
        );
      })}

    </div>
  );
};
export default BoardCanvas;
