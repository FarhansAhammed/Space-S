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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return NextResponse.json({ error: 'Gemini service configuration error' }, { status: 500 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    const fileMimeType = file.type || 'application/pdf'; // fallback to PDF if undefined

    const promptText = "Transcribe all the contents of this document/image as text. It must be a full transcription, not a summary. Output only the transcribed text exactly as it appears. If there is no text or it's unreadable, say so.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: fileMimeType,
                  data: base64Data
                }
              },
              {
                text: promptText
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Transcription API error:', errorText);
      return NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text extracted.';

    return NextResponse.json({ text: transcribedText, filename: file.name });

  } catch (error: unknown) {
    console.error('Error in transcribe API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
