const Groq = require('groq-sdk');
const config = require('../config');
const memoryService = require('./memory.service');

let groqClient = null;

function getGroqClient() {
  if (!config.groq.apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClient;
}

// Translations dictionary for the 7 supported languages
const TEXTS = {
  en: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `Welcome! You have selected *English*.\n\n` +
      `What do you need help with?\n\n` +
      `[ 1️⃣ ] Order Related\n` +
      `[ 2️⃣ ] Payment Related\n` +
      `[ 3️⃣ ] Product / Software Problem\n` +
      `[ 4️⃣ ] Delivery Issue\n` +
      `[ 5️⃣ ] Installation & Setup\n` +
      `[ 6️⃣ ] Warranty & Service\n` +
      `[ 7️⃣ ] Other Inquiry\n\n` +
      `👉 Reply with option number (1 - 7).\n` +
      `*(Press 0 at any time to return to Main Menu)*`,
    categorySelected: (cat) => 
      `You selected *${cat}*.\n\n` +
      `✍️ Please type your query or problem in detail. Our support team will analyze and resolve it immediately.\n\n` +
      `*(Press 0 to return to Main Menu)*`,
    ticketCreated: (id, cat, query) => 
      `*Support Ticket Raised Successfully!* ✅\n\n` +
      `📋 *Ticket ID:* ${id}\n` +
      `📂 *Category:* ${cat}\n` +
      `📝 *Your Query:* "${query}"\n` +
      `⚡ *Priority:* Normal\n\n` +
      `Our Digify support team will contact you shortly.\n\n` +
      `Would you like to mark this as *HIGH PRIORITY*?\n` +
      `👉 Reply *HIGH* to make it urgent, or press *0* for Main Menu.`,
    priorityUpdated: (id) => 
      `⚡ Your Ticket *${id}* has been upgraded to *HIGH PRIORITY*! Our senior support team has been alerted.\n\n*(Press 0 for Main Menu)*`,
    invalidCategory:
      `⚠️ Please select an option from 1 to 7:\n\n` +
      `[ 1️⃣ ] Order Related\n` +
      `[ 2️⃣ ] Payment Related\n` +
      `[ 3️⃣ ] Product / Software Problem\n` +
      `[ 4️⃣ ] Delivery Issue\n` +
      `[ 5️⃣ ] Installation & Setup\n` +
      `[ 6️⃣ ] Warranty & Service\n` +
      `[ 7️⃣ ] Other Inquiry\n\n` +
      `👉 Reply with number (1 - 7), or press *0* for Main Menu.`,
    categories: {
      '1': 'Order Related',
      '2': 'Payment Related',
      '3': 'Product / Software Problem',
      '4': 'Delivery Issue',
      '5': 'Installation & Setup',
      '6': 'Warranty & Service',
      '7': 'Other Inquiry'
    }
  },
  hi: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `नमस्ते! आपका स्वागत है। आपने *हिंदी* भाषा का चयन किया है।\n\n` +
      `आपको किस विषय में सहायता चाहिए?\n\n` +
      `[ 1️⃣ ] ऑर्डर संबंधित (Order Related)\n` +
      `[ 2️⃣ ] भुगतान संबंधित (Payment Related)\n` +
      `[ 3️⃣ ] प्रोडक्ट / सॉफ्टवेयर समस्या (Product/Software Problem)\n` +
      `[ 4️⃣ ] डिलीवरी संबंधित (Delivery Issue)\n` +
      `[ 5️⃣ ] इंस्टॉलेशन व सेटअप (Installation & Setup)\n` +
      `[ 6️⃣ ] वारंटी व सर्विस (Warranty & Service)\n` +
      `[ 7️⃣ ] अन्य पूछताछ (Other Inquiry)\n\n` +
      `👉 कृपया विकल्प संख्या भेजें (1 - 7)।\n` +
      `*(मुख्य मेनू पर लौटने के लिए किसी भी समय 0 दबाएं)*`,
    categorySelected: (cat) => 
      `आपने *${cat}* का चयन किया है।\n\n` +
      `✍️ कृपया अपनी समस्या या प्रश्न का विवरण लिखकर भेजें। हमारी सपोर्ट टीम तुरंत इस पर कार्य करेगी।\n\n` +
      `*(मुख्य मेनू के लिए 0 दबाएं)*`,
    ticketCreated: (id, cat, query) => 
      `*सपोर्ट टिकट सफलतापूर्वक दर्ज किया गया!* ✅\n\n` +
      `📋 *टिकट संख्या (Ticket ID):* ${id}\n` +
      `📂 *श्रेणी (Category):* ${cat}\n` +
      `📝 *आपकी समस्या:* "${query}"\n` +
      `⚡ *प्राथमिकता (Priority):* सामान्य (Normal)\n\n` +
      `हमारी Digify सपोर्ट टीम शीघ्र ही आपसे संपर्क करेगी।\n\n` +
      `क्या आप इसे उच्च प्राथमिकता (*HIGH PRIORITY*) पर रखना चाहते हैं?\n` +
      `👉 तत्काल सेवा के लिए *HIGH* लिखकर भेजें, या मुख्य मेनू के लिए *0* दबाएं।`,
    priorityUpdated: (id) => 
      `⚡ आपका टिकट *${id}* अब *HIGH PRIORITY* (उच्च प्राथमिकता) पर सेट कर दिया गया है! हमारे वरिष्ठ अधिकारी इस पर तुरंत ध्यान दे रहे हैं।\n\n*(मुख्य मेनू के लिए 0 दबाएं)*`,
    invalidCategory:
      `⚠️ कृपया 1 से 7 के बीच विकल्प चुनें:\n\n` +
      `[ 1️⃣ ] ऑर्डर संबंधित\n` +
      `[ 2️⃣ ] भुगतान संबंधित\n` +
      `[ 3️⃣ ] प्रोडक्ट / सॉफ्टवेयर समस्या\n` +
      `[ 4️⃣ ] डिलीवरी संबंधित\n` +
      `[ 5️⃣ ] इंस्टॉलेशन व सेटअप\n` +
      `[ 6️⃣ ] वारंटी व सर्विस\n` +
      `[ 7️⃣ ] अन्य पूछताछ\n\n` +
      `👉 1 से 7 तक का नंबर भेजें, या मुख्य मेनू के लिए *0* दबाएं।`,
    categories: {
      '1': 'ऑर्डर संबंधित (Order Related)',
      '2': 'भुगतान संबंधित (Payment Related)',
      '3': 'प्रोडक्ट / सॉफ्टवेयर समस्या (Product Problem)',
      '4': 'डिलीवरी संबंधित (Delivery Issue)',
      '5': 'इंस्टॉलेशन व सेटअप (Installation & Setup)',
      '6': 'वारंटी व सर्विस (Warranty & Service)',
      '7': 'अन्य पूछताछ (Other Inquiry)'
    }
  },
  mr: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `नमस्कार! आपले सहर्ष स्वागत आहे. आपण *मराठी* भाषा निवडली आहे. 🙏\n\n` +
      `आपल्याला कशामध्ये मदत हवी आहे? (What do you need help with?)\n\n` +
      `[ 1️⃣ ] ऑर्डर संबंधित (Order Related)\n` +
      `[ 2️⃣ ] पेमेंट संबंधित (Payment Related)\n` +
      `[ 3️⃣ ] प्रॉडक्ट / सॉफ्टवेअर समस्या (Product / Software)\n` +
      `[ 4️⃣ ] डिलिव्हरी समस्या (Delivery Issue)\n` +
      `[ 5️⃣ ] इन्स्टॉलेशन व सेटअप (Installation & Setup)\n` +
      `[ 6️⃣ ] वॉरंटी व सर्व्हिस (Warranty & Service)\n` +
      `[ 7️⃣ ] इतर चौकशी (Other Inquiry)\n\n` +
      `👉 कृपया पर्यायाचा क्रमांक पाठवा (1 - 7).\n` +
      `*(मुख्य मेनूवर परत जाण्यासाठी कधीही 0 दाबा)*`,
    categorySelected: (cat) => 
      `आपण *${cat}* ची निवड केली आहे.\n\n` +
      `✍️ कृपया आपल्या समस्येचे/प्रश्नाचे सविस्तर वर्णन टाईप करून पाठवा. आमची सपोर्ट टीम त्वरित याचे विश्लेषण करेल.\n\n` +
      `*(मुख्य मेनूवर परत जाण्यासाठी 0 दाबा)*`,
    ticketCreated: (id, cat, query) => 
      `*सपोर्ट तिकीट यशस्वीरित्या नोंदवले गेले आहे!* ✅\n\n` +
      `📋 *तिकीट क्रमांक (Ticket ID):* ${id}\n` +
      `📂 *श्रेणी (Category):* ${cat}\n` +
      `📝 *आपली समस्या:* "${query}"\n` +
      `⚡ *प्राधान्य (Priority):* सामान्य (Normal)\n\n` +
      `आमची Digify सपोर्ट टीम लवकरच आपल्याशी संपर्क करेल.\n\n` +
      `आपल्याला हे तिकीट तातडीने (*HIGH PRIORITY*) करायचे आहे का?\n` +
      `👉 तातडीच्या सेवेसाठी *HIGH* पाठवा, किंवा मुख्य मेनूसाठी *0* दाबा.`,
    priorityUpdated: (id) => 
      `⚡ आपले तिकीट *${id}* आता *HIGH PRIORITY* (तातडीचे) करण्यात आले आहे! आमचे वरिष्ठ अधिकारी यावर प्राधान्याने लक्ष देतील.\n\n*(मुख्य मेनूसाठी 0 दाबा)*`,
    invalidCategory:
      `⚠️ कृपया 1 ते 7 मधील वैध पर्याय निवडा:\n\n` +
      `[ 1️⃣ ] ऑर्डर संबंधित (Order)\n` +
      `[ 2️⃣ ] पेमेंट संबंधित (Payment)\n` +
      `[ 3️⃣ ] प्रॉडक्ट / सॉफ्टवेअर समस्या (Product/Software)\n` +
      `[ 4️⃣ ] डिलिव्हरी समस्या (Delivery Issue)\n` +
      `[ 5️⃣ ] इन्स्टॉलेशन व सेटअप (Installation)\n` +
      `[ 6️⃣ ] वॉरंटी व सर्व्हिस (Warranty)\n` +
      `[ 7️⃣ ] इतर चौकशी (Other)\n\n` +
      `👉 1 ते 7 मधील नंबर पाठवा, किंवा मुख्य मेनूसाठी *0* दाबा.`,
    categories: {
      '1': 'ऑर्डर संबंधित (Order Related)',
      '2': 'पेमेंट संबंधित (Payment Related)',
      '3': 'प्रॉडक्ट / सॉफ्टवेअर समस्या (Product Problem)',
      '4': 'डिलिव्हरी समस्या (Delivery Issue)',
      '5': 'इन्स्टॉलेशन व सेटअप (Installation & Setup)',
      '6': 'वॉरंटी व सर्व्हिस (Warranty & Service)',
      '7': 'इतर चौकशी (Other Inquiry)'
    }
  },
  gu: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `નમસ્તે! આપનું સ્વાગત છે. તમે *ગુજરાતી* ભાષા પસંદ કરી છે. 🙏\n\n` +
      `તમને શેમાં મદદ જોઈએ છે? (What do you need help with?)\n\n` +
      `[ 1️⃣ ] ઓર્ડર સંબંધિત (Order Related)\n` +
      `[ 2️⃣ ] પેમેન્ટ સંબંધિત (Payment Related)\n` +
      `[ 3️⃣ ] પ્રોડક્ટ / સોફ્ટવેર સમસ્યા (Product/Software Problem)\n` +
      `[ 4️⃣ ] ડિલિવરી સમસ્યા (Delivery Issue)\n` +
      `[ 5️⃣ ] ઇન્સ્ટોલેશન અને સેટઅપ (Installation & Setup)\n` +
      `[ 6️⃣ ] વોરંટી અને સર્વિસ (Warranty & Service)\n` +
      `[ 7️⃣ ] અન્ય પૂછપરછ (Other Inquiry)\n\n` +
      `👉 કૃપા કરીને વિકલ્પ નંબર મોકલો (1 - 7).\n` +
      `*(મુખ્ય મેનૂ માટે ગમે ત્યારે 0 દબાવો)*`,
    categorySelected: (cat) => 
      `તમે *${cat}* પસંદ કર્યું છે.\n\n` +
      `✍️ કૃપા કરીને તમારી સમસ્યાનું વિગતવાર વર્ણન લખીને મોકલો. અમારી ટીમ તરત જ તપાસ કરશે.\n\n` +
      `*(મુખ્ય મેનૂ માટે 0 દબાવો)*`,
    ticketCreated: (id, cat, query) => 
      `*સપોર્ટ ટિકિટ સફળતાપૂર્વક નોંધાઈ ગઈ છે!* ✅\n\n` +
      `📋 *ટિકિટ નંબર (Ticket ID):* ${id}\n` +
      `📂 *કેટેગરી (Category):* ${cat}\n` +
      `📝 *તમારી સમસ્યા:* "${query}"\n` +
      `⚡ *પ્રાધાન્ય (Priority):* Normal (સામાન્ય)\n\n` +
      `અમારી Digify ટીમ ટૂંક સમયમાં તમારો સંપર્ક કરશે.\n\n` +
      `શું તમે આ ટિકિટને તાત્કાલિક (*HIGH PRIORITY*) બનાવવા માંગો છો?\n` +
      `👉 તાત્કાલિક માટે *HIGH* લખીને મોકલો, અથવા મુખ્ય મેનૂ માટે *0* દબાવો.`,
    priorityUpdated: (id) => 
      `⚡ તમારી ટિકિટ *${id}* હવે *HIGH PRIORITY* પર સેટ થઈ ગઈ છે! અમારા વરિષ્ઠ અધિકારીઓ તેના પર ધ્યાન આપી રહ્યા છે.\n\n*(મુખ્ય મેનૂ માટે 0 દબાવો)*`,
    invalidCategory:
      `⚠️ કૃપા કરીને 1 થી 7 વચ્ચેનો વિકલ્પ પસંદ કરો:\n\n` +
      `[ 1️⃣ ] ઓર્ડર સંબંધિત\n` +
      `[ 2️⃣ ] પેમેન્ટ સંબંધિત\n` +
      `[ 3️⃣ ] પ્રોડક્ટ / સોફ્ટવેર સમસ્યા\n` +
      `[ 4️⃣ ] ડિલિવરી સમસ્યા\n` +
      `[ 5️⃣ ] ઇન્સ્ટોલેશન અને સેટઅપ\n` +
      `[ 6️⃣ ] વોરંટી અને સર્વિસ\n` +
      `[ 7️⃣ ] અન્ય પૂછપરછ\n\n` +
      `👉 1 થી 7 નંબર મોકલો, અથવા મુખ્ય મેનૂ માટે *0* દબાવો.`,
    categories: {
      '1': 'ઓર્ડર સંબંધિત (Order Related)',
      '2': 'પેમેન્ટ સંબંધિત (Payment Related)',
      '3': 'પ્રોડક્ટ / સોફ્ટવેર સમસ્યા (Product Problem)',
      '4': 'ડિલિવરી સમસ્યા (Delivery Issue)',
      '5': 'ઇન્સ્ટોલેશન અને સેટઅપ (Installation & Setup)',
      '6': 'વોરંટી અને સર્વિસ (Warranty & Service)',
      '7': 'અન્ય પૂછપરછ (Other Inquiry)'
    }
  },
  te: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `నమస్కారం! స్వాగతం. మీరు *తెలుగు* భాషను ఎంచుకున్నారు. 🙏\n\n` +
      `మీకు దేనితో సహాయం కావాలి? (What do you need help with?)\n\n` +
      `[ 1️⃣ ] ఆర్డర్ సంబంధిత (Order Related)\n` +
      `[ 2️⃣ ] చెల్లింపు సంబంధిత (Payment Related)\n` +
      `[ 3️⃣ ] ప్రొడక్ట్ / సాఫ్ట్‌వేర్ సమస్య (Product/Software Problem)\n` +
      `[ 4️⃣ ] డెలివరీ సమస్య (Delivery Issue)\n` +
      `[ 5️⃣ ] ఇన్‌స్టాలేషన్ & సెటప్ (Installation & Setup)\n` +
      `[ 6️⃣ ] వారంటీ & సర్వీస్ (Warranty & Service)\n` +
      `[ 7️⃣ ] ఇతర విచారణ (Other Inquiry)\n\n` +
      `👉 దయచేసి ఎంపిక సంఖ్యను పంపండి (1 - 7).\n` +
      `*(ప్రధాన మెనూకు తిరిగి రావడానికి 0 నొక్కండి)*`,
    categorySelected: (cat) => 
      `మీరు *${cat}* ఎంచుకున్నారు.\n\n` +
      `✍️ దయచేసి మీ సమస్య వివరాలను టైప్ చేసి పంపండి. మా బృందం వెంటనే పరిశీలిస్తుంది.\n\n` +
      `*(ప్రధాన మెనూ కోసం 0 నొక్కండి)*`,
    ticketCreated: (id, cat, query) => 
      `*సపోర్ట్ టికెట్ విజయవంతంగా నమోదైంది!* ✅\n\n` +
      `📋 *టికెట్ ఐడీ (Ticket ID):* ${id}\n` +
      `📂 *వర్గం (Category):* ${cat}\n` +
      `📝 *మీ సమస్య:* "${query}"\n` +
      `⚡ *ప్రాధాన్యత (Priority):* Normal\n\n` +
      `మా Digify సపోర్ట్ బృందం త్వరలో మిమ్మల్ని సంప్రదిస్తుంది.\n\n` +
      `మీరు దీన్ని అత్యవసరంగా (*HIGH PRIORITY*) మార్చాలనుకుంటున్నారా?\n` +
      `👉 అత్యవసరం కోసం *HIGH* అని టైప్ చేయండి, లేదా ప్రధాన మెనూ కోసం *0* నొక్కండి.`,
    priorityUpdated: (id) => 
      `⚡ మీ టికెట్ *${id}* ఇప్పుడు *HIGH PRIORITY* గా అప్‌గ్రేడ్ చేయబడింది! మా సీనియర్ అధికారులు వెంటనే పరిశీలిస్తారు.\n\n*(ప్రధాన మెనూ కోసం 0 నొక్కండి)*`,
    invalidCategory:
      `⚠️ దయచేసి 1 నుండి 7 వరకు ఎంపికను ఎంచుకోండి:\n\n` +
      `[ 1️⃣ ] ఆర్డర్ సంబంధిత\n` +
      `[ 2️⃣ ] చెల్లింపు సంబంధిత\n` +
      `[ 3️⃣ ] ప్రొడక్ట్ / సాఫ్ట్‌వేర్ సమస్య\n` +
      `[ 4️⃣ ] డెలివరీ సమస్య\n` +
      `[ 5️⃣ ] ఇన్‌స్టాలేషన్ & సెటప్\n` +
      `[ 6️⃣ ] వారంటీ & సర్వీస్\n` +
      `[ 7️⃣ ] ఇతర విచారణ\n\n` +
      `👉 1 నుండి 7 సంఖ్యను పంపండి, లేదా ప్రధాన మెనూ కోసం *0* నొక్కండి.`,
    categories: {
      '1': 'ఆర్డర్ సంబంధిత (Order Related)',
      '2': 'చెల్లింపు సంబంధిత (Payment Related)',
      '3': 'ప్రొడక్ట్ / సాఫ్ట్‌వేర్ సమస్య (Product Problem)',
      '4': 'డెలివరీ సమస్య (Delivery Issue)',
      '5': 'ఇన్‌స్టాలేషన్ & సెటప్ (Installation & Setup)',
      '6': 'వారంటీ & సర్వీస్ (Warranty & Service)',
      '7': 'ఇతర విచారణ (Other Inquiry)'
    }
  },
  ta: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `வணக்கம்! வரவேற்கிறோம். நீங்கள் *தமிழ்* மொழியைத் தேர்ந்தெடுத்துள்ளீர்கள். 🙏\n\n` +
      `உங்களுக்கு எதில் உதவி தேவை? (What do you need help with?)\n\n` +
      `[ 1️⃣ ] ஆர்டர் சார்ந்தது (Order Related)\n` +
      `[ 2️⃣ ] கட்டணம் சார்ந்தது (Payment Related)\n` +
      `[ 3️⃣ ] தயாரிப்பு / மென்பொருள் சிக்கல் (Product/Software Problem)\n` +
      `[ 4️⃣ ] டெலிவரி சிக்கல் (Delivery Issue)\n` +
      `[ 5️⃣ ] நிறுவல் மற்றும் அமைப்பு (Installation & Setup)\n` +
      `[ 6️⃣ ] உத்தரவாதம் & சேவை (Warranty & Service)\n` +
      `[ 7️⃣ ] பிற விசாரணைகள் (Other Inquiry)\n\n` +
      `👉 தயவுசெய்து விருப்ப எண்ணை அனுப்பவும் (1 - 7).\n` +
      `*(முதன்மை மெனுவுக்குத் திரும்ப 0 அழுத்தவும்)*`,
    categorySelected: (cat) => 
      `நீங்கள் *${cat}* என்பதைத் தேர்ந்தெடுத்துள்ளீர்கள்.\n\n` +
      `✍️ தயவுசெய்து உங்கள் சிக்கலை விரிவாக தட்டச்சு செய்து அனுப்பவும். எங்கள் குழு உடனடியாக உதவும்.\n\n` +
      `*(முதன்மை மெனுவுக்கு 0 அழுத்தவும்)*`,
    ticketCreated: (id, cat, query) => 
      `*ஆதரவு டிக்கெட் வெற்றிகரமாக பதிவு செய்யப்பட்டது!* ✅\n\n` +
      `📋 *டிக்கெட் எண் (Ticket ID):* ${id}\n` +
      `📂 *வகை (Category):* ${cat}\n` +
      `📝 *உங்கள் கேள்வி:* "${query}"\n` +
      `⚡ *முன்னுரிமை (Priority):* Normal\n\n` +
      `எங்கள் குழு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.\n\n` +
      `இதை *HIGH PRIORITY* ஆக்க விரும்புகிறீர்களா?\n` +
      `👉 அவசரத்திற்கு *HIGH* என்று பதிலளிக்கவும், அல்லது முதன்மை மெனுவுக்கு *0* அழுத்தவும்.`,
    priorityUpdated: (id) => 
      `⚡ உங்கள் டிக்கெட் *${id}* இப்போது *HIGH PRIORITY* ஆக மாற்றப்பட்டுள்ளது! எங்கள் மூத்த அதிகாரிகள் உடனடியாக கவனிப்பார்கள்.\n\n*(முதன்மை மெனுவுக்கு 0 அழுத்தவும்)*`,
    invalidCategory:
      `⚠️ தயவுசெய்து 1 முதல் 7 வரையிலான விருப்பத்தைத் தேர்ந்தெடுக்கவும்:\n\n` +
      `[ 1️⃣ ] ஆர்டர் சார்ந்தது\n` +
      `[ 2️⃣ ] கட்டணம் சார்ந்தது\n` +
      `[ 3️⃣ ] தயாரிப்பு / மென்பொருள் சிக்கல்\n` +
      `[ 4️⃣ ] டெலிவரி சிக்கல்\n` +
      `[ 5️⃣ ] நிறுவல் மற்றும் அமைப்பு\n` +
      `[ 6️⃣ ] உத்தரவாதம் & சேவை\n` +
      `[ 7️⃣ ] பிற விசாரணைகள்\n\n` +
      `👉 1 முதல் 7 எண்ணை அனுப்பவும், அல்லது முதன்மை மெனுவுக்கு *0* அழுத்தவும்.`,
    categories: {
      '1': 'ஆர்டர் சார்ந்தது (Order Related)',
      '2': 'கட்டணம் சார்ந்தது (Payment Related)',
      '3': 'தயாரிப்பு / மென்பொருள் சிக்கல் (Product Problem)',
      '4': 'டெலிவரி சிக்கல் (Delivery Issue)',
      '5': 'நிறுவல் மற்றும் அமைப்பு (Installation & Setup)',
      '6': 'உத்தரவாதம் & சேவை (Warranty & Service)',
      '7': 'பிற விசாரணைகள் (Other Inquiry)'
    }
  },
  ml: {
    welcome: 
      `*Digify Soft Solutions Customer Care* 🚀\n\n` +
      `നമസ്കാരം! സ്വാഗതം. നിങ്ങൾ *മലയാളം* തിരഞ്ഞെടുത്തു. 🙏\n\n` +
      `നിങ്ങൾക്ക് എന്തിലാണ് സഹായം വേണ്ടത്? (What do you need help with?)\n\n` +
      `[ 1️⃣ ] ഓർഡർ സംബന്ധമായവ (Order Related)\n` +
      `[ 2️⃣ ] പേയ്‌മെന്റ് സംബന്ധമായവ (Payment Related)\n` +
      `[ 3️⃣ ] ഉൽപ്പന്നം / സോഫ്റ്റ്‌വെയർ പ്രശ്നം (Product/Software Problem)\n` +
      `[ 4️⃣ ] ഡെലിവറി പ്രശ്നം (Delivery Issue)\n` +
      `[ 5️⃣ ] ഇൻസ്റ്റാളേഷൻ & സജ്ജീകരണം (Installation & Setup)\n` +
      `[ 6️⃣ ] വാറന്റി & സേവനം (Warranty & Service)\n` +
      `[ 7️⃣ ] മറ്റ് അന്വേഷണങ്ങൾ (Other Inquiry)\n\n` +
      `👉 ദയവായി ഓപ്ഷൻ നമ്പർ അയക്കുക (1 - 7).\n` +
      `*(മെയിൻ മെനുവിലേക്ക് മടങ്ങാൻ 0 അമർത്തുക)*`,
    categorySelected: (cat) => 
      `നിങ്ങൾ *${cat}* തിരഞ്ഞെടുത്തു.\n\n` +
      `✍️ നിങ്ങളുടെ പ്രശ്നം വിശദമായി ടൈപ്പ് ചെയ്ത് അയക്കുക. ഞങ്ങളുടെ ടീം ഉടൻ പരിശോധിക്കും.\n\n` +
      `*(മെയിൻ മെനുവിന് 0 അമർത്തുക)*`,
    ticketCreated: (id, cat, query) => 
      `*സപ്പോർട്ട് ടിക്കറ്റ് വിജയകരമായി രജിസ്റ്റർ ചെയ്തു!* ✅\n\n` +
      `📋 *ടിക്കറ്റ് നമ്പർ (Ticket ID):* ${id}\n` +
      `📂 *വിഭാഗം (Category):* ${cat}\n` +
      `📝 *നിങ്ങളുടെ പ്രശ്നം:* "${query}"\n` +
      `⚡ *മുൻഗണന (Priority):* Normal\n\n` +
      `ഞങ്ങളുടെ ടീം ഉടൻ നിങ്ങളെ ബന്ധപ്പെടും.\n\n` +
      `ഇത് അടിയന്തിരമായി (*HIGH PRIORITY*) മാറ്റണോ?\n` +
      `👉 അടിയന്തിരമായി മാറ്റാൻ *HIGH* എന്ന് അയക്കുക, അല്ലെങ്കിൽ മെയിൻ മെനുവിന് *0* അമർത്തുക.`,
    priorityUpdated: (id) => 
      `⚡ നിങ്ങളുടെ ടിക്കറ്റ് *${id}* ഇപ്പോൾ *HIGH PRIORITY* ആയി മാറ്റിയിരിക്കുന്നു!\n\n*(മെയിൻ മെനുവിന് 0 അമർത്തുക)*`,
    invalidCategory:
      `⚠️ ദയവായി 1 മുതൽ 7 വരെയുള്ള ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക:\n\n` +
      `[ 1️⃣ ] ഓർഡർ സംബന്ധമായവ\n` +
      `[ 2️⃣ ] പേയ്‌മെന്റ് സംബന്ധമായവ\n` +
      `[ 3️⃣ ] ഉൽപ്പന്നം / സോഫ്റ്റ്‌വെയർ പ്രശ്നം\n` +
      `[ 4️⃣ ] ഡെലിവറി പ്രശ്നം\n` +
      `[ 5️⃣ ] ഇൻസ്റ്റാളേഷൻ & സജ്ജീകരണം\n` +
      `[ 6️⃣ ] വാറന്റി & സേവനം\n` +
      `[ 7️⃣ ] മറ്റ് അന്വേഷണങ്ങൾ\n\n` +
      `👉 1 മുതൽ 7 വരെ നമ്പർ അയക്കുക, അല്ലെങ്കിൽ മെയിൻ മെനുവിന് *0* അമർത്തുക.`,
    categories: {
      '1': 'ഓർഡർ സംബന്ധമായവ (Order Related)',
      '2': 'പേയ്‌മെന്റ് സംബന്ധമായവ (Payment Related)',
      '3': 'ഉൽപ്പന്നം / സോഫ്റ്റ്‌വെയർ പ്രശ്നം (Product Problem)',
      '4': 'ഡെലിവറി പ്രശ്നം (Delivery Issue)',
      '5': 'ഇൻസ്റ്റാളേഷൻ & സജ്ജീകരണം (Installation & Setup)',
      '6': 'വാറന്റി & സേവനം (Warranty & Service)',
      '7': 'മറ്റ് അന്വേഷണങ്ങൾ (Other Inquiry)'
    }
  }
};

const MAIN_LANGUAGE_MENU = 
`*Welcome to Digify Soft Solutions Customer Care* 🚀

Please select your preferred language:

[ 1️⃣ ] English
[ 2️⃣ ] हिंदी (Hindi)
[ 3️⃣ ] मराठी (Marathi)
[ 4️⃣ ] ગુજરાતી (Gujarati)
[ 5️⃣ ] తెలుగు (Telugu)
[ 6️⃣ ] தமிழ் (Tamil)
[ 7️⃣ ] മലയാളം (Malayalam)

👉 Reply with option number (1 - 7).
*(Press 0 at any time to return to Main Menu)*`;

const LANG_CODE_MAP = {
  '1': 'en', 'english': 'en', 'eng': 'en',
  '2': 'hi', 'hindi': 'hi', 'हिंदी': 'hi', 'hin': 'hi',
  '3': 'mr', 'marathi': 'mr', 'मराठी': 'mr', 'mar': 'mr',
  '4': 'gu', 'gujarati': 'gu', 'ગુજરાતી': 'gu', 'guj': 'gu',
  '5': 'te', 'telugu': 'te', 'తెలుగు': 'te', 'tel': 'te',
  '6': 'ta', 'tamil': 'ta', 'தமிழ்': 'ta', 'tam': 'ta',
  '7': 'ml', 'malayalam': 'ml', 'മലയാളം': 'ml', 'mal': 'ml'
};

/**
 * Robust extraction of 1-7 option number or Devanagari numerals
 */
function extractOptionNumber(input) {
  if (!input) return null;
  const str = String(input).trim();
  const devanagariMap = { '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7' };
  if (devanagariMap[str]) return devanagariMap[str];

  const match = str.match(/\b([1-7])\b/) || str.match(/^([1-7])/);
  if (match) return match[1];

  return null;
}

class GroqService {
  /**
   * Process customer message and advance state machine or query AI
   * @param {string} phoneNumber - Recipient WhatsApp phone number
   * @param {string} userMessage - Incoming message text
   * @returns {Promise<string>} - Bot reply message
   */
  async generateReply(phoneNumber, userMessage) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    const session = memoryService.getSession(phoneNumber);

    // 0. RESET: Pressing '0' at any point returns to Main Language Menu
    if (text === '0' || lower === 'reset' || lower === 'menu') {
      memoryService.resetSession(phoneNumber);
      return MAIN_LANGUAGE_MENU;
    }

    // 1. STATE: CHOOSING_LANGUAGE
    if (session.state === 'CHOOSING_LANGUAGE') {
      const optionNum = extractOptionNumber(text);
      const selectedLang = (optionNum && LANG_CODE_MAP[optionNum]) || LANG_CODE_MAP[lower] || LANG_CODE_MAP[text];

      if (selectedLang) {
        memoryService.updateSession(phoneNumber, {
          state: 'CHOOSING_CATEGORY',
          language: selectedLang
        });
        const langPack = TEXTS[selectedLang] || TEXTS.en;
        return langPack.welcome;
      }

      // If user typed anything else, do not break flow; guide them to choose language
      return MAIN_LANGUAGE_MENU;
    }

    const currentLang = session.language || 'en';
    const langPack = TEXTS[currentLang] || TEXTS.en;

    // 2. STATE: CHOOSING_CATEGORY
    if (session.state === 'CHOOSING_CATEGORY') {
      const optionNum = extractOptionNumber(text);
      let category = optionNum ? langPack.categories[optionNum] : null;

      // Also match category keywords if customer typed keyword instead of number
      if (!category) {
        if (/order|ऑर्डर|ઓર્ડર|ఆర్డర్|ஆர்டர்|ഓർഡർ/i.test(lower)) category = langPack.categories['1'];
        else if (/pay|payment|पेमेंट|પેમેન્ટ|చెల్లింపు|கட்டணம்|പേയ്‌മെന്റ്/i.test(lower)) category = langPack.categories['2'];
        else if (/product|software|प्रॉडक्ट|સૉફ્ટવેર|సాఫ్ట్‌వేర్/i.test(lower)) category = langPack.categories['3'];
        else if (/deliver|delivery|डिलिव्हरी|डिलीवरी|ડિલિવરી|డెలివరీ|டெலிவரி|ഡെലിവറി/i.test(lower)) category = langPack.categories['4'];
        else if (/install|setup|इन्स्टॉल|ઇન્સ્ટોલેશન|ఇన్‌స్టాలేషన్/i.test(lower)) category = langPack.categories['5'];
        else if (/warrant|service|सर्व्हिस|વોરંટી|వారంటీ|உத்தரவாதம்/i.test(lower)) category = langPack.categories['6'];
        else if (/other|इतर|અન્ય|ఇతర|பிற|മറ്റ്/i.test(lower)) category = langPack.categories['7'];
      }

      if (category) {
        memoryService.updateSession(phoneNumber, {
          state: 'AWAITING_QUERY',
          category: category
        });
        return langPack.categorySelected(category);
      }

      // Invalid category input: remain in CHOOSING_CATEGORY and warn politely
      return langPack.invalidCategory;
    }

    // 3. STATE: AWAITING_QUERY (Customer typing problem details)
    if (session.state === 'AWAITING_QUERY') {
      const ticketId = 'SRV-' + Math.floor(10000 + Math.random() * 90000);
      const ticketData = {
        id: ticketId,
        category: session.category || 'Customer Inquiry',
        query: text,
        priority: 'Normal',
        createdAt: new Date().toISOString()
      };

      memoryService.updateSession(phoneNumber, {
        state: 'TICKET_CREATED',
        ticket: ticketData
      });

      console.log(`🎫 [Ticket Created]: ${ticketId} for ${phoneNumber} (${session.category}) - "${text}"`);
      return langPack.ticketCreated(ticketId, session.category, text);
    }

    // 4. STATE: TICKET_CREATED (Check for HIGH priority upgrade or follow-up)
    if (session.state === 'TICKET_CREATED') {
      const urgentWords = ['high', 'urgent', 'तातडीने', 'तात्काळ', 'जरुरी', 'హై', 'అత్యవసరం', 'அவசரம்', 'അടിയന്തിരം'];
      if (urgentWords.some(w => lower.includes(w))) {
        if (session.ticket) {
          session.ticket.priority = 'HIGH PRIORITY 🚨';
        }
        return langPack.priorityUpdated(session.ticket?.id || 'SRV-Ticket');
      }

      // If user asks a follow-up question, let Groq AI answer in their chosen language
      const client = getGroqClient();
      if (client) {
        try {
          const completion = await client.chat.completions.create({
            model: config.groq.model || 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: `You are Digify Soft Solutions Customer Care Assistant. Reply in ${currentLang} language. Be polite, professional, and helpful. Always keep ticket ID ${session.ticket?.id} in mind.`
              },
              { role: 'user', content: text }
            ],
            temperature: 0.3,
            max_tokens: 500
          });

          if (completion?.choices[0]?.message?.content) {
            return completion.choices[0].message.content + `\n\n*(Press 0 for Main Menu)*`;
          }
        } catch (e) {
          console.warn('Groq follow-up error:', e.message);
        }
      }

      return (
        `*Digify Customer Care Support*\n\n` +
        `Your ticket *${session.ticket?.id}* is active with our support team.\n` +
        `Our executives are reviewing your request.\n\n` +
        `*(Press 0 to start a new inquiry)*`
      );
    }

    return MAIN_LANGUAGE_MENU;
  }
}

module.exports = new GroqService();
