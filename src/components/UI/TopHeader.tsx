import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, LayoutGrid, Sun, Moon, Users, X, Loader2, Bot, Check, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { UserButton, Show, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

export const TopHeader = () => {
  const { addLLMNodeFromSearch, theme, toggleTheme, boardId, presenceUsers, userRole, selectedModel, setSelectedModel } = useCanvasStore();
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = userRole === 'owner';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Call store action to generate a parent node from this search query
    addLLMNodeFromSearch(searchQuery.trim());
    setSearchQuery('');
  };

  const fetchInviteStatus = async () => {
    if (!boardId || boardId === 'sample-board') return;
    setLoadingInvite(true);
    try {
      const sessionToken = await getToken();
      const response = await fetch(`/api/canvas/invite?canvasId=${boardId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInviteToken(data.inviteToken);
        setInviteEnabled(data.inviteEnabled);
      }
    } catch (e) {
      console.error('Failed to fetch invite status:', e);
    } finally {
      setLoadingInvite(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('spaceS_selectedModel');
      if (savedModel === 'poolside' || savedModel === 'gemini') {
        setSelectedModel(savedModel);
      }
    }
  }, [setSelectedModel]);

  useEffect(() => {
    if (showInviteModal) {
      fetchInviteStatus();
    }
  }, [showInviteModal]);

  const generateInviteLink = async () => {
    if (!boardId) return;
    setLoadingInvite(true);
    try {
      const sessionToken = await getToken();
      const response = await fetch('/api/canvas/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ canvasId: boardId })
      });
      if (response.ok) {
        const data = await response.json();
        setInviteToken(data.inviteToken);
        setInviteEnabled(data.inviteEnabled);
      }
    } catch (e) {
      console.error('Failed to generate invite:', e);
    } finally {
      setLoadingInvite(false);
    }
  };

  const toggleInviteLink = async () => {
    if (!boardId) return;
    try {
      const sessionToken = await getToken();
      const nextStatus = !inviteEnabled;
      const response = await fetch('/api/canvas/invite', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ canvasId: boardId, enabled: nextStatus })
      });
      if (response.ok) {
        setInviteEnabled(nextStatus);
      }
    } catch (e) {
      console.error('Failed to toggle invite status:', e);
    }
  };

  const copyInviteLink = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/join/${inviteToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-[64px] border-b border-white/20 dark:border-zinc-900/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 z-40 fixed top-0 left-0 right-0 transition-colors duration-200">
      
      {/* Brand & Left Navigation */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/15 dark:hover:border-zinc-850/50 transition-all"
        >
          {/* Logo image */}
          <img src="/logo.png" alt="Space-S Logo" className="w-5 h-5 object-contain" />
          <span className="font-semibold text-sm font-display text-zinc-800 dark:text-zinc-200 hidden sm:inline">Space<span className="text-[#7c4dff] dark:text-[#a080ff] font-bold">-S</span></span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 hidden sm:inline" />
        </Link>

        {/* Back navigation */}
        <Link 
          href="/dashboard"
          title="Back to Dashboard"
          className="w-8 h-8 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Search Bar (Creating Parent Nodes) */}
      <form 
        onSubmit={handleSearchSubmit} 
        className="hidden md:block flex-1 max-w-[480px] mx-4 lg:mx-8 relative"
      >
        <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Type a topic or question and press Enter to create a node..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-10 pr-14 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:border-[#7c4dff] dark:focus:border-[#7c4dff] text-xs bg-black/5 dark:bg-white/5 focus:bg-white/70 dark:focus:bg-zinc-900/70 text-zinc-800 dark:text-zinc-200 font-sans transition-all placeholder-zinc-400 dark:placeholder-zinc-500 shadow-inner"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono border border-black/5 dark:border-white/5 px-1.5 py-0.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 pointer-events-none shadow-sm">
          <span>↵</span>
        </div>
      </form>

      {/* Right Controls / Profiles */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* View Grid Layout Icon */}
        <button className="hidden sm:flex w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center shadow-sm">
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="h-9 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            {selectedModel === 'gemini' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="hidden sm:inline">Gemini 2.5 Flash</span>
                <span className="inline sm:hidden">Gemini</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-[#7c4dff]" />
                <span>Poolside</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          </button>

          {showModelDropdown && (
            <>
              {/* Backing overlay to close dropdown on click outside */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setShowModelDropdown(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModel('poolside');
                    setShowModelDropdown(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedModel === 'poolside' ? 'text-[#7c4dff]' : 'text-zinc-650 dark:text-zinc-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-[#7c4dff]" />
                    <span>Poolside</span>
                  </div>
                  {selectedModel === 'poolside' && <Check className="w-3.5 h-3.5 text-[#7c4dff]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedModel('gemini');
                    setShowModelDropdown(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${selectedModel === 'gemini' ? 'text-indigo-500' : 'text-zinc-650 dark:text-zinc-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gemini 2.5 Flash</span>
                  </div>
                  {selectedModel === 'gemini' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggler Button */}
        <button 
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all flex items-center justify-center shadow-sm"
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* User avatar / Sign In / Sign Up */}
        <Show when="signed-in">
          <div className="flex items-center gap-3">
            {/* Live Presence Avatar Stack */}
            {presenceUsers.length > 0 && (
              <div className="flex items-center -space-x-2 mr-1">
                {presenceUsers.slice(0, 4).map(u => (
                  <div
                    key={u.userId}
                    title={u.username}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[10px] font-bold text-white transition-all hover:-translate-y-0.5 select-none shadow-sm cursor-help"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                ))}
                {presenceUsers.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold select-none shadow-sm">
                    +{presenceUsers.length - 4}
                  </div>
                )}
              </div>
            )}

            {boardId && boardId !== 'sample-board' && (
              <button 
                onClick={() => setShowInviteModal(true)}
                className="h-9 px-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs hover:bg-zinc-850 dark:hover:bg-zinc-200 shadow hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invite</span>
              </button>
            )}
            
            <div className="flex items-center justify-center">
              <UserButton />
            </div>
          </div>
        </Show>
        <Show when="signed-out">
          <div className="flex items-center gap-2.5">
            <Link 
              href="/sign-in" 
              className="h-9 px-4 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all"
            >
              Sign In
            </Link>
            <Link 
              href="/sign-up" 
              className="h-9 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm transition-all"
            >
              Sign Up
            </Link>
          </div>
        </Show>
      </div>

      {/* Invite Modal Overlay */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" 
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl w-full max-w-sm shadow-xl relative transition-all" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mb-1">Invite Collaborators</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Share this link to invite others to edit this canvas.</p>
            
            {loadingInvite ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-[#7c4dff] animate-spin" />
              </div>
            ) : inviteToken ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-950/30">
                  <span className="text-[10px] font-mono select-all truncate w-4/5 text-zinc-600 dark:text-zinc-400 pr-2">
                    {window.location.origin}/join/{inviteToken}
                  </span>
                  <button
                    onClick={copyInviteLink}
                    className="px-2.5 py-1 bg-[#7c4dff] text-white rounded text-[10px] font-semibold hover:bg-[#6200ea] transition-all whitespace-nowrap"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {isOwner ? (
                  <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3 text-xs">
                    <div className="flex flex-col text-left">
                      <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-xs">Invite Link Status</span>
                      <span className={`text-[10px] ${inviteEnabled ? 'text-green-600 dark:text-green-400 font-medium' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {inviteEnabled ? 'Active — Anyone with link can join' : 'Disabled — Access is revoked'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleInviteLink}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#7c4dff]/50 ${inviteEnabled ? 'bg-green-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all"></div>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
                    Only the canvas owner can toggle the link status.
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={generateInviteLink}
                disabled={!isOwner}
                className="w-full h-9 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-850 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {isOwner ? 'Generate Invite Link' : 'No invite link generated yet'}
              </button>
            )}

            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </header>
  );
};
export default TopHeader;
