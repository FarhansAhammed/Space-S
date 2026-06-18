import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aawdosuyuhlhrfsdrwqx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a fresh client each time so the correct getToken is always used.
// Caching the singleton was causing unauthenticated Supabase calls after the first render.
export const getSupabaseClient = (getToken?: () => Promise<string | null>): SupabaseClient => {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (getToken) {
      try {
        const token = await getToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (e) {
        console.error('Error fetching Clerk token for Supabase:', e);
      }
    }
    return fetch(input, {
      ...init,
      headers
    });
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: customFetch
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
