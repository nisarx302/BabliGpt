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

  try {
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
        return new Response(JSON.stringify({ error: 'Failed to fetch from Gemini API' }), {
            status: geminiResponse.status, headers: { 'Content-Type': 'application/json' },
        });
    }

    // 5. Create a new ReadableStream to pipe the response directly
    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body.getReader();
            const decoder = new TextDecoder();
            
            function push() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        controller.close();
                        return;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    // Simplified logic: Find and send only the text content
                    try {
                        const jsonString = chunk.match(/{.|\n*}/g)?.join('');
                        if (jsonString) {
                            const parsed = JSON.parse(jsonString);
                            const text = parsed.candidates[0]?.content?.parts[0]?.text;
                            if (text) {
                                controller.enqueue(text);
                            }
                        }
                    } catch (e) {
                        // Ignore incomplete JSON and continue
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
    return new Response(JSON.stringify({ error: 'An internal server error occurred' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
