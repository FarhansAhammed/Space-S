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

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { canvasId, name } = await req.json();
    if (!canvasId || !name?.trim()) {
      return NextResponse.json({ error: 'Missing canvasId or name' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user owns this canvas (only owners can rename)
    const { data: member } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!member) return NextResponse.json({ error: 'Only owners can rename canvases' }, { status: 403 });

    const { error } = await supabaseAdmin
      .from('canvases')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', canvasId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');
    if (!canvasId) return NextResponse.json({ error: 'Missing canvasId' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user is the owner
    const { data: member } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!member) return NextResponse.json({ error: 'Canvas not found or you are not the owner' }, { status: 403 });

    const { error } = await supabaseAdmin.from('canvases').delete().eq('id', canvasId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
