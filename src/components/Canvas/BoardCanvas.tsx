"use client";
 
import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  BackgroundVariant,
  MiniMap,
  Panel,
  useReactFlow,
  useViewport
} from 'reactflow';
import 'reactflow/dist/style.css';
 
import { useCanvasStore } from '@/store/canvasStore';
import CustomNode from '../Nodes/CustomNodes';
import { useRouter } from 'next/navigation';
import ContextMenu from '../UI/ContextMenu';
 
// Floating canvas bottom bar
import { Plus, Image as ImageIcon, FileText, ArrowUp, Link2, Sparkles, X } from 'lucide-react';

// Map custom node types outside the component to avoid React Flow performance warning
export const BoardCanvas = () => {
  const nodeTypes = useMemo(() => ({
    llmNode: CustomNode
  }), []);
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
    undoDeleteNode,
    theme,
    broadcastCursor,
    otherUsersCursors,
    newlyCreatedNodeId,
    setNewlyCreatedNodeId,
    isLoadingCanvas,
    selectNode,
    organizeCanvas,
    selectedModel,
    addDocNode
  } = useCanvasStore();
 
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    targetType: 'canvas' | 'node';
    targetNodeId?: string;
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [bottomPrompt, setBottomPrompt] = useState('');
  const [showNodeList, setShowNodeList] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  // Keyboard handlers: Delete/Backspace keys to delete nodes, Ctrl+Z to undo deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      // Handle Delete/Backspace keys
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          e.preventDefault();
          selectedNodes.forEach(n => deleteNode(n.id));
        }
      }

      // Handle Ctrl+Z / Cmd+Z to undo
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
      if (isUndo) {
        e.preventDefault();
        undoDeleteNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, deleteNode, undoDeleteNode]);
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  const lastBroadcast = React.useRef(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastBroadcast.current > 150) { // ~6fps throttle (optimized to save Realtime messages)
      const flowCoords = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      });
      broadcastCursor(flowCoords.x, flowCoords.y);
      lastBroadcast.current = now;
    }
  };

  const handlePaneClick = () => {
    if (contextMenu) setContextMenu(null);
    if (!hasNodes && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePaneContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const flowCoords = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      flowX: flowCoords.x,
      flowY: flowCoords.y,
      targetType: 'canvas'
    });
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: any) => {
    e.preventDefault();
    const flowCoords = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      flowX: flowCoords.x,
      flowY: flowCoords.y,
      targetType: 'node',
      targetNodeId: node.id
    });
  };
 
 
  const triggerError = (msg: string) => {
    setUploadError(msg);
    setTimeout(() => setUploadError(null), 4000);
  };

  const handleUploadClick = (label: string) => {
    if (selectedModel === 'poolside') {
      triggerError("Uploading not supported in this model.");
      return;
    }
    if (fileInputRef.current) {
      if (label === 'Image') {
        fileInputRef.current.accept = 'image/*';
      } else if (label === 'Document') {
        fileInputRef.current.accept = 'application/pdf';
      } else {
        fileInputRef.current.accept = 'application/pdf,image/*';
      }
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      triggerError("Unsupported file type. Please upload an image or PDF.");
      return;
    }

    try {
      await addDocNode(file);
    } catch (err) {
      console.error("Upload error:", err);
      triggerError("Failed to upload and transcribe file.");
    }
    e.target.value = '';
  };

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
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        nodesDraggable={true}
        nodesConnectable={true}
        multiSelectionKeyCode="Control"
        fitView
        minZoom={0.05}
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
 


        {/* Node count box which opens a sorted node list popover on click */}
        <Panel position="top-right" className="z-50 m-4 relative select-none">
          <div className="flex flex-col items-end">
            <button 
              type="button"
              onClick={() => setShowNodeList(!showNodeList)}
              className="bg-white/85 dark:bg-zinc-950/85 hover:bg-white dark:hover:bg-zinc-900 active:scale-95 transition-all backdrop-blur-md border border-white/20 dark:border-zinc-800/50 px-3 py-1.5 rounded-2xl shadow-[0_8px_32px_0_rgba(45,38,32,0.06)] text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#7c4dff]" />
              <span>Nodes: {nodes.length}</span>
            </button>

            {showNodeList && nodes.length > 0 && (
              <div className="mt-2 w-64 bg-white/90 dark:bg-zinc-950/90 border border-white/20 dark:border-zinc-800/50 rounded-[20px] shadow-[0_16px_36px_-6px_rgba(45,38,32,0.12),0_4px_16px_-4px_rgba(45,38,32,0.06)] backdrop-blur-md overflow-hidden flex flex-col z-50 text-left">
                <div className="px-3.5 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Node List</span>
                  <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">Order of Creation</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 no-canvas-wheel nodrag">
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
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-snug">
                        {item.title || 'Untitled Node'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

 
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
        className="fixed left-1/2 w-[90%] max-w-[640px] z-30 transition-all duration-700 ease-in-out flex flex-col items-center"
        style={{
          top: (hasNodes || isLoadingCanvas) ? 'calc(100% - 32px)' : '50%',
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

        {/* Upload Warning Banner */}
        {uploadError && (
          <div className="w-full mb-3 px-4 py-2.5 bg-rose-50/95 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-600 dark:text-rose-300 font-semibold flex items-center justify-between shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="flex items-center gap-1.5">
              <span className="text-sm">⚠️</span>
              {uploadError}
            </span>
            <button 
              type="button" 
              onClick={() => setUploadError(null)} 
              className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 transition-colors p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* The Chat Form */}
        <form 
          onSubmit={handleBottomSubmit}
          className="w-full bg-white/85 dark:bg-[#1a1917]/85 border border-white/25 dark:border-zinc-850/50 shadow-[0_16px_36px_-6px_rgba(45,38,32,0.08),0_4px_16px_-4px_rgba(45,38,32,0.04)] rounded-[24px] p-2.5 flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-300 hover:border-white/40 dark:hover:border-zinc-750/70"
        >
          <div className="flex items-center gap-1.5 px-1.5">
            {[
              { label: 'Attach', icon: <Plus className="w-3.5 h-3.5" /> },
              { label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { label: 'Document', icon: <FileText className="w-3.5 h-3.5" /> }
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                title={btn.label}
                onClick={() => handleUploadClick(btn.label)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[10px] font-semibold"
              >
                {btn.icon}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            ))}
          </div>
  
          <div className="flex-1 flex items-center gap-2 border-l border-black/5 dark:border-white/5 pl-3">
            <input 
              ref={inputRef}
              type="text" 
              placeholder={
                isLoadingCanvas 
                  ? 'Loading canvas...' 
                  : selectedModel === 'poolside'
                    ? 'Ask anything or create a new node... (Poolside)'
                    : `Ask anything or upload a file... (${
                        selectedModel === 'gemini' ? 'Gemini 2.5 Flash' :
                        selectedModel === 'gemini-3.1-flash-lite' ? 'Gemini 3.1 Flash Lite' :
                        selectedModel === 'gemma-4-31b' ? 'Gemma 4 31B' :
                        selectedModel === 'gemini-3-flash' ? 'Gemini 3 Flash' :
                        selectedModel === 'gemini-2.5-flash-lite' ? 'Gemini 2.5 Flash Lite' : 'Gemini'
                      })`
              }
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowX={contextMenu.flowX}
          flowY={contextMenu.flowY}
          targetType={contextMenu.targetType}
          targetNodeId={contextMenu.targetNodeId}
          onClose={() => setContextMenu(null)}
        />
      )}

    </div>
  );
};
export default BoardCanvas;
