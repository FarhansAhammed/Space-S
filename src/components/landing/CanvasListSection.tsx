"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Plus, Clock, Zap, ArrowRight } from 'lucide-react';

interface DbOwnerProfile {
  username: string;
  avatar_color?: string;
}

interface DbCanvasMember {
  role: string;
  user_id: string;
}

interface DbNodeItem {
  id: string;
}

interface CanvasRecord {
  id: string;
  name: string;
  owner_id: string;
  updated_at: string;
  created_at: string;
  owner: DbOwnerProfile | null;
  canvas_members: DbCanvasMember[];
  nodes: DbNodeItem[];
}

interface CanvasListSectionProps {
  isLoaded: boolean;
  userId: string | null | undefined;
  canvases: CanvasRecord[];
  loadingCanvases: boolean;
  creating: boolean;
  handleCreateCanvas: () => void;
  handleSignIn: () => void;
  handleGoDashboard: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function CanvasListSection({
  isLoaded,
  userId,
  canvases,
  loadingCanvases,
  creating,
  handleCreateCanvas,
  handleSignIn,
  handleGoDashboard,
}: CanvasListSectionProps) {
  const router = useRouter();

  return (
    <section className="py-16 md:py-20 px-4 sm:px-8 border-t border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-white/20 dark:bg-zinc-950/10 backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center md:text-left mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-space-grotesk font-bold text-[#0d1233] dark:text-zinc-50">
              Your Creative Workspaces
            </h2>
            <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 mt-1 max-w-md leading-relaxed">
              Map and explore your active canvas connections, branches, and insights.
            </p>
          </div>
          
          {isLoaded && userId && canvases.length > 0 && (
            <button
              onClick={handleGoDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7c4dff] dark:text-[#a080ff] hover:underline bg-[#7c4dff]/5 dark:bg-[#7c4dff]/10 px-3.5 py-1.5 rounded-lg border border-[#7c4dff]/15"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Go to Canvas Manager</span>
            </button>
          )}
        </div>

        {!isLoaded ? (
          <div className="w-full h-44 flex items-center justify-center bg-white/30 dark:bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-[#7c4dff] animate-spin" />
          </div>
        ) : userId ? (
          loadingCanvases ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-zinc-200/40 dark:bg-zinc-850/40 animate-pulse border border-zinc-200/20" />
              ))}
            </div>
          ) : canvases.length === 0 ? (
            <div className="w-full p-8 md:p-12 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-[#fbf9f6]/40 dark:bg-zinc-950/10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] mb-4">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h4 className="font-space-grotesk font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1.5">No canvases created yet</h4>
              <p className="text-xs text-[#1c1b18]/50 dark:text-[#f3f0ea]/50 max-w-xs mb-6">
                Initialize your first infinite thinking canvas to map ideas and generate AI insight branches.
              </p>
              <button
                onClick={handleCreateCanvas}
                className="h-10 px-5 rounded-xl font-semibold text-xs text-white bg-[#7c4dff] hover:bg-[#6836fc] shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Canvas</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {canvases.slice(0, 6).map((canvas) => {
                const nodeCount = canvas.nodes?.length || 0;
                return (
                  <div
                    key={canvas.id}
                    onClick={() => router.push(`/board/${canvas.id}`)}
                    className="group relative p-5 rounded-2xl border border-zinc-200/65 dark:border-zinc-800/80 bg-white dark:bg-[#161514] hover:bg-white dark:hover:bg-[#1c1a18] shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-20 h-20 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                      <svg className="w-full h-full text-zinc-900 dark:text-white" fill="none" viewBox="0 0 100 100">
                        <circle cx="30" cy="30" r="4" fill="currentColor" />
                        <circle cx="70" cy="40" r="4" fill="currentColor" />
                        <circle cx="50" cy="70" r="4" fill="currentColor" />
                        <line x1="30" y1="30" x2="70" y2="40" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="70" y1="40" x2="50" y2="70" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                          Active Workspace
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                        </span>
                      </div>
                      
                      <h4 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 group-hover:text-[#7c4dff] transition-colors truncate pr-4">
                        {canvas.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 mt-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Edited {formatRelativeTime(canvas.updated_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="w-full p-8 md:p-14 text-center rounded-[24px] border border-dashed border-zinc-300 dark:border-zinc-800 bg-[#fbf9f6]/40 dark:bg-zinc-950/10 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-[#0d1233]/5 dark:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h4 className="font-space-grotesk font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-1.5">Sign in to view your canvases</h4>
            <p className="text-xs text-[#1c1b18]/50 dark:text-[#f3f0ea]/50 max-w-sm mb-6">
              Save, search, sync, and branch your reasoning conversations by logging in. Click below to sign in or get started.
            </p>
            <button
              onClick={handleSignIn}
              className="h-10 px-6 rounded-xl font-semibold text-xs text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#182156] dark:hover:bg-[#6b3bfc] shadow transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sign in to Space S</span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
