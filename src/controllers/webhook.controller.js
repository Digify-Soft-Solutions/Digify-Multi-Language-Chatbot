const groqService = require('../services/groq.service');
const wacloudService = require('../services/wacloud.service');
const ticketService = require('../services/ticket.service');
const erpService = require('../services/erp.service');
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
      service: 'Digify Soft Solutions WhatsApp Webhook endpoint is running and ready!',
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

      if (typeof body.text === 'object' && body.text !== null && body.text.body) {
        text = body.text.body;
      } else if (body.interactive) {
        text = body.interactive?.button_reply?.id || body.interactive?.button_reply?.title || body.interactive?.list_reply?.id || body.interactive?.list_reply?.title;
      } else if (body.button) {
        text = body.button?.text || body.button?.payload;
      } else {
        text = body.message || body.text || body.body || body.data?.message || body.data?.body;
      }

      senderName = body.display_name || body.name || body.pushName || body.data?.pushName || senderName;
    }

    if (!from || !text) {
      return null;
    }

    // Clean phone number
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

      // Determine the correct customer conversation phone number
      const botNumber = config.whatsapp.businessNumber.replace(/[^0-9]/g, '');
      let recipientPhone = customerPhone;

      if (customerPhone === botNumber && req.body.receiver) {
        recipientPhone = String(req.body.receiver).replace(/[^0-9]/g, '');
      } else if (req.body.receiver && req.body.receiver !== botNumber) {
        recipientPhone = String(req.body.receiver).replace(/[^0-9]/g, '');
      }

      console.log(`\n💬 [New Message from ${senderName} (Customer: ${recipientPhone})]: "${customerMessage}"`);

      // 1. Create or update Ticket in Digify Customer Care Admin Store
      const { ticket, erpResult } = await ticketService.createOrUpdateTicket({
        customerPhone: recipientPhone,
        senderName,
        message: customerMessage,
        channel: 'WhatsApp Webhook'
      });

      let finalReply = '';

      // 2. Check ERP Gatekeeping
      if (erpService.isGatekeepingEnabled() && !erpResult.isAuthentic) {
        // Customer is unauthorized
        console.log(`🛑 Customer ${recipientPhone} is UNAUTHORIZED in ERP. Sending restricted access notice.`);
        finalReply = erpService.getUnauthorizedNoticeMessage(senderName);
        ticketService.addReply(ticket.id, finalReply, 'bot');
        ticketService.updateTicketStatus(ticket.id, 'rejected');
      } else {
        // Customer is authentic or gatekeeping is bypassed -> Generate Multilingual AI Reply
        console.log(`✨ Customer ${recipientPhone} is AUTHENTIC (${erpResult.client?.companyName || 'Verified'}). Dispatching AI assistance.`);
        finalReply = await groqService.generateReply(recipientPhone, customerMessage);
        ticketService.addReply(ticket.id, finalReply, 'bot');
      }

      console.log(`🤖 [Outgoing Response to ${recipientPhone}]:\n${finalReply}\n`);

      // 3. Dispatch response back to WhatsApp via WACloud
      await wacloudService.sendMessage(recipientPhone, finalReply);

      // 4. Return reply in webhook response
      return res.status(200).json({
        status: 'success',
        ticketId: ticket.id,
        isAuthentic: erpResult.isAuthentic,
        reply: finalReply,
        to: recipientPhone
      });

    } catch (error) {
      console.error('❌ [Webhook Handler Error]:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }

  /**
   * POST /api/webhook/simulate
   * Simulator endpoint to generate live tickets as if incoming from WhatsApp
   */
  async simulateWebhook(req, res) {
    try {
      const { phone = '919829012345', name = 'Pooja Mehta', message = 'Need help regarding software integration' } = req.body;

      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_SIM_ENTRY',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: config.whatsapp.businessNumber, phone_number_id: '1092837465' },
                  contacts: [{ profile: { name } }],
                  messages: [
                    {
                      from: phone,
                      id: `wamid.HBgL${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      text: { body: message },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      req.body = payload;
      return await this.handleIncomingWebhook(req, res);
    } catch (error) {
      console.error('❌ [Webhook Simulator Error]:', error);
      res.status(500).json({ error: error.message });
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
