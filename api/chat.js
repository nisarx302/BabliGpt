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

    // The Gemini API URL for streaming content
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;

    // Make the call to the Gemini API
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    // Check if the API call was successful
    if (!geminiResponse.ok || !geminiResponse.body) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      return new Response(JSON.stringify({ error: 'Failed to fetch from Gemini API', details: errorBody }), {
          status: geminiResponse.status, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a new TransformStream to parse the Gemini stream and extract only the text content.
    // This is a very stable way to handle the streaming JSON data from the API.
    const textStream = new TransformStream({
      transform(chunk, controller) {
        try {
          // The stream sends data chunks that look like `[ { ...} ]`
          // We clean up the chunk to make it valid JSON
          const jsonStr = chunk.replace(/^\[|\]$/g, '').trim();
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates[0]?.content?.parts[0]?.text;
            if (text) {
              controller.enqueue(text); // Send the extracted text to the client
            }
          }
        } catch (e) {
          // This can happen with incomplete chunks. We just ignore them.
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
