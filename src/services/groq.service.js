const Groq = require('groq-sdk');
const config = require('../config');
const memoryService = require('./memory.service');

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    if (!config.groq.apiKey) {
      console.warn('⚠️ [GroqService] Warning: GROQ_API_KEY is not set in .env. Bot will return simulated replies.');
      return null;
    }
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClient;
}

const SYSTEM_PROMPT = `
You are the official Customer Support AI Assistant for "Digify Soft Solutions" (Jaipur, India).
Brand details:
- Company: Digify Soft Solutions
- Contact Email: support@digifysoft.in
- Support WhatsApp: +91 80059 34184
- Location: Jaipur, Rajasthan
- Services: Custom Software Development, Web & Mobile App Development, Cloud Solutions, CRM/ERP Solutions, IT Support, WhatsApp API & Automation.

CRITICAL MULTILINGUAL RULES:
1. DETECT THE USER'S LANGUAGE AND SCRIPT AUTOMATICALLY.
2. ALWAYS REPLY IN THE EXACT SAME LANGUAGE AND SCRIPT THE USER MESSAGED IN:
   - If user writes in Hindi (हिंदी): Reply in Hindi (Devanagari script).
   - If user writes in Gujarati (ગુજરાતી): Reply in Gujarati.
   - If user writes in Marathi (मराठी): Reply in Marathi.
   - If user writes in Telugu (తెలుగు): Reply in Telugu.
   - If user writes in Tamil (தமிழ்): Reply in Tamil.
   - If user writes in Kannada (ಕನ್ನಡ): Reply in Kannada.
   - If user writes in Hinglish (Hindi written in English alphabet, e.g. "Mujhe software chahiye"): Reply in natural friendly Hinglish.
   - If user writes in English: Reply in clear professional English.
3. NEVER switch to English if the user messaged in a regional language or Hinglish, unless they ask for English.
4. DO NOT translate business identifiers like:
   - Phone numbers (+91 80059 34184)
   - Email addresses (support@digifysoft.in)
   - Product IDs, Ticket numbers, or Technical codes.
5. FORMATTING FOR WHATSAPP:
   - Use WhatsApp Markdown (*bold* for highlights, bullet points •).
   - Keep answers concise, clear, and helpful (avoid overly long walls of text).
   - Be courteous, professional, and empathetic.
6. HUMAN AGENT HANDOVER:
   - If the user explicitly asks to speak to a human/agent ("agent se baat karni hai", "human representative", "call me"), acknowledge politely and inform them that our Digify support team has been notified and can also be reached directly at support@digifysoft.in or +91 80059 34184.
`;

class GroqService {
  /**
   * Process customer message and return AI generated response
   * @param {string} phoneNumber - Customer's WhatsApp phone number
   * @param {string} userMessage - Customer's incoming text message
   * @returns {Promise<string>} - Bot response in user's language
   */
  async generateReply(phoneNumber, userMessage) {
    const client = getGroqClient();

    // Fallback if GROQ_API_KEY is not configured yet
    if (!client) {
      return (
        `*Digify Soft Solutions Support*\n\n` +
        `नमस्ते! Aapka message mil gaya hai: "${userMessage}".\n` +
        `⚠️ Groq API key configure nahi hai. Kripya .env file me GROQ_API_KEY set karein.\n` +
        `Contact: support@digifysoft.in | +91 80059 34184`
      );
    }

    try {
      // 1. Fetch conversation history for this phone number
      const history = memoryService.getHistory(phoneNumber);

      // 2. Prepare message sequence for Groq
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userMessage }
      ];

      // 3. Call Groq with Llama 3.3 70B model
      const completion = await client.chat.completions.create({
        model: config.groq.model || 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.4,
        max_tokens: 800
      });

      const reply = completion.choices[0]?.message?.content || 
        'Sorry, I could not generate a response at this moment. Please try again.';

      // 4. Save turn to memory history
      memoryService.addMessage(phoneNumber, 'user', userMessage);
      memoryService.addMessage(phoneNumber, 'assistant', reply);

      return reply;
    } catch (error) {
      console.error('❌ [GroqService Error]:', error.message);
      return (
        `*Digify Soft Solutions Support*\n\n` +
        `We are currently experiencing a brief technical glitch processing your request. Please try again or contact our team directly at support@digifysoft.in / +91 80059 34184.`
      );
    }
  }
}

module.exports = new GroqService();
