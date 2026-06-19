"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Footer() {
  const router = useRouter();

  return (
    <footer className="bg-[#f2ede4] dark:bg-[#0d0d0e] border-t border-zinc-200/60 dark:border-zinc-900/80 pt-16 pb-8 px-4 sm:px-8 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        
        {/* Col 1 */}
        <div className="md:col-span-4 flex flex-col items-start">
          <div className="flex items-center gap-2 cursor-pointer mb-4" onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Space S Logo" className="w-5 h-5 object-contain" />
            <span className="font-space-grotesk font-semibold text-base tracking-tight text-[#0d1233] dark:text-zinc-50">
              space<span className="text-[#7c4dff] dark:text-[#a080ff] font-bold">•</span>
            </span>
          </div>
          <p className="text-[#1c1b18]/60 dark:text-[#f3f0ea]/55 text-xs max-w-xs leading-relaxed">
            The infinite canvas AI workspace for non linear thinkers.
          </p>
        </div>

        {/* Col 2 */}
        <div className="md:col-span-4 text-left">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase block mb-3.5">
            PRODUCT
          </span>
          <ul className="space-y-2.5 font-medium text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <li><a href="#product" className="hover:text-[#7c4dff] dark:hover:text-[#a080ff] transition-colors">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-[#7c4dff] dark:hover:text-[#a080ff] transition-colors">How It Works</a></li>
            <li><a href="#faq" className="hover:text-[#7c4dff] dark:hover:text-[#a080ff] transition-colors">FAQ</a></li>
            <li><span className="opacity-40 cursor-not-allowed">Changelog</span></li>
          </ul>
        </div>

        {/* Col 3 */}
        <div className="md:col-span-4 text-left">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase block mb-3.5">
            CONNECT
          </span>
          <ul className="space-y-2.5 font-medium text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <li><span className="opacity-40 cursor-not-allowed">Twitter/X</span></li>
            <li><span className="opacity-40 cursor-not-allowed">Product Hunt</span></li>
            <li><span className="opacity-40 cursor-not-allowed">GitHub</span></li>
            <li><span className="opacity-40 cursor-not-allowed">Contact</span></li>
          </ul>
        </div>

      </div>

      {/* SEO Paragraph */}
      <div className="max-w-3xl mx-auto border-t border-zinc-200/40 dark:border-zinc-900/40 pt-8 mb-8 text-center">
        <p className="text-[11px] text-zinc-400/80 dark:text-zinc-500/85 leading-relaxed max-w-2xl mx-auto">
          Space S is an AI thinking workspace — a visual, infinite canvas where knowledge workers, researchers, students, and remote teams connect ideas across AI conversations. Features include spatial note taking, collaborative AI brainstorming boards, non linear AI conversation tools, AI mind mapping, and real time multiplayer canvas editing.
        </p>
      </div>

      {/* Bottom copyright bar */}
      <div className="max-w-7xl mx-auto border-t border-zinc-200/20 dark:border-zinc-900/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-400 dark:text-zinc-500 text-[11px] font-medium">
        <div>
          &copy; {new Date().getFullYear()} Space S. All rights reserved.
        </div>
        <div className="flex gap-4">
          <span className="hover:underline cursor-pointer opacity-80 hover:opacity-100">Privacy Policy</span>
          <span className="hover:underline cursor-pointer opacity-80 hover:opacity-100">Terms of Service</span>
          <span className="hover:underline cursor-pointer opacity-80 hover:opacity-100">Contact Us</span>
        </div>
      </div>
    </footer>
  );
}
