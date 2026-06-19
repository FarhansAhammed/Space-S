"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Sun, Moon, ArrowRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoaded: boolean;
  userId: string | null | undefined;
  creating: boolean;
  handleCreateCanvas: () => void;
  handleSignIn: () => void;
  handleGoDashboard: () => void;
}

export default function Navbar({
  theme,
  toggleTheme,
  isLoaded,
  userId,
  creating,
  handleCreateCanvas,
  handleSignIn,
  handleGoDashboard,
}: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 border-b border-[#1c1b18]/5 dark:border-[#f3f0ea]/5 bg-[#f8f5f0]/80 dark:bg-[#121110]/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/logo.png" alt="Space S Logo" className="w-5 h-5 object-contain" />
            <span className="font-space-grotesk font-semibold text-lg tracking-tight text-[#0d1233] dark:text-zinc-50">
              Space <span className="text-[#7c4dff] dark:text-[#a080ff] font-bold">S</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <a href="#product" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-[#0d1233] dark:hover:text-zinc-50 transition-colors">FAQ</a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center mr-1"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {isLoaded && userId ? (
              <>
                <button
                  onClick={handleGoDashboard}
                  className="h-10 px-4 rounded-xl font-semibold text-[13px] border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all text-[#1c1b18] dark:text-[#f3f0ea]"
                >
                  Go to Dashboard
                </button>
                <div className="flex items-center justify-center p-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/20">
                  <UserButton />
                </div>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="h-10 px-5 rounded-xl font-semibold text-[13px] bg-[#0d1233]/5 dark:bg-white/5 hover:bg-[#0d1233]/10 dark:hover:bg-white/10 text-[#0d1233] dark:text-zinc-50 transition-all"
              >
                Sign in
              </button>
            )}

            <button
              onClick={handleCreateCanvas}
              disabled={creating}
              className="h-10 px-5 rounded-xl font-semibold text-[13px] text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#131a47] dark:hover:bg-[#6836fc] shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>{creating ? 'Creating...' : 'Create New Canvas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/80 text-[#1c1b18] dark:text-[#f3f0ea]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[72px] p-6 bg-[#f8f5f0] dark:bg-[#121110] border-b border-[#1c1b18]/10 dark:border-[#f3f0ea]/10 z-40 flex flex-col gap-4 shadow-lg md:hidden animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-3 text-[14px] font-semibold text-[#1c1b18]/70 dark:text-[#f3f0ea]/70">
            <a href="#product" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">How It Works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 hover:bg-[#0d1233]/5 dark:hover:bg-white/5 rounded-lg">FAQ</a>
          </nav>

          <hr className="border-[#1c1b18]/10 dark:border-[#f3f0ea]/10 my-1" />

          <div className="flex flex-col gap-2.5">
            {isLoaded && userId ? (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleGoDashboard(); }}
                  className="w-full h-11 rounded-xl font-semibold text-[13px] border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 text-[#1c1b18] dark:text-[#f3f0ea]"
                >
                  Go to Dashboard
                </button>
                <div className="flex items-center justify-between p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/20">
                  <span className="text-xs font-semibold text-[#1c1b18]/60 dark:text-[#f3f0ea]/60 ml-2">Logged in user</span>
                  <UserButton />
                </div>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}
                className="w-full h-11 rounded-xl font-semibold text-[13px] bg-[#0d1233]/5 dark:bg-white/5 text-[#0d1233] dark:text-zinc-50 flex items-center justify-center"
              >
                Sign in
              </button>
            )}

            <button
              onClick={() => { setMobileMenuOpen(false); handleCreateCanvas(); }}
              disabled={creating}
              className="w-full h-11 rounded-xl font-semibold text-[13px] text-white bg-[#0d1233] dark:bg-[#7c4dff] hover:bg-[#131a47] dark:hover:bg-[#6836fc] flex items-center justify-center gap-1.5 shadow"
            >
              <span>{creating ? 'Creating...' : 'Create New Canvas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
