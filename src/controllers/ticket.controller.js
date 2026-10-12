const ticketService = require('../services/ticket.service');
const erpService = require('../services/erp.service');
const wacloudService = require('../services/wacloud.service');

class TicketController {
  // GET /api/tickets
  getTickets(req, res) {
    const tickets = ticketService.getAllTickets();
    const stats = ticketService.getStats();
    res.json({ success: true, tickets, stats });
  }

  // GET /api/tickets/stats
  getStats(req, res) {
    res.json({ success: true, stats: ticketService.getStats() });
  }

  // GET /api/tickets/stream (Server-Sent Events)
  streamTickets(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    ticketService.subscribeSSE(res);
    // Send initial snapshot
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);
  }

  // GET /api/tickets/:id
  getTicket(req, res) {
    const ticket = ticketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  }

  // PATCH /api/tickets/:id/status
  updateStatus(req, res) {
    const { status } = req.body;
    const ticket = ticketService.updateTicketStatus(req.params.id, status);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  }

  // PATCH /api/tickets/:id/notes
  updateNotes(req, res) {
    const { notes } = req.body;
    const ticket = ticketService.updateTicketNotes(req.params.id, notes);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  }

  // POST /api/tickets/:id/verify-erp
  async verifyErp(req, res) {
    const { approve } = req.body;
    const ticket = await ticketService.manualVerifyErp(req.params.id, approve !== false);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket, message: approve ? 'Client verified and approved in ERP' : 'Client unverified' });
  }

  // POST /api/tickets/:id/reject
  async rejectClient(req, res) {
    const ticket = ticketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const rejectionMsg = erpService.getUnauthorizedNoticeMessage(ticket.senderName);
    
    // Send notification to WhatsApp if requested
    const sendWhatsApp = req.body.sendWhatsApp !== false;
    if (sendWhatsApp) {
      try {
        await wacloudService.sendMessage(ticket.customerPhone, rejectionMsg);
      } catch (e) {
        console.warn('Could not send WhatsApp rejection message:', e.message);
      }
    }

    ticketService.addReply(ticket.id, rejectionMsg, 'bot');
    ticketService.updateTicketStatus(ticket.id, 'rejected');
    ticket.verificationStatus = 'unauthorized';
    ticketService.saveTickets();
    ticketService.broadcast('ticket_updated', ticket);

    res.json({ success: true, ticket, message: 'Client marked as unauthorized and rejection notice dispatched.' });
  }

  // POST /api/tickets/:id/reply
  async replyTicket(req, res) {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message text is required' });

    const ticket = ticketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Send through WhatsApp
    try {
      await wacloudService.sendMessage(ticket.customerPhone, message);
    } catch (e) {
      console.warn('WACloud outbound reply notice:', e.message);
    }

    const updated = ticketService.addReply(ticket.id, message, 'agent');
    res.json({ success: true, ticket: updated });
  }

  // DELETE /api/tickets/:id
  deleteTicket(req, res) {
    const removed = ticketService.deleteTicket(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket deleted successfully' });
  }

  // GET /api/erp/clients
  getErpClients(req, res) {
    res.json({ success: true, clients: erpService.getAllErpClients(), gatekeeping: erpService.isGatekeepingEnabled() });
  }

  // POST /api/erp/gatekeeping
  toggleGatekeeping(req, res) {
    const { enabled } = req.body;
    const current = erpService.setGatekeeping(enabled);
    res.json({ success: true, gatekeeping: current });
  }

  // POST /api/erp/check
  async checkPhone(req, res) {
    const { phone } = req.body;
    const result = await erpService.verifyCustomer(phone);
    res.json({ success: true, result });
  }
}

module.exports = new TicketController();
