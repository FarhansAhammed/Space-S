"use client";

import React from 'react';
import { Sparkles, GitBranch, Link2, Users, FileText } from 'lucide-react';

interface Feature {
  title: string;
  body: string;
  badge?: string;
  badgeColor?: string;
  mockup: React.ReactNode;
}

export default function FeaturesSection() {
  const features: Feature[] = [
    {
      title: "Prompt to Node Canvas",
      body: "Click anywhere on the blank canvas and type a prompt. Spaces creates a rich AI answer as a floating card right there. No more linear threads. Your ideas appear spatially, ready to be arranged and expanded on your AI thinking workspace.",
      badge: "AI POWERED",
      badgeColor: "bg-[#7c4dff]/10 text-[#7c4dff] dark:text-[#a080ff]",
      mockup: (
        <div className="flex flex-col gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm w-full max-w-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
            <Sparkles className="w-4 h-4 text-[#7c4dff]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Prompt Node</span>
          </div>
          <p className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">"Explain the basics of photosynthesis..."</p>
          <div className="bg-[#f8f5f0] dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200/30">
            <p className="text-[9px] text-[#1c1b18]/70 dark:text-[#f3f0ea]/75 leading-relaxed">
              1. Absorption of light by chlorophyll.<br />2. Conversion of light energy into chemical energy...
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Branch From Any Idea",
      body: "Select any part of an AI response. Hit Branch. Spaces splits that sub idea into its own connected node, drilling into one branch without losing the context of where it came from. True non linear AI conversation, not a chat restart.",
      mockup: (
        <div className="flex items-center gap-4 relative py-4 w-full max-w-sm justify-center">
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-850 shadow-sm text-center">
            <span className="text-[9px] text-zinc-400 block mb-0.5">Parent Node</span>
            <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">Quantum Computing</span>
          </div>
          <div className="w-10 h-0.5 border-t-2 border-dashed border-[#7c4dff] relative">
            <GitBranch className="w-3.5 h-3.5 text-[#7c4dff] absolute -top-2 left-3 bg-[#fdfcf9] dark:bg-[#0d0c0b] rounded-full p-0.5" />
          </div>
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-[#7c4dff]/40 dark:border-[#a080ff]/30 shadow-md text-center">
            <span className="text-[8px] bg-[#7c4dff]/15 text-[#7c4dff] dark:text-[#a080ff] px-1.5 py-0.5 rounded font-bold block mb-1">BRANCH</span>
            <span className="text-[10px] font-bold text-[#0d1233] dark:text-zinc-50">Qubits & Superposition</span>
          </div>
        </div>
      )
    },
    {
      title: "Synthesize Across Topics",
      body: "Draw a connection between two completely unrelated nodes and tap Synthesize. The AI reads both and generates a new node that finds real connections between them. This is AI knowledge visualization working in your favor, with unexpected insight automatically surfaced.",
      badge: "✦ MOST UNIQUE",
      badgeColor: "bg-red-500/10 text-red-500 dark:text-red-400",
      mockup: (
        <div className="relative w-full max-w-sm h-36 flex items-center justify-between px-4">
          <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/50 shadow-sm text-[9px] font-bold">Chaos Theory</div>
          <div className="absolute left-[50%] -translate-x-[50%] top-1/2 -translate-y-1/2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-[#7c4dff] shadow-lg flex flex-col items-center max-w-[120px] text-center z-10">
            <Link2 className="w-3.5 h-3.5 text-[#7c4dff] mb-1" />
            <span className="text-[8px] font-bold text-[#7c4dff] uppercase tracking-wider block">Bridge</span>
            <p className="text-[8px] text-zinc-500 leading-snug">Sensitive dependency in global markets</p>
          </div>
          <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/50 shadow-sm text-[9px] font-bold">Stock Markets</div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 60 70 Q 150 40, 240 70" fill="none" stroke="#7c4dff" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        </div>
      )
    },
    {
      title: "Real Time Collaborative Canvas",
      body: "Invite your team via a single link. Each person joins the collaborative AI brainstorming board with their own colored cursor and username. Add nodes, branch ideas, and synthesize together simultaneously. The canvas is the room.",
      mockup: (
        <div className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800 shadow-sm w-full max-w-sm relative overflow-hidden h-28">
          <div className="flex gap-1.5 items-center">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[9px] text-zinc-400 font-bold uppercase">Multiplayer Canvas</span>
          </div>
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 p-2 rounded text-[9px] text-zinc-500">
            Designing product roadmap...
          </div>
          <div className="absolute top-[35px] right-[40px] flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] bg-zinc-900 text-white px-1 py-0.5 rounded shadow">Sarah</span>
          </div>
          <div className="absolute bottom-[15px] left-[60px] flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff9100]" />
            <span className="text-[8px] bg-zinc-900 text-white px-1 py-0.5 rounded shadow">Alex</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-8 bg-[#fdfcf9] dark:bg-[#0d0c0b] border-t border-b border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto text-center mb-20">
        <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-4">
          Features
        </h2>
        <p className="font-inter text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 max-w-xl mx-auto">
          Everything you need to think in more than one dimension.
        </p>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col gap-24">
        {features.map((feature, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <div
              key={feature.title}
              className={`flex flex-col lg:flex-row items-center gap-12 ${
                isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
              }`}
            >
              {/* Feature Copy */}
              <div className="w-full lg:w-1/2 text-left">
                {feature.badge && (
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded tracking-wider ${feature.badgeColor} mb-4`}>
                    {feature.badge}
                  </span>
                )}
                <h3 className="font-space-grotesk font-bold text-xl sm:text-2xl text-[#0d1233] dark:text-zinc-50 mb-4">
                  {feature.title}
                </h3>
                <p className="font-inter text-xs sm:text-sm text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed max-w-md">
                  {feature.body}
                </p>
              </div>

              {/* Mockup Visual */}
              <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#f8f5f0] dark:bg-[#121110] rounded-2xl border border-zinc-200/40 dark:border-zinc-800/60 p-8 min-h-[180px] shadow-sm relative overflow-hidden transition-colors duration-200">
                <div className="absolute inset-0 bg-[radial-gradient(#e4dfd5_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2c29_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
                <div className="relative z-10 w-full flex justify-center">
                  {feature.mockup}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
