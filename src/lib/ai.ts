export function isAIEnabled() {
  return !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0;
}

export async function getAIAdvice(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Study+',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente académico universitario. Responde en español con tono claro, útil y accionable.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 220,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  return text || 'No se obtuvo respuesta de OpenRouter.';
}
