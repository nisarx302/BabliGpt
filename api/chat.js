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

    // Directly pipe the stream from Gemini to the client. This is the most robust method.
    // The Gemini API already formats the stream in a way that the browser's fetch stream can handle.
    const stream = geminiResponse.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream({
        transform(chunk, controller) {
          // This complex-looking part is just to correctly parse the JSON stream from Google
          // and extract the text content. It's more reliable than simple string splitting.
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.includes('"text"')) {
              try {
                const jsonStr = line.match(/{.*}/)?.[0];
                if (jsonStr) {
                  const parsed = JSON.parse(jsonStr);
                  const text = parsed.candidates[0]?.content?.parts[0]?.text;
                  if (text) {
                    controller.enqueue(text);
                  }
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }));

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
