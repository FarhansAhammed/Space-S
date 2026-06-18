"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { XCircle, Loader2 } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const { token } = useParams();
  const { getToken } = useAuth();
  
  const [status, setStatus] = useState<'joining' | 'error'>('joining');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function join() {
      if (!token) return;

      try {
        const sessionToken = await getToken();
        const response = await fetch('/api/canvas/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Failed to accept invite');
        }

        if (data.canvasId) {
          router.push(`/board/${data.canvasId}`);
        } else {
          throw new Error('No canvas ID returned');
        }
      } catch (err: unknown) {
        console.error('Failed to join:', err);
        const errMsg = err instanceof Error ? err.message : 'The invite link is invalid or has expired.';
        setErrorMsg(errMsg);
        setStatus('error');
      }
    }

    join();
  }, [token, getToken, router]);

  return (
    <main className="w-screen h-screen flex items-center justify-center bg-[#f8f5f0] dark:bg-[#121110] transition-colors duration-200">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/80 shadow-glass text-center transition-colors">
        {status === 'joining' ? (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="w-10 h-10 text-[#7c4dff] animate-spin mb-4" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-display mb-2">Joining Thinking Space...</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Enrolling you into this canvas and setting up collaboration.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-5">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-display mb-3">Invite Link Invalid</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed max-w-[300px]">
              {errorMsg}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="h-9 px-6 rounded-lg bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-semibold text-xs shadow transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
