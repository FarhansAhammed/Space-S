"use client";

import React from 'react';

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-8 bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-4">
          How It Works
        </h2>
        <p className="font-inter text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 max-w-xl mx-auto">
          From blank canvas to structured insight in four moves.
        </p>
      </div>

      {/* 2x2 Grid / Timeline */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
        
        {/* Step 01 */}
        <div className="relative pl-6">
          <span className="absolute -top-8 -left-4 font-space-grotesk font-bold text-7xl text-zinc-300/35 dark:text-zinc-800/30 select-none z-0">
            01
          </span>
          <div className="relative z-10">
            <h3 className="font-space-grotesk font-bold text-lg text-[#0d1233] dark:text-zinc-50 mb-3">
              Click anywhere. Ask anything.
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed">
              The canvas is yours. Click an empty spot and type your question. Your AI response appears right there as a node, exactly where you placed it. Not in a thread. On a board. Spaces is the ultimate <strong className="font-medium text-[#7c4dff] dark:text-[#a080ff]">infinite canvas AI tool</strong>.
            </p>
          </div>
        </div>

        {/* Step 02 */}
        <div className="relative pl-6">
          <span className="absolute -top-8 -left-4 font-space-grotesk font-bold text-7xl text-zinc-300/35 dark:text-zinc-800/30 select-none z-0">
            02
          </span>
          <div className="relative z-10">
            <h3 className="font-space-grotesk font-bold text-lg text-[#0d1233] dark:text-zinc-50 mb-3">
              Branch from what matters.
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed">
              Select any sentence in any node. Hit Branch. A new connected node expands outward, diving into just that sub idea with a red thread connecting it to where it came from. Your train of thought is visualized in a true <strong className="font-medium text-[#7c4dff] dark:text-[#a080ff]">non linear AI conversation tool</strong>.
            </p>
          </div>
        </div>

        {/* Step 03 */}
        <div className="relative pl-6">
          <span className="absolute -top-8 -left-4 font-space-grotesk font-bold text-7xl text-zinc-300/35 dark:text-zinc-800/30 select-none z-0">
            03
          </span>
          <div className="relative z-10">
            <h3 className="font-space-grotesk font-bold text-lg text-[#0d1233] dark:text-zinc-50 mb-3">
              Connect the unconnected.
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed">
              Draw a line between two nodes, even ones from completely different topics. Hit Synthesize. Spaces reads both and generates a third node that finds the actual bridge between them. It lets you <strong className="font-medium text-[#7c4dff] dark:text-[#a080ff]">connect ideas across AI conversations</strong> instantly.
            </p>
          </div>
        </div>

        {/* Step 04 */}
        <div className="relative pl-6">
          <span className="absolute -top-8 -left-4 font-space-grotesk font-bold text-7xl text-zinc-300/35 dark:text-zinc-800/30 select-none z-0">
            04
          </span>
          <div className="relative z-10">
            <h3 className="font-space-grotesk font-bold text-lg text-[#0d1233] dark:text-zinc-50 mb-3">
              Think together, in real time.
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed">
              Share a link. Your collaborator joins the same canvas with their own cursor and color. Everyone adds, branches, and connects simultaneously. Use a powerful <strong className="font-medium text-[#7c4dff] dark:text-[#a080ff]">multiplayer AI brainstorming tool</strong> to design your strategy.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
