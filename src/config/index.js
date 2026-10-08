require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  },
  whatsapp: {
    // Digify WhatsApp Number from WACloud: +91 80059 34184
    businessNumber: process.env.WACLOUD_BUSINESS_NUMBER || '+918005934184',
    verifyToken: process.env.WACLOUD_VERIFY_TOKEN || 'digify_webhook_token_2026',
    apiUrl: process.env.WACLOUD_API_URL || 'https://wacloud.innuvissolutions.com/api/v1/whatsapp/send',
    apiToken: process.env.WACLOUD_API_TOKEN || ''
  }
};
