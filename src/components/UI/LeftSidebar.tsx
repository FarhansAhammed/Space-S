"use client";
 
import React from 'react';
import { 
  Home, 
  Search, 
  File, 
  Image as ImageIcon, 
  Link2, 
  Trash2, 
  Plus, 
  Minus, 
  Maximize2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export const LeftSidebar = () => {
  const router = useRouter();
  const { getToken } = useAuth();

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

  const handleTabClick = (label: string) => {
    if (label === 'Home') {
      router.push('/dashboard');
    }
  };

  return (
    <aside className="hidden md:flex w-[72px] border border-white/20 dark:border-zinc-850/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex-col items-center py-6 fixed left-4 top-[84px] bottom-4 z-40 justify-between rounded-[24px] shadow-[0_16px_36px_-6px_rgba(45,38,32,0.06)] transition-all duration-200">
      
      {/* Top Buttons & Tabs */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* New Node trigger (plus icon inside rounded dark square) */}
        <button 
          onClick={handleCreateNewCanvas}
          title="Create New Empty Canvas"
          className="w-11 h-11 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-850 dark:hover:bg-zinc-200 shadow-md transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
 
        {/* Vertical Tabs List */}
        <nav className="flex flex-col gap-2.5 w-full px-2">
          {[
            { label: 'Home', icon: <Home className="w-4 h-4" /> },
            { label: 'Search', icon: <Search className="w-4 h-4" /> },
            { label: 'Files', icon: <File className="w-4 h-4" /> },
            { label: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
            { label: 'Links', icon: <Link2 className="w-4 h-4" /> },
            { label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
          ].map((item, idx) => (
            <button
              key={idx}
              title={item.label}
              onClick={() => handleTabClick(item.label)}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-205 hover:bg-black/5 dark:hover:bg-white/5 transition-all gap-1 ${idx === 0 ? 'text-zinc-850 dark:text-zinc-100 bg-black/5 dark:bg-white/5' : ''}`}
            >
              {item.icon}
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
 
      {/* Bottom Zoom Controls */}
      <div className="flex flex-col items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-11 text-zinc-500 dark:text-zinc-400 transition-colors duration-200">
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom In">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] font-semibold select-none font-mono py-0.5">100%</span>
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom Out">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-6 border-t border-black/5 dark:border-white/5 my-0.5"></div>
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom Fit">
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
 
    </aside>
  );
};
export default LeftSidebar;
