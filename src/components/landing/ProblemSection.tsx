"use client";

import React from 'react';
import { ArrowDown, Link2, Users } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section className="py-20 px-4 sm:px-8 bg-[#fdfcf9] dark:bg-[#0d0c0b] border-t border-b border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 transition-colors duration-200">
      <div className="max-w-4xl mx-auto mb-16 text-left">
        {/* Eyebrow */}
        <h2 className="text-[11px] font-bold tracking-widest text-[#7c4dff] dark:text-[#a080ff] uppercase mb-6">
          The Problem
        </h2>
        
        {/* Pull Quote */}
        <blockquote className="border-l-4 border-[#7c4dff] dark:border-[#a080ff] pl-6 md:pl-8 py-2">
          <p className="font-space-grotesk font-semibold text-lg sm:text-2xl lg:text-3xl text-[#1c1b18] dark:text-zinc-50 leading-relaxed max-w-3xl">
            "It's like being forced to have a complex brainstorming session through a narrow hallway. You can only talk about one thing at a time, in order."
          </p>
          <cite className="block font-inter text-xs text-[#1c1b18]/50 dark:text-[#f3f0ea]/50 mt-4 not-italic font-medium">
            r/ChatGPT user, 2025
          </cite>
        </blockquote>
      </div>

      {/* Pain Point Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#161514] shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 mb-6">
              <ArrowDown className="w-5 h-5" />
            </div>
            <h3 className="font-space-grotesk font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">
              Lost in the scroll
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
              That one brilliant insight from 40 messages ago? Good luck finding it. Linear chat buries your best thinking under the weight of everything that came after.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#161514] shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 dark:text-orange-400 mb-6">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="font-space-grotesk font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">
              Connections that never happen
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
              You run three separate AI chats on different angles of a problem. They never talk to each other. The synthesis lives only in your head, if you remember to make it.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#161514] shadow-sm hover:shadow transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[#7c4dff] dark:text-[#a080ff] mb-6">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-space-grotesk font-bold text-[16px] text-[#0d1233] dark:text-zinc-50 mb-2.5">
              Collaboration is an afterthought
            </h3>
            <p className="font-inter text-xs text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-relaxed">
              "I can't believe there is no way to collaborate. It makes no sense." Every major AI chat tool is single player by design. Your team is left stitching outputs together manually.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
