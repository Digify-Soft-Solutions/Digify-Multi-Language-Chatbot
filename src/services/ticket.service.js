/**
 * Digify Soft Solutions - Customer Care Ticket Service
 * Stores and manages customer queries, ticket statuses, conversation threads,
 * and broadcasts live real-time events to connected Admin Panels.
 */

const fs = require('fs');
const path = require('path');
const erpService = require('./erp.service');

const DATA_FILE = path.join(__dirname, '../../tickets-store.json');

class TicketService {
  constructor() {
    this.tickets = [];
    this.sseClients = new Set();
    this.loadTickets();
  }

  loadTickets() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.tickets = JSON.parse(raw);
        console.log(`📋 Loaded ${this.tickets.length} tickets from store.`);
        return;
      }
    } catch (e) {
      console.warn('Could not read tickets-store.json, initializing demo tickets:', e.message);
    }

    // Default seed tickets for Digify Customer Care
    this.tickets = [
      {
        id: "DIGI-TK-1001",
        customerPhone: "919829012345",
        senderName: "Vikram Sharma",
        channel: "WhatsApp",
        status: "new",
        verificationStatus: "verified",
        erpClient: {
          id: "ERP-CLI-102",
          companyName: "Sharma Enterprises & Logistics",
          plan: "Business Growth Suite",
          status: "active"
        },
        lastMessage: "Hamare logistics invoice me GST rate update karna hai. Help desk connect kijiye.",
        messages: [
          {
            sender: "customer",
            text: "Namaste team, hamare logistics invoice me GST rate update karna hai. Help desk connect kijiye.",
            timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString()
          },
          {
            sender: "bot",
            text: "Namaste Vikram ji! Aapka query receive ho gaya hai. Digify Care Support Ticket DIGI-TK-1001 create ho gaya hai. Ek executive aapse jald connect karega.",
            timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString()
          }
        ],
        notes: "Client has active billing software module. Needs GST slab updated to 18%.",
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 34 * 60 * 1000).toISOString()
      },
      {
        id: "DIGI-TK-1002",
        customerPhone: "919414156789",
        senderName: "Pooja Mehta",
        channel: "WhatsApp",
        status: "in_progress",
        verificationStatus: "verified",
        erpClient: {
          id: "ERP-CLI-103",
          companyName: "Mehta Textiles Export Hub",
          plan: "Premium ERP Integration",
          status: "active"
        },
        lastMessage: "WhatsApp AI chatbot me Gujarati and Hindi languages switch kaise karein?",
        messages: [
          {
            sender: "customer",
            text: "WhatsApp AI chatbot me Gujarati and Hindi languages switch kaise karein?",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            sender: "agent",
            text: "Hello Pooja ji! Groq AI model automatic language detect karta hai. User kisi bhi language me likhega, bot ussi me answer karega.",
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ],
        notes: "Explained multilingual auto-detection capability.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "DIGI-TK-1003",
        customerPhone: "919988776655",
        senderName: "Unknown Visitor",
        channel: "WhatsApp",
        status: "rejected",
        verificationStatus: "unauthorized",
        erpClient: null,
        lastMessage: "Hello, mujhe free customer support chahiye aapke software ka.",
        messages: [
          {
            sender: "customer",
            text: "Hello, mujhe free customer support chahiye aapke software ka.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            sender: "bot",
            text: "Namaste! Aap hamare registered user nahi hain. Digify Soft Solutions Customer Care access karne ke liye pehle hamari services lijiye, tabhi aap hamara customer care use kar payenge.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ],
        notes: "Unregistered phone. Sent ERP activation sales link.",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];
    this.saveTickets();
  }

  saveTickets() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.tickets, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write tickets-store.json:', e);
    }
  }

  subscribeSSE(res) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        this.sseClients.delete(client);
      }
    }
  }

  getAllTickets() {
    return this.tickets;
  }

  getTicketById(id) {
    return this.tickets.find(t => t.id === id);
  }

  /**
   * Process incoming WhatsApp webhook message into ticket
   */
  async createOrUpdateTicket({ customerPhone, senderName, message, channel = "WhatsApp Webhook" }) {
    const cleanedPhone = erpService.cleanPhone(customerPhone);
    let existingTicket = this.tickets.find(t => t.customerPhone === cleanedPhone && t.status !== 'resolved' && t.status !== 'rejected');

    // Run ERP verification check
    const erpResult = await erpService.verifyCustomer(cleanedPhone);
    const verificationStatus = erpResult.isAuthentic ? 'verified' : (erpResult.isExpired ? 'expired' : 'unauthorized');

    const newMessageObj = {
      sender: 'customer',
      text: message,
      timestamp: new Date().toISOString()
    };

    if (existingTicket) {
      existingTicket.lastMessage = message;
      existingTicket.messages.push(newMessageObj);
      existingTicket.senderName = senderName || existingTicket.senderName;
      existingTicket.verificationStatus = verificationStatus;
      existingTicket.erpClient = erpResult.client;
      existingTicket.updatedAt = new Date().toISOString();
      this.saveTickets();
      this.broadcast('ticket_updated', existingTicket);
      return { ticket: existingTicket, isNew: false, erpResult };
    }

    // Create new ticket
    const ticketId = `DIGI-TK-${1000 + this.tickets.length + 1}`;
    const newTicket = {
      id: ticketId,
      customerPhone: cleanedPhone,
      senderName: senderName || 'Customer',
      channel,
      status: 'new',
      verificationStatus,
      erpClient: erpResult.client,
      lastMessage: message,
      messages: [newMessageObj],
      notes: erpResult.isAuthentic
        ? `Auto-verified with ERP (${erpResult.client.companyName}).`
        : `Unregistered phone. ERP check returned: ${erpResult.message}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tickets.unshift(newTicket);
    this.saveTickets();
    this.broadcast('ticket_created', newTicket);
    return { ticket: newTicket, isNew: true, erpResult };
  }

  /**
   * Add a bot or agent reply to ticket thread
   */
  addReply(ticketId, text, sender = 'agent') {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;

    const replyObj = {
      sender,
      text,
      timestamp: new Date().toISOString()
    };
    ticket.messages.push(replyObj);
    ticket.lastMessage = text;
    ticket.updatedAt = new Date().toISOString();
    if (ticket.status === 'new') {
      ticket.status = 'in_progress';
    }

    this.saveTickets();
    this.broadcast('ticket_updated', ticket);
    return ticket;
  }

  /**
   * Manual ERP Verification toggle by admin
   */
  async manualVerifyErp(ticketId, approve = true) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;

    if (approve) {
      // Register or link client
      const erpClient = erpService.addOrUpdateErpClient({
        phone: ticket.customerPhone,
        name: ticket.senderName,
        companyName: `${ticket.senderName} Co.`,
        plan: "Enterprise Care Access"
      });
      ticket.verificationStatus = 'verified';
      ticket.erpClient = erpClient;
      ticket.notes = (ticket.notes ? ticket.notes + "\n" : "") + `[Admin Verified on ${new Date().toLocaleTimeString()}]: Manually approved in Digify ERP.`;
    } else {
      ticket.verificationStatus = 'unauthorized';
      ticket.erpClient = null;
      ticket.status = 'rejected';
      ticket.notes = (ticket.notes ? ticket.notes + "\n" : "") + `[Admin Rejected]: Marked as non-ERP guest user.`;
    }

    ticket.updatedAt = new Date().toISOString();
    this.saveTickets();
    this.broadcast('ticket_updated', ticket);
    return ticket;
  }

  updateTicketStatus(ticketId, newStatus) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    this.saveTickets();
    this.broadcast('ticket_updated', ticket);
    return ticket;
  }

  updateTicketNotes(ticketId, notes) {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return null;
    ticket.notes = notes;
    ticket.updatedAt = new Date().toISOString();
    this.saveTickets();
    this.broadcast('ticket_updated', ticket);
    return ticket;
  }

  deleteTicket(ticketId) {
    const idx = this.tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return false;
    const removed = this.tickets.splice(idx, 1)[0];
    this.saveTickets();
    this.broadcast('ticket_deleted', { id: ticketId });
    return removed;
  }

  getStats() {
    const total = this.tickets.length;
    const newCount = this.tickets.filter(t => t.status === 'new').length;
    const inProgress = this.tickets.filter(t => t.status === 'in_progress').length;
    const resolved = this.tickets.filter(t => t.status === 'resolved').length;
    const rejected = this.tickets.filter(t => t.status === 'rejected' || t.verificationStatus === 'unauthorized').length;
    const verified = this.tickets.filter(t => t.verificationStatus === 'verified').length;

    return { total, newCount, inProgress, resolved, rejected, verified };
  }
}

module.exports = new TicketService();
