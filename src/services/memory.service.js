// In-memory conversation and state store per customer phone number
const sessionStore = new Map();

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

class MemoryService {
  /**
   * Get full session for a given phone number
   */
  getSession(phoneNumber) {
    let session = sessionStore.get(phoneNumber);
    if (!session) {
      session = {
        state: 'CHOOSING_LANGUAGE', // CHOOSING_LANGUAGE | CHOOSING_CATEGORY | AWAITING_QUERY | TICKET_CREATED
        language: null,
        category: null,
        ticket: null,
        messages: [],
        lastUpdated: Date.now()
      };
      sessionStore.set(phoneNumber, session);
      return session;
    }

    // Expire old sessions
    if (Date.now() - session.lastUpdated > SESSION_EXPIRY_MS) {
      this.resetSession(phoneNumber);
      return this.getSession(phoneNumber);
    }

    return session;
  }

  /**
   * Update session state or attributes
   */
  updateSession(phoneNumber, updates) {
    const session = this.getSession(phoneNumber);
    Object.assign(session, updates, { lastUpdated: Date.now() });
    sessionStore.set(phoneNumber, session);
    return session;
  }

  /**
   * Reset session back to beginning (when user presses 0)
   */
  resetSession(phoneNumber) {
    sessionStore.set(phoneNumber, {
      state: 'CHOOSING_LANGUAGE',
      language: null,
      category: null,
      ticket: null,
      messages: [],
      lastUpdated: Date.now()
    });
  }

  /**
   * Append a message to conversation history
   */
  addMessage(phoneNumber, role, content) {
    const session = this.getSession(phoneNumber);
    session.messages.push({ role, content });
    session.lastUpdated = Date.now();
    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }
  }

  getHistory(phoneNumber) {
    return this.getSession(phoneNumber).messages;
  }
}

module.exports = new MemoryService();
