const Groq = require('groq-sdk');
const config = require('../config');
const memoryService = require('./memory.service');

let groqClient = null;

function getGroqClient() {
  if (!config.groq.apiKey) {
    return null;
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClient;
}

const SYSTEM_PROMPT = `
You are the official Customer Care AI Assistant for "Digify Soft Solutions" (Digify Customer Care Support).
Company details:
- Company: Digify Soft Solutions
- Contact Email: support@digifysoft.in
- Support WhatsApp: +91 80059 34184
- Location: Jaipur, Rajasthan
- Core Services: Custom Software Development, Mobile Apps (Android & iOS), CRM & ERP Systems, Cloud & Web Solutions, WhatsApp Business API Automation.

CRITICAL RULES:
1. DETECT THE USER'S LANGUAGE AUTOMATICALLY.
2. ALWAYS REPLY IN THE EXACT SAME LANGUAGE AND SCRIPT (Hindi, Gujarati, Marathi, Telugu, Tamil, Hinglish, English).
3. Be polite, professional, and act as Digify Customer Care Support.
4. Keep WhatsApp messages clean with *bold* headers and bullet points.
5. If the user asks for a human agent, provide support email and phone (+91 80059 34184).
`;

/**
 * Smart multilingual fallback when AI is loading or API key needs update
 */
function getSmartFallbackReply(userMessage) {
  const lower = (userMessage || '').toLowerCase().trim();

  // Hindi greetings
  if (lower.includes('namaste') || lower.includes('namaskar') || lower.includes('नमस्ते') || lower.includes('नमस्कार')) {
    return (
      `*Digify Customer Care Support* 🚀\n\n` +
      `नमस्ते! Digify Soft Solutions में आपका स्वागत है।\n\n` +
      `हम आपकी किस प्रकार सहायता कर सकते हैं?\n` +
      `• कस्टम सॉफ्टवेयर व वेब डेवलपमेंट\n` +
      `• मोबाइल ऐप (Android & iOS)\n` +
      `• CRM व ERP सिस्टम\n` +
      `• WhatsApp बिजनेस ऑटोमेशन\n\n` +
      `कृपया अपनी आवश्यकता बताएं, हमारी टीम आपकी पूरी सहायता करेगी।\n` +
      `📞 हेल्पलाइन: +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // Gujarati greetings
  if (lower.includes('kem cho') || lower.includes('કેમ છો') || lower.includes('નમસ્તે')) {
    return (
      `*Digify Customer Care Support* 🚀\n\n` +
      `નમસ્તે! Digify Soft Solutions માં આપનું સ્વાગત છે.\n\n` +
      `અમે તમને કેવી રીતે મદદ કરી શકીએ?\n` +
      `• કસ્ટમ સોફ્ટવેર અને વેબસાઇટ\n` +
      `• મોબાઇલ એપ્લિકેશન\n` +
      `• CRM અને ERP સિસ્ટમ્સ\n\n` +
      `કૃપા કરીને તમારી જરૂરિયાત જણાવો.\n` +
      `📞 સંપર્ક: +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // Hinglish greetings
  if (lower === 'hi' || lower === 'hello' || lower === 'hiee' || lower.includes('bhai') || lower.includes('kya hal')) {
    return (
      `*Digify Customer Care Support* 🚀\n\n` +
      `Hello! Welcome to Digify Soft Solutions.\n\n` +
      `Hum aapki kya help kar sakte hain?\n` +
      `• Custom Software & Web Development\n` +
      `• Mobile Apps (Android & iOS)\n` +
      `• CRM & ERP Solutions\n` +
      `• WhatsApp Automation & Bots\n\n` +
      `Aap apni requirement bata sakte hain, humari team aapse jald connect karegi.\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // Default professional customer care response
  return (
    `*Digify Customer Care Support* 🚀\n\n` +
    `Hello! Welcome to Digify Soft Solutions.\n\n` +
    `Thank you for contacting us. How can we assist you today?\n` +
    `• Custom Software & Web Development\n` +
    `• Mobile Applications\n` +
    `• ERP & CRM Business Solutions\n\n` +
    `Feel free to share your requirements or speak with our team:\n` +
    `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
  );
}

class GroqService {
  /**
   * Process customer message and return AI generated response
   * @param {string} phoneNumber - Customer's WhatsApp phone number
   * @param {string} userMessage - Customer's incoming text message
   * @returns {Promise<string>} - Bot response in user's language
   */
  async generateReply(phoneNumber, userMessage) {
    const client = getGroqClient();

    if (!client) {
      return getSmartFallbackReply(userMessage);
    }

    try {
      const history = memoryService.getHistory(phoneNumber);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userMessage }
      ];

      const modelsToTry = [
        config.groq.model || 'llama-3.1-8b-instant',
        'llama-3.1-8b-instant',
        'llama3-8b-8192'
      ];

      let completion = null;
      let lastError = null;

      for (const m of modelsToTry) {
        try {
          completion = await client.chat.completions.create({
            model: m,
            messages: messages,
            temperature: 0.4,
            max_tokens: 800
          });
          if (completion) break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!completion && lastError) {
        throw lastError;
      }

      const reply = completion.choices[0]?.message?.content;
      if (reply) {
        memoryService.addMessage(phoneNumber, 'user', userMessage);
        memoryService.addMessage(phoneNumber, 'assistant', reply);
        return reply;
      }

      return getSmartFallbackReply(userMessage);
    } catch (error) {
      console.warn('⚠️ [Groq AI Note]: Using smart customer care reply due to:', error.message);
      return getSmartFallbackReply(userMessage);
    }
  }
}

module.exports = new GroqService();
