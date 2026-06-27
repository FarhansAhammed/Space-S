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

    const { messages, systemPrompt, model } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const fallbackSystemPrompt = "You are a concise thinking partner. Respond clearly and directly. Do not use unnecessary preamble.";
    const activeSystemPrompt = systemPrompt ?? fallbackSystemPrompt;

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
        return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
      }

      // Map roles and sanitize for Gemini's strict requirements:
      // 1. Alternating user and model roles.
      // 2. Must start with a user message.
      // 3. Clean up empty/whitespace-only messages.
      const rawMapped = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        text: msg.content || ''
      }));

      const sanitizedMessages: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

      for (const msg of rawMapped) {
        if (!msg.text.trim()) continue; // skip empty messages

        if (sanitizedMessages.length === 0) {
          // First message must be 'user'
          if (msg.role === 'model') {
            sanitizedMessages.push({
              role: 'user',
              parts: [{ text: 'Here is the context of our conversation:' }]
            });
          }
          sanitizedMessages.push({
            role: msg.role as 'user' | 'model',
            parts: [{ text: msg.text }]
          });
        } else {
          const lastMsg = sanitizedMessages[sanitizedMessages.length - 1];
          if (lastMsg.role === msg.role) {
            // Merge consecutive messages of the same role
            lastMsg.parts[0].text += '\n\n' + msg.text;
          } else {
            sanitizedMessages.push({
              role: msg.role as 'user' | 'model',
              parts: [{ text: msg.text }]
            });
          }
        }
      }

      // Safe fallback if empty
      if (sanitizedMessages.length === 0) {
        sanitizedMessages.push({
          role: 'user',
          parts: [{ text: 'Hello' }]
        });
      }

      const payload: any = {
        contents: sanitizedMessages
      };

      if (activeSystemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: activeSystemPrompt }]
        };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:streamGenerateContent?key=${geminiApiKey}&alt=sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: response.status });
      }

      const reader = response.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);
                  try {
                    const parsed = JSON.parse(dataStr);
                    const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (content) {
                      controller.enqueue(encoder.encode(content));
                    }
                  } catch {
                    // Ignore JSON parse errors on stream metadata
                  }
                }
              }
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    const MISTRAL_MODELS: Record<string, string> = {
      'mistral-large': 'mistral-large-latest',
      'mistral-small': 'mistral-small-latest',
      'codestral': 'codestral-latest'
    };

    if (model && model in MISTRAL_MODELS) {
      const mistralModelId = MISTRAL_MODELS[model];
      const mistralApiKey = process.env.MISTRAL_API_KEY;
      if (!mistralApiKey) {
        console.error('Missing MISTRAL_API_KEY environment variable');
        return NextResponse.json({ error: 'Mistral API key is not configured' }, { status: 500 });
      }

      const formattedMessages = [
        { role: 'system', content: activeSystemPrompt },
        ...messages
      ];

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
          model: mistralModelId,
          messages: formattedMessages,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Mistral API error: ${errorText}` }, { status: response.status });
      }

      const reader = response.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(encoder.encode(content));
                    }
                  } catch {
                    // Ignore JSON parse errors on stream metadata
                  }
                }
              }
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Poolside implementation
    const apiKey = process.env.POOLSIDE_API_KEY;
    if (!apiKey) {
      console.error('Missing POOLSIDE_API_KEY environment variable');
      return NextResponse.json({ error: 'AI service configuration error' }, { status: 500 });
    }

    const formattedMessages = [
      { role: 'system', content: activeSystemPrompt },
      ...messages
    ];

    const response = await fetch('https://inference.poolside.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'poolside/laguna-xs.2',
        messages: formattedMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Poolside API error: ${errorText}` }, { status: response.status });
    }

    const reader = response.body?.getReader();

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Ignore JSON parse errors on stream metadata
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: unknown) {
    console.error('Error in chat API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
