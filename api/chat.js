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

    // A more robust ReadableStream to handle Gemini's response.
    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body.getReader();
            const decoder = new TextDecoder();
            let incompleteChunk = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    // Prepend any incomplete chunk from the previous read
                    const chunkText = incompleteChunk + decoder.decode(value, { stream: true });
                    const lines = chunkText.split('\n');
                    
                    // The last line might be incomplete, so we save it for the next iteration.
                    incompleteChunk = lines.pop();

                    for (const line of lines) {
                        if (line.trim().startsWith('"text"')) {
                            try {
                                // Extract the value of the "text" field
                                const textContent = line.replace(/"text":\s*"/, '').replace(/",?$/, '');
                                // The text might contain escaped characters (like \n), so we parse it as a JSON string.
                                const parsedText = JSON.parse(`"${textContent}"`);
                                controller.enqueue(parsedText);
                            } catch (e) {
                                // Ignore lines that can't be parsed
                            }
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
