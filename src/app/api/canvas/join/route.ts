import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { token } = await req.json();
    if (!token?.trim()) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Look up canvas by invite_token (first select without invite_enabled check to handle existing member bypass)
    const { data: canvas, error: canvasError } = await supabaseAdmin
      .from('canvases')
      .select('id, name, invite_enabled, owner_id')
      .eq('invite_token', token.trim())
      .maybeSingle();

    if (canvasError) {
      console.error('Error looking up canvas for invite token:', canvasError);
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }

    if (!canvas) {
      return NextResponse.json({ error: 'This invite link is invalid or has been disabled.' }, { status: 404 });
    }

    // 2. Check if user is already a member
    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvas.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) {
      console.error('Error checking existing membership:', memberError);
      return NextResponse.json({ error: 'Database error checking membership' }, { status: 500 });
    }

    // 3. If they are not a member and the link is disabled, reject
    if (!existingMember && !canvas.invite_enabled) {
      return NextResponse.json({ error: 'This invite link is invalid or has been disabled.' }, { status: 404 });
    }

    // 4. Ensure user exists in our DB (Self-healing sync check)
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!dbUser) {
      // In case they are logged in via Clerk but not yet synced in DB:
      // Insert with fallback color/email
      const colors = ['#4f46e5', '#7c3aed', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#0ea5e9'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      await supabaseAdmin.from('users').insert({
        id: userId,
        email: `${userId}@clerk.local`,
        username: `user_${userId.slice(-8)}`,
        avatar_color: avatarColor
      });
    }

    // 5. Enroll user as canvas editor member if not already a member
    if (!existingMember) {
      const { error: enrollError } = await supabaseAdmin
        .from('canvas_members')
        .insert({
          canvas_id: canvas.id,
          user_id: userId,
          role: 'editor'
        });

      if (enrollError) {
        console.error('Error enrolling user into canvas members:', enrollError);
        return NextResponse.json({ error: 'Failed to join canvas. Please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json({ canvasId: canvas.id, canvasName: canvas.name }, { status: 200 });

  } catch (error: unknown) {
    console.error('Unhandled error in canvas invite acceptance:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
