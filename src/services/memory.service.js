// In-memory conversation history per phone number (retains last 10 turns)
const conversationStore = new Map();

const MAX_HISTORY = 10;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

class MemoryService {
  /**
   * Get conversation history for a given phone number
   */
  getHistory(phoneNumber) {
    const session = conversationStore.get(phoneNumber);
    if (!session) return [];

    // Expire old sessions
    if (Date.now() - session.lastUpdated > SESSION_EXPIRY_MS) {
      conversationStore.delete(phoneNumber);
      return [];
    }

    return session.messages;
  }

  /**
   * Append a message to a customer's history
   * @param {string} phoneNumber
   * @param {'user'|'assistant'} role
   * @param {string} content
   */
  addMessage(phoneNumber, role, content) {
    let session = conversationStore.get(phoneNumber);
    if (!session) {
      session = {
        messages: [],
        lastUpdated: Date.now()
      };
      conversationStore.set(phoneNumber, session);
    }

    session.messages.push({ role, content });
    session.lastUpdated = Date.now();

    // Keep only the latest messages
    if (session.messages.length > MAX_HISTORY) {
      session.messages = session.messages.slice(-MAX_HISTORY);
    }
  }

  /**
   * Clear session for a user
   */
  clearSession(phoneNumber) {
    conversationStore.delete(phoneNumber);
  }
}

module.exports = new MemoryService();
