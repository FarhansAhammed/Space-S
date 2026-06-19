"use client";

import React from 'react';
import { Plus } from 'lucide-react';

interface CTASectionProps {
  creating: boolean;
  handleCreateCanvas: () => void;
}

export default function CTASection({
  creating,
  handleCreateCanvas,
}: CTASectionProps) {
  return (
    <section className="py-28 px-4 sm:px-8 bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200 relative overflow-hidden text-center flex flex-col items-center justify-center">
      
      {/* Decorative absolute SVG of a pin and thread line in the top-right */}
      <div className="absolute top-4 right-4 w-40 h-40 pointer-events-none opacity-40 dark:opacity-30 hidden sm:block">
        <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="80" cy="20" r="4" fill="#7c4dff" />
          <path d="M 80 20 C 60 40, 20 60, 10 90" stroke="#7c4dff" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Logo Monogram */}
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 shadow-md flex items-center justify-center p-2.5 mb-8">
          <img src="/logo.png" alt="Space S Monogram" className="w-full h-full object-contain" />
        </div>

        <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-6 tracking-tight leading-tight">
          Start Thinking Spatially
        </h2>
        
        <p className="font-inter text-sm sm:text-base text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 max-w-lg mb-10 leading-relaxed">
          Your next breakthrough might be hiding in the connection between two ideas you haven't linked yet.
        </p>

        <button
          onClick={handleCreateCanvas}
          disabled={creating}
          className="group relative h-[52px] px-8 rounded-xl font-space-grotesk font-semibold text-sm text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#182156] dark:hover:bg-[#6b3bfc] shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 overflow-hidden"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Creating Canvas...' : "Open your first canvas free"}</span>
        </button>

        <div className="text-[11px] text-[#1c1b18]/45 dark:text-[#f3f0ea]/45 flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4">
          <span>No account needed to start</span>
          <span>•</span>
          <span>Works on any browser</span>
          <span>•</span>
          <span>Upgrade anytime</span>
        </div>

      </div>
    </section>
  );
}
