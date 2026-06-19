"use client";

import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  creating: boolean;
  handleCreateCanvas: () => void;
}

export default function HeroSection({
  creating,
  handleCreateCanvas,
}: HeroSectionProps) {
  // Animation state (0 to 5 steps)
  const [step, setStep] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setStep(5); // Show final layout immediately
      return;
    }

    const timer1 = setTimeout(() => setStep(1), 400);   // Node 1 fades in
    const timer2 = setTimeout(() => setStep(2), 1200);  // Node 2 fades in
    const timer3 = setTimeout(() => setStep(3), 1800);  // Thread 1 draws
    const timer4 = setTimeout(() => setStep(4), 2600);  // Node 3 fades in
    const timer5 = setTimeout(() => setStep(5), 3400);  // Thread 2 draws
    const timer6 = setTimeout(() => setStep(6), 4500);  // Cursor Rahim appears/moves
    const timerReset = setTimeout(() => {
      setStep(0);
    }, 9000); // 9-second loop duration

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
      clearTimeout(timerReset);
    };
  }, [step, prefersReducedMotion]);

  return (
    <section id="product" className="relative min-h-[calc(90vh-72px)] flex flex-col items-center justify-center px-4 sm:px-8 py-16 overflow-hidden">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e4dfd5_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2c29_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none z-0" />
      
      {/* Decorative soft glowing orbs */}
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-[#7c4dff]/5 dark:bg-[#7c4dff]/3 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-[#ff9100]/4 dark:bg-[#ff9100]/2 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column (55% equivalent: 7 cols) */}
        <div className="lg:col-span-7 text-left flex flex-col items-start">
          <span className="text-[11px] font-bold tracking-widest text-[#7c4dff] dark:text-[#a080ff] uppercase mb-4">
            AI THINKING WORKSPACE
          </span>
          
          <h1 className="font-space-grotesk font-bold text-4xl sm:text-5xl lg:text-6xl text-[#0d1233] dark:text-zinc-50 leading-[1.1] tracking-tight mb-6">
            Infinite <span className="underline decoration-[#7c4dff] dark:decoration-[#a080ff] decoration-wavy decoration-2">Canvas</span> AI Workspace
          </h1>
          
          <p className="font-inter text-sm sm:text-base lg:text-lg text-[#1c1b18]/70 dark:text-[#f3f0ea]/70 leading-relaxed mb-8 max-w-xl">
            Replace linear AI chat threads with a limitless AI brainstorming tool. Drop prompts anywhere, branch ideas into connected nodes, and see your research take shape on a visual thinking canvas.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-4">
            <button
              onClick={handleCreateCanvas}
              disabled={creating}
              className="h-12 px-7 rounded-xl font-semibold text-sm text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#182156] dark:hover:bg-[#6b3bfc] shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Start for free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="h-12 px-7 rounded-xl font-semibold text-sm border border-[#0d1233]/15 dark:border-white/10 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 text-[#0d1233] dark:text-zinc-50 transition-all flex items-center justify-center"
            >
              See how it works
            </a>
          </div>

          <div className="text-[11px] text-[#1c1b18]/50 dark:text-[#f3f0ea]/50 flex flex-wrap gap-x-3 gap-y-1">
            <span>No credit card required</span>
            <span>•</span>
            <span>Works in your browser</span>
            <span>•</span>
            <span>Free forever plan</span>
          </div>
        </div>

        {/* Right Column (45% equivalent: 5 cols) */}
        <div className="lg:col-span-5 w-full flex flex-col">
          <div className="w-full h-[400px] rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-[#fdfcf9] dark:bg-[#161514] overflow-hidden relative shadow-sm">
            {/* Inner dotted grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#e4dfd5_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2c29_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* SVG Connection Lines Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
              {/* Line 1 -> 2 */}
              <path
                d="M 120 115 Q 150 180, 195 190"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className={`transition-all duration-700 ${step >= 3 ? 'opacity-100 stroke-dashoffset-animate' : 'opacity-0'}`}
              />
              {/* Line 2 -> 3 */}
              <path
                d="M 230 185 Q 260 110, 275 95"
                fill="none"
                stroke="#7c4dff"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className={`transition-all duration-700 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}
              />
            </svg>

            {/* Node 1 */}
            <div
              className={`absolute top-[40px] left-[20px] w-[180px] p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm z-20 transition-all duration-500 ${
                step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#7c4dff] absolute top-2.5 left-2.5" />
              <h4 className="text-[10px] font-bold text-[#7c4dff] dark:text-[#a080ff] uppercase tracking-wider pl-3 mb-1">
                What is quantum entanglement?
              </h4>
              <p className="text-[9px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">
                A phenomenon where two particles share quantum state instantly regardless of distance...
              </p>
            </div>

            {/* Node 2 */}
            <div
              className={`absolute top-[180px] left-[130px] w-[180px] p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm z-20 transition-all duration-500 ${
                step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff9100] absolute top-2.5 left-2.5" />
              <h4 className="text-[10px] font-bold text-[#ff9100] uppercase tracking-wider pl-3 mb-1">
                Applications in cryptography
              </h4>
              <p className="text-[9px] text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 leading-normal">
                Quantum key distribution uses entanglement to create theoretically unbreakable encryption...
              </p>
            </div>

            {/* Node 3 (Synthesis) */}
            <div
              className={`absolute top-[50px] right-[20px] w-[160px] p-3.5 rounded-xl border border-[#7c4dff]/40 dark:border-[#a080ff]/30 bg-white dark:bg-zinc-900 shadow-sm z-20 transition-all duration-500 ${
                step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <span className="text-[8px] font-bold text-white bg-[#7c4dff] px-1.5 py-0.5 rounded mb-1.5 inline-block">
                SYNTHESIS
              </span>
              <p className="text-[9px] font-semibold text-[#1c1b18] dark:text-zinc-50 leading-normal">
                Quantum entanglement enables cryptography by creating unbreakable linked encryption keys.
              </p>
            </div>

            {/* User Cursor Rahim */}
            <div
              className={`absolute flex items-center gap-1.5 z-30 transition-all duration-[1500ms] ease-out pointer-events-none ${
                step >= 6
                  ? 'top-[160px] left-[80px] opacity-100'
                  : 'top-[350px] left-[250px] opacity-0'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#7c4dff] border border-white dark:border-zinc-950 shadow-sm animate-pulse" />
              <span className="text-[9px] font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-1.5 py-0.5 rounded shadow">
                Rahim
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#1c1b18]/40 dark:text-[#f3f0ea]/45 text-center mt-3 block">
            Live canvas preview — every response is a node you control.
          </span>
        </div>

      </div>
    </section>
  );
}
