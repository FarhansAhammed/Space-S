"use client";

import React, { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

export const SelectionMenu = () => {
  const { addSelectionBranchNode, activeNodeId } = useCanvasStore();
  const [selectedText, setSelectedText] = useState('');
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setMenuPosition(null);
        setSelectedText('');
        setParentNodeId(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setMenuPosition(null);
        return;
      }

      // Find if selection is inside a node or the sidebar chatbox
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      const anchorElement = anchorNode.parentElement;
      if (!anchorElement) return;

      // Only allow selection inside designated select-text containers
      const selectTextContainer = anchorElement.closest('.select-text');
      if (!selectTextContainer) {
        setMenuPosition(null);
        return;
      }

      // Case 1: inside React Flow custom node
      const nodeContainer = selectTextContainer.closest('[data-node-id]');
      
      // Case 2: inside sidebar chat
      const sidebarContainer = selectTextContainer.closest('.no-canvas-wheel');

      let parentId: string | null = null;
      if (nodeContainer) {
        parentId = nodeContainer.getAttribute('data-node-id');
      } else if (sidebarContainer && activeNodeId) {
        parentId = activeNodeId;
      }

      if (!parentId) {
        setMenuPosition(null);
        return;
      }

      // Calculate position coordinates
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Place menu centered above the selection rect
        setMenuPosition({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top - 40 + window.scrollY
        });
        setSelectedText(text);
        setParentNodeId(parentId);
      } catch {
        // Range selection error catch
        setMenuPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [activeNodeId]);

  const handleCreateBranch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!parentNodeId || !selectedText) return;

    addSelectionBranchNode(parentNodeId, selectedText);
    
    // Clear selection to dismiss menu
    window.getSelection()?.removeAllRanges();
    setMenuPosition(null);
  };

  if (!menuPosition) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
        transform: 'translateX(-50%)',
        zIndex: 9999
      }}
      className="animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      <button
        onClick={handleCreateBranch}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white font-medium text-[10px] uppercase tracking-wide hover:bg-zinc-800 transition-all shadow-md border border-white/10"
      >
        <GitBranch className="w-3.5 h-3.5 text-[#7c4dff]" />
        <span>Create Child Node</span>
      </button>
    </div>
  );
};
export default SelectionMenu;
