import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Helper: Extract and verify Clerk userId from the request Bearer token
async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return null;

  try {
    // verifyToken validates the JWT signature + expiry using Clerk's JWKS
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!
    });
    return payload?.sub ?? null;
  } catch (e) {
    console.warn('Bearer token verification failed:', e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      console.warn('Canvas create: no valid userId found in Bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional name from body
    let name = 'Untitled Canvas';
    try {
      const body = await req.json();
      if (body?.name) name = body.name;
    } catch {
      // Body might be empty
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Self-healing user sync: ensure user exists in the DB
    const { data: dbUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking user existence:', selectError);
      return NextResponse.json({ error: `DB check failed: ${selectError.message}` }, { status: 500 });
    }

    if (!dbUser) {
      console.log('Self-healing user sync: inserting user ID:', userId);

      let email = `${userId}@clerk.local`;
      let username = `user_${userId.slice(-8)}`;
      const colors = ['#4f46e5', '#7c3aed', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#0ea5e9'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      try {
        // Get real user info from Clerk backend
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        if (clerkUser) {
          const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
          if (clerkEmail) {
            email = clerkEmail;
            const base = clerkEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
            username = `${base.length >= 3 ? base : 'user'}_${Math.random().toString(36).slice(2, 6)}`;
          }
        }
      } catch (clerkError) {
        console.warn('Clerk user lookup failed, using fallback:', clerkError);
      }

      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: userId,
        email,
        username,
        avatar_color: avatarColor
      });

      if (insertError) {
        console.error('Failed to insert user in self-healing sync:', insertError);
        return NextResponse.json({ error: `User sync failed: ${insertError.message}` }, { status: 500 });
      }
      console.log('Successfully inserted user:', userId);
    }

    // 2. Insert the canvas
    const { data: canvas, error: canvasError } = await supabaseAdmin
      .from('canvases')
      .insert({
        owner_id: userId,
        name,
        viewport: { x: 0, y: 0, zoom: 1 }
      })
      .select()
      .single();

    if (canvasError || !canvas) {
      console.error('Error creating canvas:', canvasError);
      return NextResponse.json({ error: canvasError?.message || 'Failed to create canvas' }, { status: 500 });
    }

    // 3. Add owner as canvas member
    const { error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .insert({
        canvas_id: canvas.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) {
      console.error('Error creating canvas member:', memberError);
      await supabaseAdmin.from('canvases').delete().eq('id', canvas.id);
      return NextResponse.json({ error: memberError.message || 'Failed to create canvas membership' }, { status: 500 });
    }

    console.log('Canvas created successfully:', canvas.id, 'for user:', userId);
    return NextResponse.json({ canvas }, { status: 200 });
  } catch (error: unknown) {
    console.error('Unhandled error in canvas creation:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
