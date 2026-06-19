"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Check, 
  Zap, 
  Folder, 
  FileText, 
  Link2, 
  MessageSquare, 
  Infinity, 
  ChevronRight, 
  Sun, 
  Moon, 
  Clock, 
  LayoutGrid, 
  MousePointerClick,
  Menu,
  X,
  GitBranch,
  Share2
} from 'lucide-react';

// Shared helper: build auth headers from Clerk token
async function authHeaders(getToken: () => Promise<string | null>) {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

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

export default function LandingPage() {
  const router = useRouter();
  const { getToken, userId, isLoaded } = useAuth();
  const { theme, toggleTheme } = useCanvasStore();

  const [canvases, setCanvases] = useState<CanvasRecord[]>([]);
  const [loadingCanvases, setLoadingCanvases] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch canvases if signed in
  const fetchCanvases = useCallback(async () => {
    if (!userId) return;
    setLoadingCanvases(true);
    try {
      const headers = await authHeaders(getToken);
      const response = await fetch('/api/canvas/list', { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setCanvases(data.canvases ?? []);
    } catch (e) {
      console.error('Failed to load canvases:', e);
    } finally {
      setLoadingCanvases(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    if (userId) {
      fetchCanvases();
    }
  }, [userId, fetchCanvases]);

  // Create canvas or trigger login
  const handleCreateCanvas = async () => {
    if (!userId) {
      router.push('/sign-in');
      return;
    }

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
      alert('Failed to create canvas.');
    } finally {
      setCreating(false);
    }
  };

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleGoDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen w-full overflow-y-auto no-canvas-wheel bg-[#f8f5f0] dark:bg-[#121110] text-[#1c1b18] dark:text-[#f3f0ea] selection:bg-[#7c4dff]/20 scroll-smooth transition-colors duration-200">
      
      {/* 1. Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 border-b border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-[#f8f5f0]/80 dark:bg-[#121110]/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Space-S Logo" className="w-6 h-6 object-contain" />
            <span className="font-display font-semibold text-lg tracking-tight text-[#0d1233] dark:text-zinc-50">Space-S</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <a href="#product" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">Product</a>
            <a href="#features" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">Use Cases</a>
            <a href="#pricing" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">Pricing</a>
            <a href="#resources" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">Resources</a>
            <a href="#about" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">About</a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center mr-1"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {isLoaded && userId ? (
              <>
                <button
                  onClick={handleGoDashboard}
                  className="h-10 px-4 rounded-xl font-semibold text-[14px] border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all"
                >
                  Go to Dashboard
                </button>
                <div className="flex items-center justify-center p-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/20">
                  <UserButton />
                </div>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="h-10 px-5 rounded-xl font-semibold text-[14px] bg-[#0d1233]/5 dark:bg-white/5 hover:bg-[#0d1233]/10 dark:hover:bg-white/10 text-[#0d1233] dark:text-zinc-50 transition-all"
              >
                Sign in
              </button>
            )}

            <button
              onClick={handleCreateCanvas}
              disabled={creating}
              className="h-10 px-5 rounded-xl font-semibold text-[14px] text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#131a47] dark:hover:bg-[#6836fc] shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>{creating ? 'Creating...' : 'Create New Canvas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 flex items-center justify-center"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/80 text-[#1c1b18] dark:text-[#f3f0ea]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[72px] p-6 bg-[#f8f5f0] dark:bg-[#121110] border-b border-[#1c1b18]/10 dark:border-[#f3f0ea]/10 z-40 flex flex-col gap-4 shadow-lg md:hidden animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-3 text-[15px] font-medium text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <a href="#product" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">Product</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">Use Cases</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">Pricing</a>
            <a href="#resources" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">Resources</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">About</a>
          </nav>

          <hr className="border-[#1c1b18]/10 dark:border-[#f3f0ea]/10 my-1" />

          <div className="flex flex-col gap-2.5">
            {isLoaded && userId ? (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleGoDashboard(); }}
                  className="w-full h-11 rounded-xl font-semibold text-[14px] border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50"
                >
                  Go to Dashboard
                </button>
                <div className="flex items-center justify-between p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/20">
                  <span className="text-xs font-semibold text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 ml-2">Logged in user</span>
                  <UserButton />
                </div>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}
                className="w-full h-11 rounded-xl font-semibold text-[14px] bg-[#0d1233]/5 dark:bg-white/5 text-[#0d1233] dark:text-zinc-50 flex items-center justify-center"
              >
                Sign in
              </button>
            )}

            <button
              onClick={() => { setMobileMenuOpen(false); handleCreateCanvas(); }}
              disabled={creating}
              className="w-full h-11 rounded-xl font-semibold text-[14px] text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#131a47] dark:hover:bg-[#6836fc] flex items-center justify-center gap-1.5 shadow"
            >
              <span>{creating ? 'Creating...' : 'Create New Canvas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Container Wrapper */}
      <div className="pt-[72px]">
        
        {/* 2. Hero Section (Visuals from landing.png) */}
        <section id="product" className="relative min-h-[calc(100vh-72px)] flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-24 overflow-hidden">
          
          {/* Subtle dotted background grid matching the canvas */}
          <div className="absolute inset-0 bg-[radial-gradient(#d0cbbf_1px,transparent_1px)] dark:bg-[radial-gradient(#403d39_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none z-0" />
          
          {/* Decorative soft glowing orbs */}
          <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-[#7c4dff]/5 dark:bg-[#7c4dff]/3 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-[#ff9100]/4 dark:bg-[#ff9100]/2 blur-3xl rounded-full pointer-events-none" />

          {/* Core Hero Wrap (Max-w-7xl) - Provides wide canvas spacing to prevent overlap */}
          <div className="max-w-7xl w-full mx-auto relative min-h-[580px] flex flex-col items-center justify-center z-10">
            
            {/* Absolute Floating SVG Curves (Desktop Only) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block z-0">
              <svg className="w-full h-full" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrow-violet" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#c0a6ff" />
                  </marker>
                  <marker id="arrow-orange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffd4b2" />
                  </marker>
                  <marker id="arrow-yellow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffe066" />
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#bbf7d0" />
                  </marker>
                </defs>
                
                {/* Curve 1: Top-Left Card ("Ask anything") to Center Button */}
                <path 
                  d="M 280 180 C 360 210, 420 370, 480 395" 
                  fill="none" 
                  stroke="#c0a6ff" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  markerEnd="url(#arrow-violet)" 
                  className="opacity-70 dark:opacity-40"
                />

                {/* Curve 2: Bottom-Left Card ("Connect ideas") to Center Button */}
                <path 
                  d="M 330 460 C 400 460, 420 420, 480 410" 
                  fill="none" 
                  stroke="#ffd4b2" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  markerEnd="url(#arrow-orange)" 
                  className="opacity-70 dark:opacity-40"
                />

                {/* Curve 3: Top-Right Card ("Go deeper") to Center Button */}
                <path 
                  d="M 920 220 C 840 250, 800 370, 720 395" 
                  fill="none" 
                  stroke="#ffe066" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  markerStart="url(#arrow-yellow)" 
                  className="opacity-70 dark:opacity-40"
                />

                {/* Curve 4: Bottom-Right Card ("Everything in one place") to Center Button */}
                <path 
                  d="M 870 480 C 800 480, 780 420, 720 410" 
                  fill="none" 
                  stroke="#bbf7d0" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  markerStart="url(#arrow-green)" 
                  className="opacity-70 dark:opacity-40"
                />
              </svg>
            </div>

            {/* Central Hero Text Content (Centered, Max-w-2xl to prevent overlap) */}
            <div className="relative z-20 max-w-2xl w-full text-center flex flex-col items-center py-6 px-4">
              
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-[#fbf9f6] dark:bg-[#181716] shadow-sm mb-8 animate-fade-in duration-300">
                <Sparkles className="w-3.5 h-3.5 text-[#7c4dff] dark:text-[#a080ff] animate-pulse" />
                <span className="text-[12px] font-medium tracking-tight text-[#1c1b18]/80 dark:text-[#f3f0ea]/80">Your ideas deserve space.</span>
              </div>

              {/* Main Serif Heading */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-[#0d1233] dark:text-zinc-50 leading-[1.1] tracking-tight mb-6 max-w-3xl">
                Think in <span className="italic font-medium text-[#7c4dff] dark:text-[#9c7eff]">space</span>.<br />Not in lines.
              </h1>

              {/* Description Subtext */}
              <p className="text-sm sm:text-lg text-[#1c1b18]/70 dark:text-[#f3f0ea]/70 max-w-2xl leading-relaxed mb-10 px-2 sm:px-6">
                Space-S is an infinite AI canvas where ideas become nodes, answers become branches, and connections create insight.
              </p>

              {/* Center Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                <button
                  id="hero-create-canvas-btn-primary"
                  onClick={handleCreateCanvas}
                  disabled={creating}
                  className="group relative h-[52px] px-8 rounded-2xl font-bold text-sm text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#192257] dark:hover:bg-[#6b3bfc] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 overflow-hidden"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creating ? 'Creating Canvas...' : 'Create New Canvas'}</span>
                </button>

                <a
                  href="#demo"
                  className="h-[52px] px-6 rounded-2xl font-semibold text-sm border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <span>Watch 2-min demo</span>
                  <div className="w-6 h-6 rounded-full border border-[#0d1233]/15 dark:border-white/15 flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 fill-current text-[#0d1233] dark:text-zinc-50 ml-0.5" />
                  </div>
                </a>
              </div>

              {/* Watch demo link wrapper */}
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                No credit card required. Free to start.
              </div>

            </div>

            {/* Floating Cards (Shown absolute relative to max-w-7xl, hidden on mobile/tablet) */}
            <div className="hidden lg:block">
              {/* Card 1: Ask Anything (Top Left) */}
              <div className="absolute top-[8%] left-[2%] xl:left-[4%] w-[240px] p-5 rounded-2xl bg-[#f5f3ff] dark:bg-[#1a122e]/60 border border-[#7c4dff]/15 shadow-sm text-left hover:shadow transition-all group">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff] mb-3">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Ask anything</h4>
                <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">AI answers become nodes.</p>
                <Sparkles className="absolute bottom-4 right-4 w-3.5 h-3.5 text-[#7c4dff]/40 dark:text-[#a080ff]/30 group-hover:scale-110 transition-transform" />
              </div>

              {/* Card 2: Connect Ideas (Bottom Left) */}
              <div className="absolute bottom-[12%] left-[6%] xl:left-[8%] w-[240px] p-5 rounded-2xl bg-[#fff7ed] dark:bg-[#2e1710]/40 border border-[#ff9100]/15 shadow-sm text-left hover:shadow transition-all group">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-[#ff9100] dark:text-[#ffb042] mb-3">
                  <Link2 className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Connect ideas</h4>
                <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Combine topics and discover new insight.</p>
                <Sparkles className="absolute bottom-4 right-4 w-3.5 h-3.5 text-[#ff9100]/40 dark:text-[#ffb042]/30 group-hover:scale-110 transition-transform" />
              </div>

              {/* Card 3: Go Deeper (Top Right) */}
              <div className="absolute top-[14%] right-[2%] xl:right-[4%] w-[240px] p-5 rounded-2xl bg-[#fefce8] dark:bg-[#282410]/50 border border-[#eab308]/15 shadow-sm text-left hover:shadow transition-all group">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-[#eab308] mb-3">
                  <MousePointerClick className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Go deeper</h4>
                <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Select any text to create a new branch.</p>
                <Sparkles className="absolute bottom-4 right-4 w-3.5 h-3.5 text-yellow-600/40 dark:text-yellow-500/30 group-hover:scale-110 transition-transform" />
              </div>

              {/* Card 4: Everything in One Place (Bottom Right) */}
              <div className="absolute bottom-[10%] right-[6%] xl:right-[8%] w-[240px] p-5 rounded-2xl bg-[#f0fdf4] dark:bg-[#112415]/60 border border-[#22c55e]/15 shadow-sm text-left hover:shadow transition-all group">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#4ade80] mb-3">
                  <Folder className="w-4 h-4" />
                </div>
                <h4 className="font-display font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Everything in one place</h4>
                <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Docs, images, links, questions and more.</p>
                <Sparkles className="absolute bottom-4 right-4 w-3.5 h-3.5 text-emerald-600/40 dark:text-emerald-500/30 group-hover:scale-110 transition-transform" />
              </div>
            </div>

          </div>

          {/* Mobile Grid Layout: displays the 4 feature cards in a grid underneath */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8 lg:hidden max-w-2xl px-2">
            
            {/* Mobile Card 1 */}
            <div className="p-5 rounded-2xl bg-[#f5f3ff] dark:bg-[#1a122e]/60 border border-[#7c4dff]/15 text-left flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Ask anything</h4>
                <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">AI answers become nodes.</p>
              </div>
            </div>

            {/* Mobile Card 2 */}
            <div className="p-5 rounded-2xl bg-[#fff7ed] dark:bg-[#2e1710]/40 border border-[#ff9100]/15 text-left flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ff9100]/10 flex items-center justify-center text-[#ff9100]">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Connect ideas</h4>
                <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Combine topics and discover new insight.</p>
              </div>
            </div>

            {/* Mobile Card 3 */}
            <div className="p-5 rounded-2xl bg-[#fefce8] dark:bg-[#282410]/50 border border-[#eab308]/15 text-left flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-[#eab308]">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Go deeper</h4>
                <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Select any text to create a new branch.</p>
              </div>
            </div>

            {/* Mobile Card 4 */}
            <div className="p-5 rounded-2xl bg-[#f0fdf4] dark:bg-[#112415]/60 border border-[#22c55e]/15 text-left flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-[#4ade80]">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Everything in one place</h4>
                <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Docs, images, links, questions and more.</p>
              </div>
            </div>

          </div>
        </section>

        {/* 5. Dynamic Active Canvases List Section (User requirement - under landing page) */}
        <section className="py-16 md:py-20 px-4 sm:px-8 border-t border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-white/20 dark:bg-zinc-950/10 backdrop-blur-sm transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center md:text-left mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#0d1233] dark:text-zinc-50">
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

            {/* Canvas Listing Container */}
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
                /* Authenticated but no canvases created yet */
                <div className="w-full p-8 md:p-12 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-[#fbf9f6]/40 dark:bg-zinc-950/10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#7c4dff]/10 flex items-center justify-center text-[#7c4dff] mb-4">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1.5">No canvases created yet</h4>
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
                /* List User Canvases */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {canvases.slice(0, 6).map((canvas) => {
                    const nodeCount = canvas.nodes?.length || 0;
                    return (
                      <div
                        key={canvas.id}
                        onClick={() => router.push(`/board/${canvas.id}`)}
                        className="group relative p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-zinc-900/80 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden"
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
                          
                          <h4 className="font-display font-bold text-sm text-[#0d1233] dark:text-zinc-50 group-hover:text-[#7c4dff] transition-colors truncate pr-4">
                            {canvas.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 mt-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>Edited {formatRelativeTime(canvas.updated_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Signed-out state placeholder */
              <div className="w-full p-8 md:p-14 text-center rounded-[24px] border border-dashed border-zinc-300 dark:border-zinc-800 bg-[#fbf9f6]/40 dark:bg-zinc-950/10 flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-[#0d1233]/5 dark:bg-white/5 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-1.5">Sign in to view your canvases</h4>
                <p className="text-xs text-[#1c1b18]/50 dark:text-[#f3f0ea]/50 max-w-sm mb-6">
                  Save, search, sync, and branch your reasoning conversations by logging in. Click below to sign in or get started.
                </p>
                <button
                  onClick={handleSignIn}
                  className="h-10 px-6 rounded-xl font-semibold text-xs text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#182156] dark:hover:bg-[#6b3bfc] shadow transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Sign in to Space-S</span>
                </button>
              </div>
            )}

          </div>
        </section>

        {/* 3. Features Grid Section (Replicating top part of ending.png) */}
        <section id="features" className="py-20 md:py-28 px-4 sm:px-8 border-t border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-sm transition-colors duration-200">
          <div className="max-w-7xl mx-auto text-center">
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#0d1233] dark:text-zinc-50 mb-4">
              A new way to think with AI
            </h2>
            <p className="text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 max-w-xl mx-auto mb-16">
              More than a chat. More than a document. It's your thinking space.
            </p>

            {/* Grid of 5 Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
              
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff] mb-6">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">Branch any idea</h3>
                  <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
                    Select text and turn it into a new node. Go as deep as you want.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 mb-6">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">Connect everything</h3>
                  <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
                    Link ideas across topics and let AI find the connections.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#4ade80] mb-6">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">Chat in every node</h3>
                  <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
                    Each node has its own AI chat and context. Focused and organized.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">Bring in anything</h3>
                  <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
                    Upload docs, images, or links and turn them into knowledge.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm hover:border-[#7c4dff] dark:hover:border-[#7c4dff] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff] mb-6">
                    <Infinity className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">Infinite canvas</h3>
                  <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
                    No folders. No limits. All your ideas in one boundless space.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* 4. Mini-Mindmap Visual Banner Section (Replicating middle section of ending.png) */}
        <section id="demo" className="py-16 md:py-24 px-4 sm:px-8 bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            
            {/* Outer Banner Card */}
            <div className="relative overflow-hidden rounded-[32px] border border-[#0d1233]/5 dark:border-white/5 bg-[#f5f1ea] dark:bg-[#1c1a18] p-8 md:p-14 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              
              {/* Left Side: Mock Interactive Canvas Visual */}
              <div className="w-full lg:w-1/2 flex items-center justify-center relative min-h-[300px] bg-white/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 p-6 overflow-hidden">
                
                {/* SVG connection lines in background of the mini canvas */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left node (Game Design) to Center Node */}
                  <path d="M 130 110 Q 180 130, 200 160" fill="none" stroke="#7c4dff" strokeWidth="1.5" className="opacity-40" />
                  {/* Right node (Education) to Center Node */}
                  <path d="M 330 110 Q 280 130, 260 160" fill="none" stroke="#22c55e" strokeWidth="1.5" className="opacity-40" />
                </svg>

                {/* Node A (Top Left): Game Design */}
                <div className="absolute top-[60px] left-[30px] px-4 py-2 rounded-xl bg-[#f5f3ff] dark:bg-[#1a122e] border border-[#7c4dff]/20 shadow-sm text-center">
                  <span className="text-[12px] font-semibold text-[#0d1233] dark:text-zinc-50 font-display">Game Design</span>
                </div>

                {/* Node B (Top Right): Education */}
                <div className="absolute top-[60px] right-[30px] px-4 py-2 rounded-xl bg-[#f0fdf4] dark:bg-[#112415] border border-[#22c55e]/20 shadow-sm text-center">
                  <span className="text-[12px] font-semibold text-[#0d1233] dark:text-zinc-50 font-display">Education</span>
                </div>

                {/* Node C (Center Bottom): AI Insight Question */}
                <div className="absolute top-[150px] left-[50%] -translate-x-[50%] w-[260px] p-4 rounded-xl bg-white dark:bg-zinc-900 border border-[#7c4dff] shadow-md flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7c4dff]/10 text-[#7c4dff] dark:text-[#a080ff] mb-1.5 text-[9px] font-bold">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI Insight</span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#1c1b18] dark:text-zinc-50 leading-snug">
                    How can game design principles improve education?
                  </p>
                </div>

              </div>

              {/* Right Side: Copy and Actions */}
              <div className="w-full lg:w-1/2 text-left flex flex-col items-start">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8e2d5] dark:bg-zinc-800 text-[#7c4dff] dark:text-[#a080ff] mb-6 text-[12px] font-semibold">
                  <span>Unlock new perspectives</span>
                </div>

                {/* Title */}
                <h2 className="text-3xl sm:text-4xl font-serif text-[#0d1233] dark:text-zinc-50 leading-tight mb-4 max-w-md">
                  Connect ideas that don't belong together.
                </h2>

                {/* Subtitle */}
                <p className="text-sm sm:text-base text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed mb-8">
                  Link different topics and generate new insights you wouldn't discover on your own.
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleCreateCanvas}
                  className="h-11 px-5 rounded-xl font-semibold text-xs border border-[#0d1233]/25 dark:border-white/20 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-all flex items-center gap-2 group"
                >
                  <span>See how it works</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>

              </div>

            </div>

          </div>
        </section>


        {/* 6. Ending/Call to Action Section (Visuals from ending.png bottom) */}
        <section className="py-24 md:py-32 px-4 sm:px-8 border-t border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-[#fbf9f6]/30 dark:bg-zinc-950/20 transition-colors duration-200">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            
            {/* Center Logo Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 shadow-md flex items-center justify-center p-2.5 mb-8">
              <img src="/logo.png" alt="Space-S Monogram" className="w-full h-full object-contain" />
            </div>

            {/* Heading */}
            <h2 className="text-4xl sm:text-5xl font-serif text-[#0d1233] dark:text-zinc-50 tracking-tight leading-[1.2] mb-4">
              Ready to create your space?
            </h2>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 mb-10 max-w-md">
              Start a new canvas and bring your ideas to life.
            </p>

            {/* Button */}
            <button
              onClick={handleCreateCanvas}
              disabled={creating}
              className="group relative h-[52px] px-8 rounded-2xl font-bold text-sm text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#182156] dark:hover:bg-[#6836fc] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 overflow-hidden"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? 'Creating Canvas...' : 'Create New Canvas'}</span>
            </button>

            {/* Subtext */}
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-4">
              No credit card required. Free to start.
            </span>

          </div>
        </section>

        {/* Footer info links / copyrights */}
        <footer className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200/20 dark:border-zinc-800/20">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              &copy; {new Date().getFullYear()} Space-S. All rights reserved.
            </div>
            <div className="flex gap-4">
              <a href="#privacy" className="hover:underline">Privacy Policy</a>
              <a href="#terms" className="hover:underline">Terms of Service</a>
              <a href="#contact" className="hover:underline">Contact Us</a>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
