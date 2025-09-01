// This is a Vercel Serverless Function (Edge Function)
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok || !geminiResponse.body) {
        const errorBody = await geminiResponse.text();
        console.error('Gemini API Error:', errorBody);
        return new Response(JSON.stringify({ error: 'Failed to fetch from Gemini API', details: errorBody }), {
            status: geminiResponse.status, headers: { 'Content-Type': 'application/json' },
        });
    }

    // Create a new ReadableStream to pipe the response and correctly parse Gemini's JSON chunks.
    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    // The response is a stream of JSON objects, sometimes wrapped in an array `[ ... ]`
                    // We need to clean it up to parse it reliably.
                    const jsonObjects = chunk.replace(/^\[|\]$/g, '').split('},').map((s, i, arr) => {
                        return s + (i < arr.length - 1 ? '}' : '');
                    });

                    for (const jsonObjStr of jsonObjects) {
                        if (jsonObjStr.trim() === '') continue;
                        try {
                            const parsed = JSON.parse(jsonObjStr);
                            const text = parsed.candidates[0]?.content?.parts[0]?.text;
                            if (text) {
                                controller.enqueue(text);
                            }
                        } catch (e) {
                            // Ignore incomplete JSON chunks, they will be completed in the next read.
                            // console.warn('Skipping incomplete JSON chunk:', jsonObjStr);
                        }
                    }
                }
            } catch (err) {
                console.error('Error while reading stream:', err);
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred', details: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
