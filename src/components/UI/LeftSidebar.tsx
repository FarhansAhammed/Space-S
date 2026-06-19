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
    <aside className="hidden md:flex w-[72px] border-r border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md flex-col items-center py-6 fixed left-0 top-[64px] bottom-0 z-40 justify-between transition-colors duration-200">
      
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
        <nav className="flex flex-col gap-2 w-full px-2">
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
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 transition-all gap-1 ${idx === 0 ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/50' : ''}`}
            >
              {item.icon}
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
 
      {/* Bottom Zoom Controls */}
      <div className="flex flex-col items-center gap-1.5 p-1 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/30 dark:border-zinc-800/80 w-11 text-zinc-500 dark:text-zinc-400 transition-colors duration-200">
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom In">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-[9px] font-semibold select-none font-mono py-0.5">100%</span>
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom Out">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-6 border-t border-zinc-200/50 dark:border-zinc-800/60 my-0.5"></div>
        <button className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" title="Zoom Fit">
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
 
    </aside>
  );
};
export default LeftSidebar;
