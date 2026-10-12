/**
 * Digify Soft Solutions - ERP Integration Service
 * Manages client authentication, active subscriptions, and ERP verification
 */

class ErpService {
  constructor() {
    // Demo registered ERP clients with active service contracts
    this.erpClients = [
      {
        id: "ERP-CLI-901",
        phone: "918005934184",
        name: "Digify Admin Test User",
        companyName: "Digify Soft Solutions Ltd.",
        plan: "Enterprise Omnichannel AI",
        status: "active",
        validTill: "2027-12-31",
        services: ["WhatsApp AI Bot", "Cloud ERP", "B2B Lead Engine", "Priority Support"]
      },
      {
        id: "ERP-CLI-102",
        phone: "919829012345",
        name: "Vikram Sharma",
        companyName: "Sharma Enterprises & Logistics",
        plan: "Business Growth Suite",
        status: "active",
        validTill: "2027-05-15",
        services: ["Multi-Language Chatbot", "Billing Software"]
      },
      {
        id: "ERP-CLI-103",
        phone: "919414156789",
        name: "Pooja Mehta",
        companyName: "Mehta Textiles Export Hub",
        plan: "Premium ERP Integration",
        status: "active",
        validTill: "2026-11-30",
        services: ["WhatsApp Bot", "Inventory Sync", "GST Invoicing"]
      },
      {
        id: "ERP-CLI-104",
        phone: "919123456780",
        name: "Rajesh Singhania",
        companyName: "Singhania Marble & Granite",
        plan: "Custom Enterprise Portal",
        status: "expired",
        validTill: "2026-01-10",
        services: ["Stone Catalogue", "Web Portal"]
      }
    ];

    // ERP Verification Enforcement Toggle (Default: true)
    this.enforceErpGatekeeping = true;
  }

  cleanPhone(phone) {
    if (!phone) return "";
    let cleaned = String(phone).replace(/\D/g, "");
    if (cleaned.length === 10) cleaned = "91" + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "91" + cleaned.slice(1);
    return cleaned;
  }

  /**
   * Check if a customer phone number is authentic and registered in ERP
   */
  async verifyCustomer(phone) {
    const cleaned = this.cleanPhone(phone);
    if (!cleaned) {
      return {
        isAuthentic: false,
        message: "Invalid phone number provided.",
        client: null
      };
    }

    const client = this.erpClients.find(c => this.cleanPhone(c.phone) === cleaned);

    if (client && client.status === "active") {
      return {
        isAuthentic: true,
        client,
        message: `Customer verified successfully with Digify ERP (${client.companyName}).`
      };
    }

    if (client && client.status === "expired") {
      return {
        isAuthentic: false,
        isExpired: true,
        client,
        message: `ERP subscription expired on ${client.validTill}. Renewal required.`
      };
    }

    // Unregistered user
    return {
      isAuthentic: false,
      client: null,
      message: "Customer not found in Digify ERP database."
    };
  }

  /**
   * Return standard rejection notice message
   */
  getUnauthorizedNoticeMessage(customerName = "User") {
    return `Namaste ${customerName} 🙏\n\nAap hamare registered user nahi hain.\nDigify Soft Solutions Customer Care access karne ke liye pehle hamari services lijiye, tabhi aap hamara customer care use kar payenge.\n\nHamare enterprise software, WhatsApp AI bots aur ERP solutions dekhne ke liye sampark karein:\n🌐 https://digifysoftsolutions.com\n📞 Sales Team: +91 80059 34184\n\nDhanyawad,\nDigify Soft Solutions Support`;
  }

  /**
   * List all ERP clients
   */
  getAllErpClients() {
    return this.erpClients;
  }

  /**
   * Register or manually approve a client into ERP
   */
  addOrUpdateErpClient(clientData) {
    const cleaned = this.cleanPhone(clientData.phone);
    const existingIndex = this.erpClients.findIndex(c => this.cleanPhone(c.phone) === cleaned);
    
    const client = {
      id: clientData.id || `ERP-CLI-${Date.now().toString().slice(-4)}`,
      phone: cleaned,
      name: clientData.name || "Enterprise Client",
      companyName: clientData.companyName || "Digify Registered Partner",
      plan: clientData.plan || "Standard Enterprise",
      status: clientData.status || "active",
      validTill: clientData.validTill || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      services: clientData.services || ["Customer Care Priority Access", "WhatsApp Bot"]
    };

    if (existingIndex >= 0) {
      this.erpClients[existingIndex] = { ...this.erpClients[existingIndex], ...client };
      return this.erpClients[existingIndex];
    } else {
      this.erpClients.unshift(client);
      return client;
    }
  }

  setGatekeeping(enforce) {
    this.enforceErpGatekeeping = Boolean(enforce);
    return this.enforceErpGatekeeping;
  }

  isGatekeepingEnabled() {
    return this.enforceErpGatekeeping;
  }
}

module.exports = new ErpService();
