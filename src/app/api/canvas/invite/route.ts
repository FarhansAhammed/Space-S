import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

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

// GET: Retrieve current invite status for a canvas
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'Missing canvasId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user is a member of this canvas
    const { data: member, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Canvas not found or access denied' }, { status: 403 });
    }

    // Get invite details
    const { data: canvas, error: canvasError } = await supabaseAdmin
      .from('canvases')
      .select('invite_token, invite_enabled, owner_id')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: canvasError?.message || 'Failed to fetch canvas invite status' }, { status: 500 });
    }

    return NextResponse.json({
      inviteToken: canvas.invite_token,
      inviteEnabled: canvas.invite_enabled,
      isOwner: canvas.owner_id === userId
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in canvas invite GET:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Generate invite link (token) and enable it
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { canvasId } = await req.json();
    if (!canvasId) return NextResponse.json({ error: 'Missing canvasId' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user is the owner (only owner can generate invite link)
    const { data: member, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Only owners can generate invite links' }, { status: 403 });
    }

    // Check if invite token already exists
    const { data: canvas, error: canvasError } = await supabaseAdmin
      .from('canvases')
      .select('invite_token')
      .eq('id', canvasId)
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    let token = canvas.invite_token;
    if (!token) {
      // Generate a secure random token
      token = crypto.randomBytes(16).toString('hex');
    }

    // Save/Update canvas
    const { error: updateError } = await supabaseAdmin
      .from('canvases')
      .update({
        invite_token: token,
        invite_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', canvasId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ inviteToken: token, inviteEnabled: true }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in canvas invite POST:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Enable / Disable the invite link
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { canvasId, enabled } = await req.json();
    if (!canvasId || enabled === undefined) {
      return NextResponse.json({ error: 'Missing canvasId or enabled status' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user is the owner
    const { data: member, error: memberError } = await supabaseAdmin
      .from('canvas_members')
      .select('role')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Only owners can modify invite status' }, { status: 403 });
    }

    // Update canvas invite_enabled status
    const { error: updateError } = await supabaseAdmin
      .from('canvases')
      .update({
        invite_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', canvasId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inviteEnabled: enabled }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in canvas invite PATCH:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
