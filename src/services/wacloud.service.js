const axios = require('axios');
const config = require('../config');

// Active token provided by DigifysoftBot session
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTE0NjE1MjcsInZlciI6MiwiZGF0YSI6eyJ1c2VybmFtZSI6IkRpZ2lmeXNvZnRCb3QiLCJuYW1lIjoiRGlnaWZ5c29mdEJvdCJ9fQ.KdnZHSBPgIFQivVhFdhklkvD1WBn0BKpr9m1eJIOsaE';

class WACloudService {
  /**
   * Send WhatsApp message back to customer via WACloud / Nuke Session API
   * @param {string} to - Recipient phone number (e.g. 918233816674)
   * @param {string} text - Message content to send
   */
  async sendMessage(to, text) {
    const cleanPhone = String(to).replace(/[^0-9]/g, '');
    const token = config.whatsapp.apiToken || DEFAULT_TOKEN;

    // Primary: AutoBotChat / WACloud v6 Session API
    const sessionEndpoint = 'https://wa20.nuke.co.in/v6/api/whatsapp/24/DigifysoftBot/messages';

    const sessionPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    const sessionHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log(`📤 [WACloud Outbound] Dispatching message to ${cleanPhone} via Session API...`);
      const response = await axios.post(sessionEndpoint, sessionPayload, {
        headers: sessionHeaders,
        timeout: 12000
      });

      console.log(`✅ [WACloud Outbound Success]: Message queued with ID:`, response.data?.messages?.[0]?.id || response.data);
      return { success: true, data: response.data };
    } catch (sessionError) {
      console.warn(`⚠️ [Session API Failed]: ${sessionError.response?.data?.error || sessionError.message}. Trying teaminbox fallback...`);

      // Fallback: teaminbox endpoint
      try {
        const fallbackEndpoint = `https://api.nuke.co.in/api/v1/whatsapp/teaminbox/${cleanPhone}/send`;
        const fallbackHeaders = {
          'Authorization': `Bearer ${token}`,
          'Origin': 'https://wacloud.innuvissolutions.com',
          'Referer': 'https://wacloud.innuvissolutions.com/',
          'Content-Type': 'application/json'
        };
        const fallbackPayload = {
          type: 'text',
          text: text,
          media_url: 'none'
        };

        const fbRes = await axios.post(fallbackEndpoint, fallbackPayload, {
          headers: fallbackHeaders,
          timeout: 12000
        });

        console.log(`✅ [Fallback Outbound Success]:`, fbRes.data);
        return { success: true, data: fbRes.data };
      } catch (fallbackError) {
        console.error(`❌ [WACloud Outbound Error] Failed to send to ${cleanPhone}:`, fallbackError.response?.data || fallbackError.message);
        return { success: false, error: fallbackError.message };
      }
    }
  }
}

module.exports = new WACloudService();
