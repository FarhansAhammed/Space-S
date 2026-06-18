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

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'canvasId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify user membership
    const { data: member, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !member) {
      console.warn(`Access denied to canvas ${canvasId} for user ${userId}`);
      return NextResponse.json({ error: 'Access denied or canvas not found' }, { status: 403 });
    }

    // 2. Fetch canvas
    const { data: canvas, error: canvasError } = await supabaseAdmin
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: canvasError?.message || 'Failed to load canvas' }, { status: 500 });
    }

    // 3. Fetch nodes
    const { data: dbNodes, error: nodesError } = await supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('canvas_id', canvasId);

    if (nodesError) throw nodesError;

    // 4. Fetch edges
    const { data: dbEdges, error: edgesError } = await supabaseAdmin
      .from('edges')
      .select('*')
      .eq('canvas_id', canvasId);

    if (edgesError) throw edgesError;

    // 5. Fetch messages for all nodes
    const nodeIds = (dbNodes || []).map(n => n.id);
    let dbMessages: Array<{ id: string; node_id: string; role: 'user' | 'assistant'; content: string; created_at: string }> = [];
    if (nodeIds.length > 0) {
      const { data: messagesData, error: messagesError } = await supabaseAdmin
        .from('node_messages')
        .select('*')
        .in('node_id', nodeIds)
        .order('created_at', { ascending: true });
      if (messagesError) throw messagesError;
      dbMessages = messagesData || [];
    }

    return NextResponse.json({
      canvas,
      nodes: dbNodes ?? [],
      edges: dbEdges ?? [],
      messages: dbMessages
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Unhandled error in canvas get route:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
