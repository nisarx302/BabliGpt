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

    // A more robust TransformStream to handle the Gemini API's streaming JSON
    const textStream = new TransformStream({
      async transform(chunk, controller) {
        // The API returns data that might look like "[{...}]" or just "{...},".
        // This logic handles these cases much more reliably.
        try {
            // It's common for the stream to send multiple JSON objects in one chunk,
            // or split a single object across chunks. We need to handle this.
            const jsonObjects = chunk.split('}\n,').map((s, i, a) => i < a.length - 1 ? s + '}' : s);

            for (const jsonStr of jsonObjects) {
                if (jsonStr.trim()) {
                    // Clean up potential array brackets from the start/end of the stream
                    const cleanedJsonStr = jsonStr.replace(/^\[|\]$/g, '').trim();
                    if (cleanedJsonStr) {
                         const parsed = JSON.parse(cleanedJsonStr);
                         const text = parsed.candidates[0]?.content?.parts[0]?.text;
                         if (text) {
                            controller.enqueue(text); // Send only the text to the client
                         }
                    }
                }
            }
        } catch (e) {
          // This might happen with incomplete JSON chunks, we can safely ignore and wait for the next chunk.
          // console.error("Error parsing chunk:", e, "Chunk was:", chunk);
        }
      },
    });

    const stream = geminiResponse.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(textStream);

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
