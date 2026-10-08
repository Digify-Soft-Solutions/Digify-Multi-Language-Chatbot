const groqService = require('../services/groq.service');
const wacloudService = require('../services/wacloud.service');
const config = require('../config');

class WebhookController {
  /**
   * GET /api/webhook/whatsapp
   * Webhook verification
   */
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        console.log('✅ Webhook verified successfully via hub.challenge!');
        return res.status(200).send(challenge);
      } else {
        console.warn('⚠️ Webhook verification token mismatch.');
        return res.sendStatus(403);
      }
    }

    return res.status(200).json({
      status: 'active',
      message: 'Digify Soft Solutions WhatsApp Webhook endpoint is running and ready!',
      businessNumber: config.whatsapp.businessNumber
    });
  }

  /**
   * Helper to extract phone, text, and sender name across different payload schemas
   */
  extractMessageData(body) {
    let from = null;
    let text = null;
    let senderName = 'Customer';
    let isStatusUpdate = false;

    if (!body) return null;

    // Check 1: Standard Meta Cloud API schema
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (change?.statuses && change.statuses.length > 0) {
        return { isStatusUpdate: true };
      }

      if (change?.messages && change.messages.length > 0) {
        const msg = change.messages[0];
        from = msg.from;
        if (msg.type === 'text') {
          text = msg.text?.body;
        } else if (msg.type === 'button') {
          text = msg.button?.text;
        } else if (msg.type === 'interactive') {
          text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title;
        }

        const contact = change.contacts?.[0];
        if (contact?.profile?.name) {
          senderName = contact.profile.name;
        }
      }
    }

    // Check 2: Direct WACloud SaaS / Innuvis schema
    if (!text) {
      from = body.from || body.sender_id || body.phone || body.sender || body.data?.from;

      // In WACloud, text can be an object: "text": { "body": "Hiee" }
      if (typeof body.text === 'object' && body.text !== null && body.text.body) {
        text = body.text.body;
      } else {
        text = body.message || body.text || body.body || body.data?.message || body.data?.body;
      }

      senderName = body.display_name || body.name || body.pushName || body.data?.pushName || senderName;
    }

    if (!from || !text) {
      return null;
    }

    // Clean phone number (strip @s.whatsapp.net if present)
    from = String(from).replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '');

    return { from, text: String(text).trim(), senderName, isStatusUpdate: false };
  }

  /**
   * POST /api/webhook/whatsapp
   * Handles incoming WhatsApp messages from WACloud
   */
  async handleIncomingWebhook(req, res) {
    try {
      console.log('📥 [Incoming Webhook Payload]:', JSON.stringify(req.body, null, 2));

      // Extract message details
      const parsed = this.extractMessageData(req.body);

      if (!parsed) {
        console.log('ℹ️ Payload received but no actionable customer text found (e.g., status update or media).');
        return res.status(200).json({ status: 'received' });
      }

      if (parsed.isStatusUpdate) {
        console.log('ℹ️ Delivery status update received.');
        return res.status(200).json({ status: 'status_acknowledged' });
      }

      const { from: customerPhone, text: customerMessage, senderName } = parsed;

      console.log(`\n💬 [New Message from ${senderName} (${customerPhone})]: "${customerMessage}"`);

      // 1. Process message through Groq AI (with multi-language detection & translation)
      const aiReply = await groqService.generateReply(customerPhone, customerMessage);
      console.log(`🤖 [AI Reply to ${customerPhone}]:\n${aiReply}\n`);

      // 2. Dispatch response back to WhatsApp via WACloud
      await wacloudService.sendMessage(customerPhone, aiReply);

      // 3. Return reply directly in webhook response (in case WACloud supports inline response)
      return res.status(200).json({
        status: 'success',
        reply: aiReply,
        message: aiReply,
        to: customerPhone
      });

    } catch (error) {
      console.error('❌ [Webhook Handler Error]:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }

  /**
   * POST /api/test/chat
   * Direct simulator endpoint for testing Groq multilingual bot
   */
  async testChat(req, res) {
    try {
      const { message, phone = '919999999999' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log(`🧪 [Simulator Test (${phone})]: "${message}"`);
      const reply = await groqService.generateReply(phone, message);

      return res.status(200).json({
        success: true,
        phone,
        userMessage: message,
        botReply: reply
      });
    } catch (error) {
      console.error('❌ [Simulator Test Error]:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new WebhookController();
