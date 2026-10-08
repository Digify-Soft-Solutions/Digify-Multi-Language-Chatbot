const app = require('./src/app');
const config = require('./src/config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Digify Soft Solutions Bot Server is RUNNING!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Test UI: http://localhost:${PORT}`);
  console.log(`🔗 Webhook Endpoint: http://localhost:${PORT}/api/webhook/whatsapp`);
  console.log(`📱 WhatsApp Number: ${config.whatsapp.businessNumber}`);
  console.log(`🧠 AI Engine: Groq (${config.groq.model})`);
  console.log('====================================================');
});
