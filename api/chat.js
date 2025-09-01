// This is a Vercel Serverless Function (Edge Function)
// It supports streaming responses.

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Get the prompt from the request body
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Get the secret API key from Vercel's Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;

    // 4. Call the Gemini API
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

    // 5. Create a new ReadableStream to pipe the response directly and parse the chunks
    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            function push() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        controller.close();
                        return;
                    }
                    
                    buffer += decoder.decode(value, { stream: true });
                    
                    // The Gemini streaming API returns data in a specific format.
                    // It often looks like this: `[ { "candidates": [...] } ]`
                    // Sometimes chunks are incomplete JSON. We need to handle this.
                    // A simple and effective way for this specific API is to extract text content.
                    try {
                        // The raw response is a stream of JSON objects. We extract the text part.
                        // This simplified parser assumes the text is the most important part of the stream.
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Keep the last, possibly incomplete, line for the next chunk

                        for (const line of lines) {
                           if (line.includes('"text"')) {
                                // Super simplified: just find the text field and extract its value.
                                // A more robust solution would parse the JSON properly.
                                const match = /"text"\s*:\s*"([^"]*)"/.exec(line);
                                if (match && match[1]) {
                                    // The API might send escape characters, let's decode them.
                                    const decodedText = JSON.parse(`"${match[1]}"`);
                                    controller.enqueue(decodedText);
                                }
                            }
                        }
                    } catch (e) {
                        // console.warn('JSON parsing error in stream, continuing...', e);
                        // This can happen with incomplete JSON, we just wait for more data.
                    }
                    
                    push();
                }).catch(err => {
                    console.error('Stream reading error:', err);
                    controller.error(err);
                });
            }
            
            push();
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
