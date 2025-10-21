export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simular payload do WhatsApp
    const testPayload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '+5511999999999',
              id: 'test_msg_123',
              timestamp: Math.floor(Date.now() / 1000),
              text: {
                body: req.body.message || 'Gastei 50 no mercado'
              },
              type: 'text'
            }]
          }
        }]
      }]
    };

    console.log('🧪 [TEST] Simulando webhook com payload:', JSON.stringify(testPayload, null, 2));

    // Importar e executar o processamento
    const { default: SmartConversation } = await import('../services/smartConversation.js');
    const smartConversation = new SmartConversation();
    
    console.log(`🔍 [TEST] useAssistant flag: ${smartConversation.useAssistant}`);
    console.log(`🔍 [TEST] USE_ZUL_ASSISTANT env: ${process.env.USE_ZUL_ASSISTANT}`);

    await smartConversation.handleMessage(testPayload.entry[0].changes[0].value.messages[0].text.body, testPayload.entry[0].changes[0].value.messages[0].from);

    return res.status(200).json({
      success: true,
      message: 'Test completed',
      useAssistant: smartConversation.useAssistant,
      envVar: process.env.USE_ZUL_ASSISTANT
    });

  } catch (error) {
    console.error('❌ [TEST] Error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
}
