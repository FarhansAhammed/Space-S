import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@clerk/nextjs/server';

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    console.warn('getUserId: Authorization header token is missing');
    return null;
  }
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    return payload?.sub ?? null;
  } catch (err) {
    console.error('getUserId: Clerk token verification failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let title = 'Untitled';
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let content = '';
    try {
      const body = await req.json();
      content = body.content || '';
      title = body.title || 'Untitled';
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const apiKey = process.env.POOLSIDE_API_KEY;
    if (!apiKey) {
      console.error('Missing POOLSIDE_API_KEY environment variable');
      return NextResponse.json({ error: 'AI service configuration error' }, { status: 500 });
    }

    const systemPrompt = `You are a context classifier. Given a piece of text, extract:
1. The specific domain or field this text belongs to (be specific — not just 'science' but 'Quantum Physics' or 'Organic Chemistry').
2. The specific topic within that domain.
3. A comma-separated list of the 3-5 most important named concepts or entities.

Respond ONLY in this exact format, nothing else:
DOMAIN: [domain]
TOPIC: [specific topic]
ENTITIES: [entity1, entity2, entity3]`;

    const userMessageContent = `Title: ${title || 'Untitled'}\nContent excerpt: ${content.slice(0, 600)}`;

    const response = await fetch('https://inference.poolside.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'poolside/laguna-xs.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent }
        ],
        stream: false,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Poolside context extraction failed:', errorText);
      return NextResponse.json({ contextSummary: `General context: ${title || 'Untitled'}` });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    let domain = '';
    let topic = '';
    let entities = '';

    const lines = rawText.split('\n');
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('DOMAIN:')) {
        domain = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('TOPIC:')) {
        topic = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('ENTITIES:')) {
        entities = trimmed.slice(9).trim();
      }
    });

    if (domain && topic) {
      const summary = `${domain}: ${topic}.${entities ? ` Key entities: ${entities}.` : ''}`;
      return NextResponse.json({ contextSummary: summary });
    }

    return NextResponse.json({ contextSummary: `General context: ${title || 'Untitled'}` });

  } catch (error: unknown) {
    console.error('Error in extract-context route:', error);
    return NextResponse.json({ contextSummary: `General context: ${title || 'Untitled'}` });
  }
}
