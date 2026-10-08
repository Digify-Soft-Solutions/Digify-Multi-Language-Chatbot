const axios = require('axios');
const config = require('../config');

// Default active token from session (overridden by process.env.WACLOUD_API_TOKEN)
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MTMsInVzZXJuYW1lIjoiRGlnaWZ5c29mdEJvdCIsImVtYWlsIjoiZ2F1dGFtYWxpazFAZ21haWwuY29tIiwibmFtZSI6IkdhdXRhbSAgTWFsaWsiLCJyb2xlIjoidXNlciIsInVzZXJ0eXBlIjoiY2xpZW50IiwidG9rZW5WZXJzaW9uIjoxLCJpYXQiOjE3OTE0MzY4MjMsImV4cCI6MTc5MjA0MTYyM30._x4n2yVyL-QF8rUkgYxKrS9h6D0h2tpfhvfPONZ-fZs';

class WACloudService {
  /**
   * Send WhatsApp message back to customer via WACloud / Nuke Team Inbox API
   * @param {string} to - Recipient phone number (e.g. 918233816674)
   * @param {string} text - Message content to send
   */
  async sendMessage(to, text) {
    // Sanitize phone number (remove +, spaces, dashes)
    const cleanPhone = String(to).replace(/[^0-9]/g, '');
    const token = config.whatsapp.apiToken || DEFAULT_TOKEN;

    const endpoint = `https://api.nuke.co.in/api/v1/whatsapp/teaminbox/${cleanPhone}/send`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://wacloud.innuvissolutions.com',
      'Referer': 'https://wacloud.innuvissolutions.com/',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const payload = {
      type: 'text',
      text: text,
      media_url: 'none'
    };

    try {
      console.log(`📤 [WACloud Outbound] Dispatching message to ${cleanPhone}...`);
      const response = await axios.post(endpoint, payload, { headers, timeout: 12000 });
      console.log(`✅ [WACloud Outbound Success]: Message queued with ID:`, response.data?.data?.id || response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`❌ [WACloud Outbound Error] Failed to send to ${cleanPhone}:`, error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WACloudService();
