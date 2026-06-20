"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

export default function FAQSection() {
  const faqs: FAQItem[] = [
    {
      id: "faq-1",
      q: "What's the best AI brainstorming tool for visual thinkers?",
      a: "Space S is built specifically for visual, non linear thinking. Unlike ChatGPT or Claude, which give you a single scrolling thread, Space S places every AI response as a node on an infinite canvas. You can move nodes around, connect them with thread lines, and branch off sub ideas spatially, making it the most complete AI brainstorming tool for people who think in maps, not lists."
    },
    {
      id: "faq-2",
      q: "How do I avoid losing context in long AI conversations?",
      a: "The root cause of lost context isn't AI memory. It is the linear interface forcing everything into one sequential thread. Space S solves this architecturally: every topic lives in its own node, so you never have to scroll past unrelated content to find what you need. Branch off a new node whenever a conversation deepens, and connect nodes when topics overlap. Your context stays spatial and visible, not buried."
    },
    {
      id: "faq-3",
      q: "Can I use Space S for team collaboration with AI?",
      a: "Yes. Real time multiplayer is built into Space S from the ground up. Share an invite link and your collaborator joins the same canvas with their own colored cursor and username. Every node, every branch, and every connection syncs live. It's a true collaborative AI brainstorming board, not a read only shared document."
    },
    {
      id: "faq-4",
      q: "Is there an AI tool that works like a mind map?",
      a: "Space S is the closest thing to a mind map AI tool that exists today. You start with a prompt, get an AI response as a card, then branch and connect cards across the canvas. It has the structure of a mind map, but every card is a live AI conversation you can continue. You can also connect two unrelated cards and ask Space S to find the connection between them, which no traditional mind map tool can do."
    },
    {
      id: "faq-5",
      q: "How is Space S different from Miro or FigJam?",
      a: "Miro and FigJam are visual collaboration tools designed for human made content like sticky notes, shapes, and diagrams you draw yourself. Space S is an AI native canvas: every node is a live AI conversation you can continue, branch, and synthesize. The AI doesn't sit outside the canvas as a sidebar. It is the canvas. You can't replicate this with a Miro AI integration."
    }
  ];

  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-8 bg-[#fdfcf9] dark:bg-[#0d0c0b] border-t border-b border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        
        <div className="text-center mb-16">
          <h2 className="font-space-grotesk font-bold text-3xl sm:text-4xl md:text-5xl text-[#0d1233] dark:text-zinc-50 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="font-inter text-sm sm:text-base text-[#1c1b18]/60 dark:text-[#f3f0ea]/60">
            If you've used AI tools before, you probably have these questions.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="border-b border-zinc-200/60 dark:border-zinc-800/80 pb-4"
              >
                <h3>
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`panel-${faq.id}`}
                    className="w-full flex items-center justify-between text-left py-3 font-space-grotesk font-bold text-[#0d1233] dark:text-zinc-50 hover:text-[#7c4dff] dark:hover:text-[#a080ff] transition-colors group"
                  >
                    <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
                    <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-[#7c4dff] transition-all">
                      <Plus className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-[135deg] text-red-500' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`panel-${faq.id}`}
                  role="region"
                  aria-labelledby={faq.id}
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="font-inter text-xs sm:text-sm text-[#1c1b18]/65 dark:text-[#f3f0ea]/65 leading-relaxed pl-1 pb-2">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* SEO/AEO signals paragraph */}
        <p className="font-inter text-[12px] sm:text-[13px] text-[#1c1b18]/50 dark:text-[#f3f0ea]/55 max-w-2xl mx-auto mt-12 text-center leading-relaxed">
          Space S is an infinite canvas AI tool that replaces linear chat interfaces for knowledge work. It supports AI research assistants workflows, non linear brainstorming, spatial note taking, visual knowledge mapping, and real time collaborative AI sessions. Teams globally use Space S to connect ideas across AI conversations and build structured knowledge from unstructured thinking.
        </p>

      </div>
    </section>
  );
}
