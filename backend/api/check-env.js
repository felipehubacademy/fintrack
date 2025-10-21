export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envVars = {
      USE_ZUL_ASSISTANT: process.env.USE_ZUL_ASSISTANT,
      OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID ? 'SET' : 'NOT SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET',
    };

    return res.status(200).json({
      success: true,
      envVars,
      comparison: {
        raw: process.env.USE_ZUL_ASSISTANT,
        typeof: typeof process.env.USE_ZUL_ASSISTANT,
        equals_true: process.env.USE_ZUL_ASSISTANT === 'true',
        equals_True: process.env.USE_ZUL_ASSISTANT === 'True',
        equals_1: process.env.USE_ZUL_ASSISTANT === '1',
        trimmed: process.env.USE_ZUL_ASSISTANT?.trim(),
      }
    });

  } catch (error) {
    console.error('Erro no endpoint check-env:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
