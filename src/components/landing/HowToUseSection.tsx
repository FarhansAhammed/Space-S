"use client";

import React from 'react';
import { MousePointerClick, MessageSquare, Crop, Link2, Users } from 'lucide-react';

export default function HowToUseSection() {
  const steps = [
    {
      num: "1",
      icon: <MousePointerClick className="w-5 h-5 text-[#7c4dff]" />,
      title: "Open your canvas",
      body: "You see a big empty space — like a blank piece of paper, but infinite. This is where your thinking will happen."
    },
    {
      num: "2",
      icon: <MessageSquare className="w-5 h-5 text-[#7c4dff]" />,
      title: "Ask a question anywhere",
      body: "Click anywhere on the canvas and type a question — just like texting. The AI answers you, and that answer appears as a card right where you clicked."
    },
    {
      num: "3",
      icon: <Crop className="w-5 h-5 text-[#7c4dff]" />,
      title: "Pick a part you want to learn more about",
      body: "See something interesting in the answer? Highlight it with your mouse. Click the Branch button to grow a new card to the side with a deeper answer."
    },
    {
      num: "4",
      icon: <Link2 className="w-5 h-5 text-[#7c4dff]" />,
      title: "Connect two different ideas",
      body: "Say you have cards about black holes and philosophy. Draw a line between them and click Synthesize. Space S will find a surprising connection."
    },
    {
      num: "5",
      icon: <Users className="w-5 h-5 text-[#7c4dff]" />,
      title: "Invite a friend",
      body: "Click Invite and share the link. Your friend joins the same canvas. You can both add cards at the same time — like a smart shared whiteboard."
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-8 bg-[#f5ebd9] dark:bg-[#1a1918] border-t-2 border-b-2 border-dashed border-[#e4dfd5] dark:border-[#2d2c29] transition-colors duration-200">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-4">
          How to Use Space S
        </h2>
        <p className="font-inter text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 max-w-xl mx-auto">
          Even if you've never used an AI tool before, you'll understand this in 60 seconds.
        </p>
      </div>

      {/* 5 Steps horizontal sequence */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-6 rounded-2xl bg-white/60 dark:bg-[#121110]/60 border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col justify-between shadow-sm relative"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-space-grotesk font-bold text-3xl text-[#7c4dff] dark:text-[#a080ff]">
                  {step.num}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#7c4dff]/10 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>
              <h3 className="font-space-grotesk font-bold text-sm text-[#0d1233] dark:text-zinc-50 mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="font-inter text-xs text-[#1c1b18]/70 dark:text-[#f3f0ea]/70 leading-relaxed">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Teacher Callout Box */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-[#121110] border border-zinc-200/60 dark:border-zinc-800 p-5 sm:p-6 rounded-2xl text-center shadow-sm">
          <p className="font-inter text-xs sm:text-sm text-[#1c1b18]/80 dark:text-[#f3f0ea]/80 leading-relaxed">
            🎓 <strong className="font-semibold text-[#7c4dff] dark:text-[#a080ff]">Teachers:</strong> Space S works great for classroom brainstorming sessions. Students can work on the same canvas during a lesson — every student's thinking is visible in real time.
          </p>
        </div>
      </div>
    </section>
  );
}
