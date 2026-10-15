const { Pool } = require('pg');
const config = require('../config');

class DbService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.readyPromise = null;
    this.init();
  }

  init() {
    const dbUrl = config.databaseUrl || process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('ℹ️ [DB] No DATABASE_URL provided. Operating in JSON file storage mode.');
      return;
    }

    try {
      const isInternal = dbUrl.includes('.render.com') === false && dbUrl.includes('@dpg-');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: isInternal ? false : { rejectUnauthorized: false }
      });

      this.readyPromise = this.createTables()
        .then(() => {
          this.isConnected = true;
          console.log('✅ [DB] Connected to Render PostgreSQL & `tickets` table ready!');
        })
        .catch(err => {
          console.warn('⚠️ [DB] PostgreSQL initialization warning:', err.message);
          this.isConnected = false;
        });
    } catch (e) {
      console.error('❌ [DB] Failed to initialize PostgreSQL pool:', e.message);
      this.isConnected = false;
    }
  }

  async createTables() {
    if (!this.pool) return;
    const query = `
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(50) PRIMARY KEY,
        customer_phone VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255),
        channel VARCHAR(100) DEFAULT 'WhatsApp',
        status VARCHAR(50) DEFAULT 'new',
        verification_status VARCHAR(50) DEFAULT 'unauthorized',
        erp_client JSONB,
        last_message TEXT,
        messages JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await this.pool.query(query);
  }

  rowToTicket(r) {
    return {
      id: r.id,
      customerPhone: r.customer_phone,
      senderName: r.sender_name,
      channel: r.channel,
      status: r.status,
      verificationStatus: r.verification_status,
      erpClient: r.erp_client,
      lastMessage: r.last_message,
      messages: r.messages || [],
      notes: r.notes || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  async getAllTickets() {
    if (!this.pool) return null;
    if (this.readyPromise) await this.readyPromise;
    try {
      const res = await this.pool.query('SELECT * FROM tickets ORDER BY updated_at DESC');
      return res.rows.map(this.rowToTicket);
    } catch (e) {
      console.error('❌ [DB] Error fetching tickets from PostgreSQL:', e.message);
      return null;
    }
  }

  async saveTicket(t) {
    if (!this.pool) return false;
    if (this.readyPromise) await this.readyPromise;
    const query = `
      INSERT INTO tickets (
        id, customer_phone, sender_name, channel, status, verification_status,
        erp_client, last_message, messages, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        customer_phone = EXCLUDED.customer_phone,
        sender_name = EXCLUDED.sender_name,
        channel = EXCLUDED.channel,
        status = EXCLUDED.status,
        verification_status = EXCLUDED.verification_status,
        erp_client = EXCLUDED.erp_client,
        last_message = EXCLUDED.last_message,
        messages = EXCLUDED.messages,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const values = [
      t.id,
      t.customerPhone,
      t.senderName || 'Customer',
      t.channel || 'WhatsApp',
      t.status || 'new',
      t.verificationStatus || 'unauthorized',
      JSON.stringify(t.erpClient || null),
      t.lastMessage || '',
      JSON.stringify(t.messages || []),
      t.notes || '',
      t.createdAt || new Date().toISOString(),
      t.updatedAt || new Date().toISOString()
    ];
    try {
      await this.pool.query(query, values);
      return true;
    } catch (e) {
      console.error(`❌ [DB] Error saving ticket ${t.id} to PostgreSQL:`, e.message);
      return false;
    }
  }

  async deleteTicket(id) {
    if (!this.pool) return false;
    if (this.readyPromise) await this.readyPromise;
    try {
      await this.pool.query('DELETE FROM tickets WHERE id = $1', [id]);
      return true;
    } catch (e) {
      console.error(`❌ [DB] Error deleting ticket ${id} from PostgreSQL:`, e.message);
      return false;
    }
  }
}

module.exports = new DbService();
