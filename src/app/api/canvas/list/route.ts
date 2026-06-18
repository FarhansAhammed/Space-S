import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch all canvas_ids where the user is a member
    const { data: membershipData, error: membershipError } = await supabaseAdmin
      .from('canvas_members')
      .select('canvas_id')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Error fetching canvas memberships:', membershipError);
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    const canvasIds = (membershipData || []).map(m => m.canvas_id);

    if (canvasIds.length === 0) {
      return NextResponse.json({ canvases: [] }, { status: 200 });
    }

    // Fetch all canvases where the user is a member (bypasses RLS using admin key)
    const { data, error } = await supabaseAdmin
      .from('canvases')
      .select(`
        id,
        name,
        owner_id,
        updated_at,
        created_at,
        owner:users!owner_id (
          username,
          avatar_color
        ),
        canvas_members (
          role,
          user_id
        ),
        nodes (
          id
        )
      `)
      .in('id', canvasIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching canvases:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ canvases: data ?? [] }, { status: 200 });
  } catch (error: unknown) {
    console.error('Unhandled error in canvas list:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
