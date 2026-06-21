"use client";

import React from 'react';

interface Feature {
  title: string;
  body: string;
  badge?: string;
  badgeColor?: string;
  mediaType: 'image' | 'video';
  mediaSrc: string;
  mediaAlt: string;
  objectFit: 'cover' | 'contain';
  urlPath: string;
}

export default function FeaturesSection() {
  const features: Feature[] = [
    {
      title: "Prompt to Node Canvas",
      body: "Type a prompt in the central chat box. Spaces creates a rich AI answer as a floating card right there. No more linear threads. Your ideas appear spatially, ready to be arranged and expanded on your AI thinking workspace.",
      badge: "AI POWERED",
      badgeColor: "bg-[#7c4dff]/10 text-[#7c4dff] dark:text-[#a080ff]",
      mediaType: 'image',
      mediaSrc: '/chatbox.png',
      mediaAlt: 'Prompt to Node Canvas mockup',
      objectFit: 'cover',
      urlPath: 'spaces.ai/canvas'
    },
    {
      title: "Branch From Any Idea",
      body: "Select any part of an AI response. Hit Branch. Spaces splits that sub idea into its own connected node, drilling into one branch without losing the context of where it came from. True non linear AI conversation, not a chat restart.",
      mediaType: 'video',
      mediaSrc: '/new_node.mp4',
      mediaAlt: 'Branching node canvas demo',
      objectFit: 'cover',
      urlPath: 'spaces.ai/branch'
    },
    {
      title: "Synthesize Across Topics",
      body: "Draw a connection between two completely unrelated nodes and tap Synthesize. The AI reads both and generates a new node that finds real connections between them. This is AI knowledge visualization working in your favor, with unexpected insight automatically surfaced.",
      badge: "✦ MOST UNIQUE",
      badgeColor: "bg-red-500/10 text-red-500 dark:text-red-400",
      mediaType: 'image',
      mediaSrc: '/merge.png',
      mediaAlt: 'Synthesize across topics diagram',
      objectFit: 'contain',
      urlPath: 'spaces.ai/synthesize'
    },
    {
      title: "Real Time Collaborative Canvas",
      body: "Invite your team via a single link. Each person joins the collaborative AI brainstorming board with their own colored cursor and username. Add nodes, branch ideas, and synthesize together simultaneously. The canvas is the room.",
      mediaType: 'video',
      mediaSrc: '/colab.mp4',
      mediaAlt: 'Real time collaborative canvas demo',
      objectFit: 'contain',
      urlPath: 'spaces.ai/collaborate'
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
              className={`flex flex-col lg:flex-row items-center gap-12 group ${
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
              <div className="w-full lg:w-1/2 aspect-[16/10] bg-[#f8f5f0] dark:bg-[#121110] rounded-2xl border border-zinc-200/40 dark:border-zinc-800/60 shadow-sm relative overflow-hidden transition-all duration-500 flex items-center justify-center p-4 sm:p-6 group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
                {/* Dotted grid canvas background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e4dfd5_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2c29_1px,transparent_1px)] [background-size:16px_16px] opacity-45 pointer-events-none" />
                
                {/* Mock Browser Window Container */}
                <div className="relative z-10 w-full h-full transform transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
                  <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-md">
                    {/* Browser Header */}
                    <div className="h-7 min-h-[28px] flex items-center justify-between px-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 select-none">
                      {/* Window Controls */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      </div>
                      {/* Address Bar */}
                      <div className="flex-1 max-w-[200px] mx-auto">
                        <div className="h-[18px] bg-white dark:bg-zinc-950 rounded border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tight px-3 py-0.5 truncate select-all">
                          {feature.urlPath}
                        </div>
                      </div>
                      {/* Space alignment helper */}
                      <div className="w-[48px]" />
                    </div>
                    
                    {/* Browser Content Area */}
                    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#f8f5f0]">
                      {feature.mediaType === 'image' ? (
                        <img
                          src={feature.mediaSrc}
                          alt={feature.mediaAlt}
                          className={`w-full h-full rounded-b-xl shadow-inner ${
                            feature.objectFit === 'cover' ? 'object-cover' : 'object-contain'
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <video
                          src={feature.mediaSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          suppressHydrationWarning
                          className={`w-full h-full rounded-b-xl shadow-inner ${
                            feature.objectFit === 'cover' ? 'object-cover' : 'object-contain'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
