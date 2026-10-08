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
You are the official Customer Care AI Assistant for "Digify Soft Solutions" (Digify Soft Solutions Customer Care).
Company details:
- Company: Digify Soft Solutions
- Contact Email: support@digifysoft.in
- Support WhatsApp: +91 80059 34184
- Location: Jaipur, Rajasthan
- Core Services: Custom Software Development, Mobile Apps (Android & iOS), CRM & ERP Systems, Cloud & Web Solutions, WhatsApp Business API Automation.

RULES:
1. Always maintain a courteous, professional customer care tone.
2. Reply in the exact same language the customer is speaking.
3. At the end of every message, always include:
"ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support and patience!"
`;

// Standard Welcome & Language Menu Message
const WELCOME_MENU = 
`*Digify Soft Solutions Customer Care* 🚀

Welcome! / आपका स्वागत है!

Please choose your preferred language to proceed / कृपया आगे बढ़ने के लिए अपनी भाषा चुनें:

1️⃣ English
2️⃣ हिंदी (Hindi)
3️⃣ తెలుగు (Telugu)
4️⃣ ગુજરાતી (Gujarati)
5️⃣ മലയാളം (Malayalam)
6️⃣ मराठी (Marathi)

*(Reply with number or language name / नंबर या भाषा का नाम लिखकर भेजें)*

──────────────────
ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support and patience!
📞 Helpline: +91 80059 34184 | ✉️ support@digifysoft.in`;

/**
 * Handle initial greeting and language selection
 */
function handleFlow(userMessage, history) {
  const text = (userMessage || '').trim().toLowerCase();

  // 1. Initial Greetings (Hi, Hello, Namaste, etc.) or first message
  const greetings = ['hi', 'hello', 'hiee', 'namaste', 'namaskar', 'hey', 'start', 'menu', 'नमस्ते', 'नमस्कार', 'kem cho', 'హలో'];
  if (history.length === 0 || greetings.includes(text)) {
    return WELCOME_MENU;
  }

  // 2. Language Selection: 1 or English
  if (text === '1' || text === 'english' || text.includes('eng')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `Thank you! You have selected *English*.\n\n` +
      `How can we assist you today?\n` +
      `• Custom Software & Web Development\n` +
      `• Mobile Applications (Android & iOS)\n` +
      `• ERP & CRM Business Solutions\n` +
      `• WhatsApp Automation & Chatbots\n\n` +
      `Please tell us your requirement or issue, and our team will be glad to help!\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // 3. Language Selection: 2 or Hindi
  if (text === '2' || text === 'hindi' || text.includes('हिंदी') || text.includes('hind')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `धन्यवाद! आपने *हिंदी* भाषा का चयन किया है।\n\n` +
      `Digify Soft Solutions आपकी किस प्रकार सहायता कर सकता है?\n` +
      `• कस्टम सॉफ्टवेयर व वेबसाइट डेवलपमेंट\n` +
      `• मोबाइल ऐप (Android और iOS)\n` +
      `• CRM और ERP बिजनेस सॉफ्टवेयर\n` +
      `• WhatsApp बिजनेस ऑटोमेशन\n\n` +
      `कृपया अपनी आवश्यकता या समस्या विस्तार से बताएं, हमारी टीम आपकी पूरी सहायता करेगी।\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // 4. Language Selection: 3 or Telugu
  if (text === '3' || text === 'telugu' || text.includes('తెలుగు')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `ధన్యవాదాలు! మీరు *తెలుగు* భాషను ఎంచుకున్నారు.\n\n` +
      `Digify Soft Solutions మీకు ఏ విధంగా సహాయం చేయగలదు?\n` +
      `• కస్టమ్ సాఫ్ట్‌వేర్ & వెబ్ డెవలప్‌మెంట్\n` +
      `• మొబైల్ యాప్‌లు (Android & iOS)\n` +
      `• CRM & ERP వ్యాపార పరిష్కారాలు\n` +
      `• WhatsApp ఆటోమేషన్ సర్వీసెస్\n\n` +
      `దయచేసి మీ అవసరాన్ని మాకు తెలియజేయండి, మా బృందం మీకు సహాయం చేస్తుంది.\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // 5. Language Selection: 4 or Gujarati
  if (text === '4' || text === 'gujarati' || text.includes('ગુજરાતી') || text.includes('guj')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `આભાર! તમે *ગુજરાતી* ભાષા પસંદ કરી છે.\n\n` +
      `Digify Soft Solutions તમને કેવી રીતે મદદ કરી શકે છે?\n` +
      `• કસ્ટમ સોફ્ટવેર અને વેબસાઇટ ડેવલપમેન્ટ\n` +
      `• મોબાઇલ એપ્લિકેશન્સ (Android & iOS)\n` +
      `• CRM અને ERP બિઝનેસ સોલ્યુશન્સ\n` +
      `• WhatsApp બિઝનેસ ઓટોમેશન\n\n` +
      `કૃપા કરીને તમારી જરૂરિયાત જણાવો, અમારી ટીમ તમને મદદ કરશે.\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // 6. Language Selection: 5 or Malayalam
  if (text === '5' || text === 'malayalam' || text.includes('മലയാളം') || text.includes('mal')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `നന്ദി! നിങ്ങൾ *മലയാളം* തിരഞ്ഞെടുത്തു.\n\n` +
      `Digify Soft Solutions-ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?\n` +
      `• കസ്റ്റം സോഫ്റ്റ്‌വെയർ & വെബ് ഡെവലപ്‌മെന്റ്\n` +
      `• മൊബൈൽ ആപ്ലിക്കേഷനുകൾ\n` +
      `• CRM & ERP ബിസിനസ്സ് സൊല്യൂഷനുകൾ\n\n` +
      `നിങ്ങളുടെ ആവശ്യങ്ങൾ ദയവായി ഞങ്ങളെ അറിയിക്കുക.\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  // 7. Language Selection: 6 or Marathi
  if (text === '6' || text === 'marathi' || text.includes('मराठी') || text.includes('mar')) {
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `धन्यवाद! आपण *मराठी* भाषा निवडली आहे.\n\n` +
      `Digify Soft Solutions आपली कशी मदत करू शकते?\n` +
      `• कस्टम सॉफ्टवेअर आणि वेबसाइट डेव्हलपमेंट\n` +
      `• मोबाईल ॲप्स (Android आणि iOS)\n` +
      `• CRM आणि ERP सोल्यूशन्स\n\n` +
      `कृपया आपली आवश्यकता सांगा, आमची टीम आपल्याला मदत करेल.\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }

  return null;
}

class GroqService {
  /**
   * Process customer message and return AI generated response
   * @param {string} phoneNumber - Customer's WhatsApp phone number
   * @param {string} userMessage - Customer's incoming text message
   * @returns {Promise<string>} - Bot response
   */
  async generateReply(phoneNumber, userMessage) {
    const history = memoryService.getHistory(phoneNumber);

    // 1. Check if it matches the language selection flow
    const flowReply = handleFlow(userMessage, history);
    if (flowReply) {
      memoryService.addMessage(phoneNumber, 'user', userMessage);
      memoryService.addMessage(phoneNumber, 'assistant', flowReply);
      return flowReply;
    }

    // 2. Otherwise process with Groq AI if client available
    const client = getGroqClient();
    if (client) {
      try {
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
        for (const m of modelsToTry) {
          try {
            completion = await client.chat.completions.create({
              model: m,
              messages: messages,
              temperature: 0.4,
              max_tokens: 800
            });
            if (completion) break;
          } catch (e) {}
        }

        if (completion?.choices[0]?.message?.content) {
          let reply = completion.choices[0].message.content;
          if (!reply.includes('developing this Customer Care')) {
            reply += `\n\n──────────────────\nℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n📞 +91 80059 34184 | ✉️ support@digifysoft.in`;
          }
          memoryService.addMessage(phoneNumber, 'user', userMessage);
          memoryService.addMessage(phoneNumber, 'assistant', reply);
          return reply;
        }
      } catch (err) {
        console.warn('Groq completion error:', err.message);
      }
    }

    // Default fallback
    return (
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `Thank you for your message: "${userMessage}".\n\n` +
      `Our Digify support team has received your query and will assist you shortly.\n\n` +
      `──────────────────\n` +
      `ℹ️ *Note:* We are currently developing this Customer Care Chatbot. Thank you for your support!\n` +
      `📞 +91 80059 34184 | ✉️ support@digifysoft.in`
    );
  }
}

module.exports = new GroqService();
