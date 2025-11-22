export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cpf, full_name, organization_id, user_id } = req.body;

    // Validation
    if (!cpf || !full_name) {
      return res.status(400).json({
        error: 'CPF e nome completo são obrigatórios'
      });
    }

    // Validate CPF format (11 digits, no formatting)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: 'CPF inválido. Deve conter 11 dígitos'
      });
    }

    // Get Belvo credentials from environment
    const secretId = process.env.BELVO_SECRET_ID;
    const secretPassword = process.env.BELVO_SECRET_PASSWORD;
    const apiUrl = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';
    const widgetUrl = process.env.BELVO_WIDGET_URL || 'https://cdn.belvo.io';

    if (!secretId || !secretPassword) {
      console.error('❌ Belvo credentials not configured');
      return res.status(500).json({
        error: 'Belvo não configurado'
      });
    }

    console.log('🔐 Generating Belvo widget session for CPF:', cleanCpf);

    // Payload for widget token
    const payload = {
      id: secretId,
      password: secretPassword,
      scopes: 'read_institutions,write_links,read_links',
      access_mode: 'single',
      external_id: cleanCpf,
      widget: {
        branding: {
          company_name: 'MeuAzulão',
        }
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/bank-accounts`,
      locale: 'pt-BR'
    };

    const response = await fetch(`${apiUrl}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FinTrack/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Belvo API Error:', response.status, errorBody);
      return res.status(500).json({
        error: 'Erro ao conectar com Belvo',
        details: errorBody
      });
    }

    const data = await response.json();

    const finalWidgetUrl = `${widgetUrl}?access=${data.access}`;
    console.log('✅ Widget session created');
    console.log('📍 Widget URL:', finalWidgetUrl);

    return res.status(200).json({
      success: true,
      access_token: data.access,
      widget_url: finalWidgetUrl,
      expires_in: data.expires_in || 3600
    });
  } catch (error) {
    console.error('❌ Error generating widget session:', error);
    return res.status(500).json({
      error: 'Erro ao gerar sessão do widget Belvo',
      details: error.message
    });
  }
}

