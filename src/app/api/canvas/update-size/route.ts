import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth({ acceptsToken: 'session_token' });
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { canvasId, nodeId, width, height } = body;

    if (!canvasId || !nodeId || width === undefined || height === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify user membership in canvas_members
    const { data: member, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Unauthorized to modify this canvas' }, { status: 403 });
    }

    // 2. Update size in the nodes table
    const { error: updateError } = await supabaseAdmin
      .from('nodes')
      .update({
        width: parseFloat(width),
        height: parseFloat(height),
        updated_at: new Date().toISOString()
      })
      .eq('id', nodeId)
      .eq('canvas_id', canvasId);

    if (updateError) {
      console.error('Error updating node size:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Unhandled error in update-size API:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
