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
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parentContent, parentTitle, userPrompt, model } = await req.json();

    if (!parentContent && !parentTitle) {
      return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
    }

    const systemPrompt = `You are a prompt analyzer. Determine if the user's prompt is a request to expand, explain, or detail multiple distinct sub-points, steps, layers, or components listed or described in the parent node's title/content.

If yes, you MUST identify all of those distinct sub-points/components from the parent node content and return them in a JSON list.
If no (meaning it is a request to explain a single point, ask a general question, or is unrelated to multiple sub-points), return isMultiExpansion: false.

Respond ONLY with a JSON object of this format (no markdown formatting, no comments, no extra text):
{
  "isMultiExpansion": true,
  "subPoints": ["Sub-point 1", "Sub-point 2", ...]
}
OR if it's not a multi-expansion request:
{
  "isMultiExpansion": false,
  "subPoints": []
}`;

    const userMessageContent = `Parent Node Title: "${parentTitle || ''}"\nParent Node Content: "${parentContent || ''}"\nUser's Prompt: "${userPrompt || ''}"`;

    let rawText = '';

    const GEMINI_MODELS: Record<string, string> = {
      'gemini': 'gemini-2.5-flash',
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
      'gemini-3-flash': 'gemini-3-flash-preview',
      'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
      'gemma-4-31b': 'gemma-4-31b-it',
    };

    if (model && model in GEMINI_MODELS) {
      const geminiModelId = GEMINI_MODELS[model];
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error('Missing GEMINI_API_KEY environment variable');
        return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: userMessageContent }] }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            maxOutputTokens: 500,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini prompt analysis failed:', errorText);
        return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
      }

      const data = await response.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const apiKey = process.env.POOLSIDE_API_KEY;
      if (!apiKey) {
        console.error('Missing POOLSIDE_API_KEY environment variable');
        return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
      }

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
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Poolside prompt analysis failed:', errorText);
        return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
      }

      const data = await response.json();
      rawText = data.choices?.[0]?.message?.content || '';
    }

    // Clean up markdown code block fences if any
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleanedText);
      return NextResponse.json({
        isMultiExpansion: !!parsed.isMultiExpansion,
        subPoints: Array.isArray(parsed.subPoints) ? parsed.subPoints : []
      });
    } catch (e) {
      console.error('Failed to parse prompt analysis JSON response:', cleanedText, e);
      return NextResponse.json({ isMultiExpansion: false, subPoints: [] });
    }

  } catch (error) {
    console.error('Error in analyze-prompt route:', error);
    return NextResponse.json({ isMultiExpansion: false, subPoints: [] }, { status: 500 });
  }
}
