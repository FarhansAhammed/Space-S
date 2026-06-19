"use client";

import React from 'react';

export default function WhoUsesSection() {
  const users = [
    {
      role: "RESEARCHERS",
      body: "Researchers use Space-S to run AI-powered literature reviews. They upload papers directly onto the canvas, branch findings by theme, and synthesize contradictions — all inside one visual AI research assistant."
    },
    {
      role: "FOUNDERS & PMs",
      body: "Founders and product managers use Space-S to map strategy. They run AI brainstorming sessions across multiple angles of a problem, connect insights from different contexts, and share the canvas with their team as a live working document."
    },
    {
      role: "STUDENTS",
      body: "Students working on complex papers or projects build their entire research structure on Space-S. They break topics into connected cards, draw relationships like a mind map AI would generate, and never lose the thread of a long study session."
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-8 bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-4">
          Who Uses Space-S
        </h2>
        <p className="font-inter text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 max-w-xl mx-auto">
          Built for people whose thinking doesn't fit in a box.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.map((user) => (
          <div
            key={user.role}
            className="p-7 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-[#161514] shadow-sm hover:shadow transition-all flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#7c4dff] dark:text-[#a080ff] uppercase block mb-4">
                {user.role}
              </span>
              <p className="font-inter text-xs sm:text-sm text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed">
                {user.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
