"use client";

import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import TopHeader from '@/components/UI/TopHeader';
import LeftSidebar from '@/components/UI/LeftSidebar';
import RightSidebar from '@/components/UI/RightSidebar';
import BoardCanvas from '@/components/Canvas/BoardCanvas';
import SelectionMenu from '@/components/UI/SelectionMenu';
import ChatWorkspace from '@/components/UI/ChatWorkspace';
import { useAuth, useUser } from '@clerk/nextjs';
import { ReactFlowProvider } from 'reactflow';
import { useParams } from 'next/navigation';

const colors = ['#4f46e5', '#7c3aed', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#0ea5e9'];
const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function BoardPage() {
  const { boardId } = useParams() as { boardId: string };
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const { subscribeToCanvas, unsubscribeFromCanvas, theme, currentMode } = useCanvasStore();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const userId = user?.id;

  useEffect(() => {
    if (boardId && isLoaded && userId) {
      const username = user.username || user.firstName || 'User';
      const avatarColor = getAvatarColor(userId);

      subscribeToCanvas(
        boardId, 
        () => getTokenRef.current({ template: 'supabase' }), 
        {
          userId,
          username,
          avatarColor
        },
        () => getTokenRef.current()
      );
    }
    return () => {
      unsubscribeFromCanvas();
    };
  }, [boardId, isLoaded, userId, subscribeToCanvas, unsubscribeFromCanvas]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ReactFlowProvider>
      <main className="w-screen h-dvh relative bg-[#f8f5f0] dark:bg-[#121110] overflow-hidden">
        {/* Top Header Panel (Fixed h-16) */}
        <TopHeader />

        {/* Main Container Layout */}
        {currentMode === 'canvas' ? (
          <div className="w-full h-full flex relative">
            {/* Left Toolbar Sidebar (Fixed w-18, top-16) */}
            <LeftSidebar />

            {/* Board Canvas Workspace */}
            <div className="flex-1 w-full h-full pl-0 md:pl-[72px]">
              <BoardCanvas />
            </div>

            {/* Right Isolated Detail & Chat Sidebar */}
            <RightSidebar />
          </div>
        ) : (
          <div className="w-full h-[calc(100dvh-64px)] mt-16 flex relative overflow-hidden bg-[#f8f5f0] dark:bg-[#121110]">
            <ChatWorkspace />
          </div>
        )}

        {/* Floating inline selection branching menu */}
        {currentMode === 'canvas' && <SelectionMenu />}
      </main>
    </ReactFlowProvider>
  );
}
