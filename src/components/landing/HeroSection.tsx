"use client";

import React from 'react';
import { Plus, Sparkles, FileText, Link2, MousePointerClick, Folder, Play } from 'lucide-react';

interface HeroSectionProps {
  creating: boolean;
  handleCreateCanvas: () => void;
}

export default function HeroSection({
  creating,
  handleCreateCanvas,
}: HeroSectionProps) {
  return (
    <section id="product" className="relative min-h-[calc(90vh-72px)] flex flex-col items-center justify-center px-4 sm:px-6 pt-4 md:pt-8 pb-12 overflow-hidden">
      
      {/* Dotted grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#d0cbbf_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#403d39_1.2px,transparent_1.2px)] [background-size:22px_22px] opacity-45 pointer-events-none z-0" />
      
      {/* Soft background glow orbs */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-[#7c4dff]/5 dark:bg-[#7c4dff]/3 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-[#ff9100]/4 dark:bg-[#ff9100]/2 blur-3xl rounded-full pointer-events-none" />

      {/* Core Wrap */}
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

        {/* Central Hero Content */}
        <div className="relative z-20 max-w-2xl w-full text-center flex flex-col items-center py-6 px-4">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-[#fdfaf5] dark:bg-[#161514] shadow-sm mb-8">
            <Sparkles className="w-3.5 h-3.5 text-[#7c4dff] dark:text-[#a080ff]" />
            <span className="text-[12px] font-semibold text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">Your ideas deserve space.</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-[#0d1233] dark:text-zinc-50 leading-[1.1] tracking-tight mb-6 max-w-3xl font-medium">
            Infinite <span className="italic font-normal text-[#7c4dff] dark:text-[#9c7eff]">Canvas</span><br />AI Workspace
          </h1>

          {/* Paragraph */}
          <p className="text-sm sm:text-base text-[#1c1b18]/70 dark:text-[#f3f0ea]/75 max-w-xl leading-relaxed mb-10 px-4">
            Replace linear AI chat threads with a limitless AI brainstorming tool. Drop prompts anywhere, branch ideas into connected nodes, and see your research take shape on a visual thinking canvas.
          </p>

          {/* Big Center Button */}
          <div className="flex flex-col items-center gap-4 mb-2">
            <button
              onClick={handleCreateCanvas}
              disabled={creating}
              className="group relative h-14 px-8 rounded-2xl font-bold text-sm text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#192257] dark:hover:bg-[#6b3bfc] shadow-[0_8px_30px_rgb(13,18,51,0.18)] dark:shadow-[0_8px_30px_rgb(124,77,255,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 overflow-hidden"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? 'Creating Canvas...' : 'Create New Canvas'}</span>
            </button>

            {/* Play link */}
            <a 
              href="#how-it-works"
              className="flex items-center gap-2 text-xs font-bold text-[#0d1233]/70 dark:text-[#f3f0ea]/70 hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors mt-2"
            >
              <span>Watch 2 min demo</span>
              <Play className="w-4 h-4 text-[#0d1233] dark:text-[#a080ff] bg-[#0d1233]/5 dark:bg-white/5 rounded-full p-1 border border-[#0d1233]/15 dark:border-white/10" />
            </a>
          </div>

        </div>

        {/* Floating Cards (Shown absolute relative to max-w-7xl, hidden on mobile/tablet) */}
        <div className="hidden lg:block">
          
          {/* Card 1: Ask Anything (Top Left) */}
          <div className="absolute top-[8%] left-[2%] xl:left-[4%] w-[240px] p-5 rounded-2xl bg-[#f5f3ff] dark:bg-[#1a122e]/60 border border-[#7c4dff]/15 shadow-sm text-left hover:shadow transition-all group">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff] mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="font-space-grotesk font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Ask anything</h4>
            <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">AI answers become nodes.</p>
          </div>

          {/* Card 2: Connect Ideas (Bottom Left) */}
          <div className="absolute bottom-[12%] left-[6%] xl:left-[8%] w-[240px] p-5 rounded-2xl bg-[#fff7ed] dark:bg-[#2e1710]/40 border border-[#ff9100]/15 shadow-sm text-left hover:shadow transition-all group">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-[#ff9100] dark:text-[#ffb042] mb-3">
              <Link2 className="w-4 h-4" />
            </div>
            <h4 className="font-space-grotesk font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Connect ideas</h4>
            <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Combine topics and discover new insight.</p>
          </div>

          {/* Card 3: Go Deeper (Top Right) */}
          <div className="absolute top-[14%] right-[2%] xl:right-[4%] w-[240px] p-5 rounded-2xl bg-[#fefce8] dark:bg-[#282410]/50 border border-[#eab308]/15 shadow-sm text-left hover:shadow transition-all group">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-[#eab308] mb-3">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <h4 className="font-space-grotesk font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Go deeper</h4>
            <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Select any text to create a new branch.</p>
          </div>

          {/* Card 4: Everything in One Place (Bottom Right) */}
          <div className="absolute bottom-[10%] right-[6%] xl:right-[8%] w-[240px] p-5 rounded-2xl bg-[#f0fdf4] dark:bg-[#112415]/60 border border-[#22c55e]/15 shadow-sm text-left hover:shadow transition-all group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#4ade80] mb-3">
              <Folder className="w-4 h-4" />
            </div>
            <h4 className="font-space-grotesk font-bold text-[15px] text-[#0d1233] dark:text-zinc-50 mb-1">Keep ideas organized</h4>
            <p className="text-[12px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">Notes, links, questions, and insights all in one place.</p>
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
            <h4 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Ask anything</h4>
            <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">AI answers become nodes.</p>
          </div>
        </div>

        {/* Mobile Card 2 */}
        <div className="p-5 rounded-2xl bg-[#fff7ed] dark:bg-[#2e1710]/40 border border-[#ff9100]/15 text-left flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ff9100]/10 flex items-center justify-center text-[#ff9100]">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Connect ideas</h4>
            <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Combine topics and discover new insight.</p>
          </div>
        </div>

        {/* Mobile Card 3 */}
        <div className="p-5 rounded-2xl bg-[#fefce8] dark:bg-[#282410]/50 border border-[#eab308]/15 text-left flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-[#eab308]">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Go deeper</h4>
            <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Select any text to create a new branch.</p>
          </div>
        </div>

        {/* Mobile Card 4 */}
        <div className="p-5 rounded-2xl bg-[#f0fdf4] dark:bg-[#112415]/60 border border-[#22c55e]/15 text-left flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-[#4ade80]">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-0.5">Keep ideas organized</h4>
            <p className="text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">Notes, links, questions, and insights all in one place.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
