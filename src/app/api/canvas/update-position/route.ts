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
    const { canvasId } = body;

    if (!canvasId) {
      return NextResponse.json({ error: 'Missing canvasId' }, { status: 400 });
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

    // 2. We can accept either "updates" (batch) or single nodeId, positionX, positionY
    if (body.updates && Array.isArray(body.updates)) {
      // Perform batch update
      // supabase does not support batch updates with different values easily in a single query,
      // so we can execute them concurrently using Promise.all or sequentially.
      // Since it's usually 1 or a few nodes, Promise.all is great.
      const updatePromises = body.updates.map((up: { nodeId: string; positionX: number; positionY: number }) => {
        return supabaseAdmin
          .from('nodes')
          .update({
            position_x: up.positionX,
            position_y: up.positionY,
            updated_at: new Date().toISOString()
          })
          .eq('id', up.nodeId)
          .eq('canvas_id', canvasId);
      });

      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error);
      if (firstError) {
        console.error('Error in batch node position update:', firstError.error);
        return NextResponse.json({ error: firstError.error.message }, { status: 500 });
      }
    } else {
      const { nodeId, positionX, positionY } = body;
      if (!nodeId || positionX === undefined || positionY === undefined) {
        return NextResponse.json({ error: 'Missing required node parameters' }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('nodes')
        .update({
          position_x: positionX,
          position_y: positionY,
          updated_at: new Date().toISOString()
        })
        .eq('id', nodeId)
        .eq('canvas_id', canvasId);

      if (updateError) {
        console.error('Error updating node position:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Unhandled error in update-position API:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
