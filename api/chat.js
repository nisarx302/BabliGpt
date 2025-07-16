// This is a Vercel Serverless Function
// It runs on the backend, not in the user's browser.

export default async function handler(request, response) {
  // 1. Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Get the prompt from the request body sent by the frontend
  const { prompt } = request.body;
  if (!prompt) {
    return response.status(400).json({ error: 'Prompt is required' });
  }

  // 3. Get the secret API key from Vercel's Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'API key not configured on server' });
  }

  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    // 4. Securely call the Gemini API from the backend
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      console.error('Gemini API Error:', errorBody);
      return response.status(geminiResponse.status).json({ error: 'Failed to fetch from Gemini API' });
    }

    const result = await geminiResponse.json();
    
    // 5. Send the final text response back to the frontend
    const text = result.candidates[0]?.content?.parts[0]?.text || "I'm a little tangled... try again!";
    return response.status(200).json({ text });

  } catch (error) {
    console.error('Serverless function error:', error);
    return response.status(500).json({ error: 'An internal server error occurred' });
  }
}
