"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  Sun, 
  Moon, 
  Check, 
  X, 
  LayoutGrid,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';

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

// Relative time formatter
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

// Shared helper: build auth headers from Clerk token
async function authHeaders(getToken: () => Promise<string | null>) {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { theme, toggleTheme } = useCanvasStore();

  const [canvases, setCanvases] = useState<CanvasRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Sync theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch canvases via API route (uses admin client, no RLS issue)
  const fetchCanvases = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/list', { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setCanvases(data.canvases ?? []);
    } catch (e) {
      console.error('Failed to load canvases:', e);
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  // Create canvas
  const handleCreateCanvas = async () => {
    setCreating(true);
    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/create', {
        method: 'POST',
        headers,
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
      console.error(e);
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`Failed to create canvas: ${errMsg}`);
    } finally {
      setCreating(false);
    }
  };

  // Delete canvas via API route
  const handleDeleteCanvas = async (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) return;

    try {
      const headers = await authHeaders(getToken);
      const response = await fetch(`/api/canvas/manage?canvasId=${canvasId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      setCanvases(prev => prev.filter(c => c.id !== canvasId));
    } catch (e) {
      console.error('Failed to delete canvas:', e);
      alert('Failed to delete canvas.');
    }
  };

  // Rename canvas via API route
  const startEditing = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const saveName = async (e: React.FormEvent, canvasId: string) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/manage', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ canvasId, name: editName.trim() })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      setCanvases(prev => prev.map(c => c.id === canvasId ? { ...c, name: editName.trim() } : c));
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to update name.');
    }
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="h-screen w-full overflow-y-auto no-canvas-wheel bg-[#f8f5f0] dark:bg-[#121110] text-zinc-800 dark:text-zinc-200 transition-colors duration-200">
      {/* Dashboard Top Header */}
      <header className="h-[64px] border-b border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 fixed top-0 left-0 right-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2">
          {/* Logo image */}
          <img src="/logo.png" alt="Space S Logo" className="w-5 h-5 object-contain" />
          <span className="font-semibold text-sm font-display text-zinc-900 dark:text-zinc-50">Space S</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800/80 ml-2 hidden sm:inline">Dashboard</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Refresh button */}
          <button
            onClick={fetchCanvases}
            title="Refresh canvases"
            className="w-9 h-9 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
          
          <UserButton />
        </div>
      </header>

      {/* Main Workspace Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-[96px] pb-16">

        {/* Hero CTA Banner */}
        <div className={`relative overflow-hidden rounded-3xl mb-10 border ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-zinc-900 via-[#1a1228] to-zinc-900 border-[#7c4dff]/20'
            : 'bg-gradient-to-br from-white via-[#f3f0ff] to-[#fff8f5] border-[#7c4dff]/15'
        }`}>
          {/* Decorative background glow orbs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#7c4dff]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#ff5722]/8 blur-3xl pointer-events-none" />

          {/* Decorative SVG node pattern */}
          <svg className="absolute right-6 top-6 w-32 h-32 opacity-[0.06] dark:opacity-[0.04]" fill="none" viewBox="0 0 128 128">
            <circle cx="32" cy="32" r="6" fill="#7c4dff" />
            <circle cx="96" cy="48" r="6" fill="#7c4dff" />
            <circle cx="56" cy="96" r="6" fill="#7c4dff" />
            <circle cx="112" cy="96" r="4" fill="#ff5722" />
            <line x1="32" y1="32" x2="96" y2="48" stroke="#7c4dff" strokeWidth="2" />
            <line x1="96" y1="48" x2="56" y2="96" stroke="#7c4dff" strokeWidth="2" />
            <line x1="56" y1="96" x2="112" y2="96" stroke="#7c4dff" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>

          <div className="relative px-4 py-8 sm:px-8 sm:py-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <img src="/logo.png" alt="Space S" className="w-5 h-5 object-contain" />
              </div>
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                theme === 'dark'
                  ? 'text-[#a080ff] border-[#7c4dff]/30 bg-[#7c4dff]/10'
                  : 'text-[#7c4dff] border-[#7c4dff]/20 bg-[#7c4dff]/5'
              }`}>Space S AI Thinking Canvas</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight font-display mb-2 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-[#7c4dff] to-[#ff5722] dark:from-zinc-50 dark:via-[#9e75ff] dark:to-[#ff7a47]">
              Map Your Ideas. Explore with AI.
            </h1>
            <p className={`text-sm mb-8 max-w-[480px] leading-relaxed ${
              theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Create infinite, interconnected AI canvases. Branch ideas, synthesize insights, and collaborate in real time in one non linear workspace.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Primary CTA — very prominent */}
              <button
                id="hero-create-canvas-btn"
                onClick={handleCreateCanvas}
                disabled={creating}
                className="group relative h-11 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: creating
                    ? '#7c4dff'
                    : 'linear-gradient(135deg, #7c4dff 0%, #9b59ff 50%, #ff5722 100%)'
                }}
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  {creating ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" /> Creating...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Create Infinite Canvas <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" /></>
                  )}
                </span>
              </button>

              {/* Secondary CTA */}
              <button
                id="hero-explore-sample-btn"
                onClick={() => router.push('/board/sample-board')}
                className={`h-11 px-5 rounded-xl font-semibold text-sm border transition-all duration-200 hover:scale-[1.02] flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#7c4dff]" />
                Explore Sample Board
              </button>
            </div>
          </div>
        </div>

        {/* Upper Title Panel */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-display">Your Thinking Spaces</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Select an existing canvas or initialize a new infinite board workspace.
            </p>
          </div>

          <button
            id="header-create-canvas-btn"
            onClick={handleCreateCanvas}
            disabled={creating}
            className="group h-9 px-4 rounded-lg font-semibold text-xs text-white shadow-md transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c4dff 0%, #9b59ff 100%)' }}
          >
            <Plus className="w-4 h-4" />
            <span>{creating ? 'Creating...' : 'New Canvas'}</span>
          </button>
        </div>

        {/* Canvases Grid */}
        {loading ? (
          <div className="w-full h-[320px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#7c4dff] animate-spin"></div>
          </div>
        ) : canvases.length === 0 ? (
          /* Empty State prompt */
          <div className="w-full max-w-md mx-auto border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-10 flex flex-col items-center text-center mt-12 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-sm shadow-sm transition-colors duration-200">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7c4dff]/10 to-[#ff5722]/10 flex items-center justify-center mb-6 text-[#7c4dff] dark:text-[#be9eff]">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100 mb-2 font-display">No canvases yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed max-w-[280px]">
              Use the <span className="font-bold text-[#7c4dff]">Create Infinite Canvas</span> button above to start mapping out concepts, AI conversations, and branch hierarchies.
            </p>
            <button
              id="empty-state-create-btn"
              onClick={handleCreateCanvas}
              disabled={creating}
              className="group relative h-10 px-6 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c4dff 0%, #9b59ff 50%, #ff5722 100%)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{creating ? 'Creating...' : 'Create your first canvas'}</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canvases.map((canvas) => {
              const isOwner = canvas.owner_id === userId;
              const nodeCount = canvas.nodes?.length || 0;
              const ownerName = canvas.owner?.username || 'Unknown';
              
              return (
                <div
                  key={canvas.id}
                  onClick={() => router.push(`/board/${canvas.id}`)}
                  className="group border border-zinc-200/60 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/90 rounded-2xl p-5 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] cursor-pointer transition-all duration-300 relative flex flex-col justify-between overflow-hidden"
                >
                  {/* Decorative placeholder diagram SVG pattern */}
                  <div className="absolute right-0 top-0 w-24 h-24 opacity-5 dark:opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-full h-full text-zinc-900 dark:text-white" fill="none" viewBox="0 0 100 100">
                      <circle cx="30" cy="30" r="4" fill="currentColor" />
                      <circle cx="70" cy="40" r="4" fill="currentColor" />
                      <circle cx="50" cy="70" r="4" fill="currentColor" />
                      <line x1="30" y1="30" x2="70" y2="40" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="70" y1="40" x2="50" y2="70" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>

                  <div>
                    {/* Header: Badge for Owned vs Shared */}
                    <div className="flex items-center justify-between mb-4">
                      {isOwner ? (
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                          Owned by you
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
                          Shared by @{ownerName}
                        </span>
                      )}

                      {/* Node Count Badge */}
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                      </span>
                    </div>

                    {/* Canvas Title (Editable inline) */}
                    <div className="mb-3">
                      {editingId === canvas.id ? (
                        <form 
                          onSubmit={(e) => saveName(e, canvas.id)}
                          onClick={(e) => e.stopPropagation()} 
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                            className="bg-zinc-50 dark:bg-zinc-800 border border-[#7c4dff] rounded px-2 py-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50 outline-none w-full max-w-[180px]"
                          />
                          <button 
                            type="submit" 
                            className="p-1 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={cancelEditing} 
                            className="p-1 rounded bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2 group/title">
                          <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50 group-hover:text-[#7c4dff] transition-colors leading-snug truncate">
                            {canvas.name}
                          </h4>
                          {isOwner && (
                            <button
                              onClick={(e) => startEditing(e, canvas.id, canvas.name)}
                              className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all"
                              title="Rename Canvas"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer metadata & actions */}
                  <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 mt-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Last edited {formatRelativeTime(canvas.updated_at)}</span>
                    </div>

                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteCanvas(e, canvas.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                        title="Delete Canvas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
