import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { nodes, userPrompt } = await req.json();

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Nodes array is required' }, { status: 400 });
    }

    const contextText = nodes.map((n: { title: string; content: string }, i: number) => `Node ${i + 1} [${n.title}]:\n${n.content}`).join('\n\n');
    const systemPrompt = "You are synthesizing multiple ideas from a canvas board. Find connections, tensions, and emergent insights between them. Respond clearly and directly, avoiding unnecessary preambles.";
    const promptText = `Here is the content of the selected nodes:\n\n${contextText}\n\nUser synthesis request: ${userPrompt || 'Synthesize the core connections and insights from these ideas.'}`;

    const apiKey = process.env.POOLSIDE_API_KEY || 'sky_8SaWPSkB.ppgZwPNoQ4d7TvlzQwd21zpirNwsd3sf';

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
          { role: 'user', content: promptText }
        ],
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
    console.error('Error in merge API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
