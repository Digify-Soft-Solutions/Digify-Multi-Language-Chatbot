const axios = require('axios');
const config = require('../config');

class WACloudService {
  /**
   * Send WhatsApp message back to customer via WACloud API
   * @param {string} to - Recipient phone number (e.g. 919876543210)
   * @param {string} text - Message content to send
   */
  async sendMessage(to, text) {
    // Sanitize phone number (remove +, spaces, dashes)
    const cleanPhone = String(to).replace(/[^0-9]/g, '');

    if (!config.whatsapp.apiToken || !config.whatsapp.apiUrl) {
      console.log('ℹ️ [WACloud Service (Simulated Mode)]:');
      console.log(`   To: ${cleanPhone}`);
      console.log(`   Message:\n${text}`);
      console.log('   (To send real WhatsApp messages, set WACLOUD_API_TOKEN and WACLOUD_API_URL in .env)');
      return { success: true, simulated: true };
    }

    try {
      // WACloud payload structure
      const response = await axios.post(
        config.whatsapp.apiUrl,
        {
          to: cleanPhone,
          message: text,
          type: 'text'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.whatsapp.apiToken}`
          },
          timeout: 10000
        }
      );

      console.log(`✅ [WACloud Service] Message successfully dispatched to ${cleanPhone}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ [WACloud Service Error] Failed to send to ${cleanPhone}:`, error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WACloudService();
