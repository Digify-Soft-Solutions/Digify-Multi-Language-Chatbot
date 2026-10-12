/**
 * Digify Customer Care Admin Console - Application Logic
 * Integrates WhatsApp Webhook Stream, ERP Authentication,
 * Ticket Management & Custom Confirm Modals/Toasts.
 */

class DigifyCareAdminApp {
  constructor() {
    this.tickets = [];
    this.stats = { total: 0, newCount: 0, inProgress: 0, resolved: 0, rejected: 0, verified: 0 };
    this.currentTab = 'all';
    this.statusFilter = 'all';
    this.searchQuery = '';
    this.selectedTicket = null;
    this.sseSource = null;

    this.init();
  }

  async init() {
    this.initClock();
    this.bindEvents();
    await this.fetchTickets();
    this.initSSE();
  }

  /* ─────────────────────────────────────────────────────────────
     Live IST Clock (if element present)
  ───────────────────────────────────────────────────────────── */
  initClock() {
    const updateClock = () => {
      const now = new Date();
      try {
        const timeFormatter = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        const dateFormatter = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const timeStr = timeFormatter.format(now);
        const dateStr = dateFormatter.format(now);

        const timeEl = document.getElementById("clock-time");
        const dateEl = document.getElementById("clock-date");

        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
      } catch (e) {
        const timeEl = document.getElementById("clock-time");
        if (timeEl) timeEl.textContent = now.toLocaleTimeString();
      }
    };

    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ─────────────────────────────────────────────────────────────
     Event Listeners
  ───────────────────────────────────────────────────────────── */
  bindEvents() {
    // Nav Tabs
    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Search Input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderTicketsTable();
      });
    }

    // Status Filter Pills
    document.querySelectorAll(".status-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".status-pill-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.statusFilter = btn.dataset.filter;
        this.renderTicketsTable();
      });
    });

    // Export CSV
    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportCSV());
    }

    // Refresh Data
    const refreshBtn = document.getElementById("refresh-data-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        await this.fetchTickets();
        AdminFloatingToast.show("Customer care tickets refreshed from live stream.");
      });
    }

    // Close Drawer
    const drawerCloseBtn = document.getElementById("drawer-close-btn");
    const drawerBackdrop = document.getElementById("ticket-drawer-backdrop");
    if (drawerCloseBtn) drawerCloseBtn.addEventListener("click", () => this.closeDrawer());
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener("click", (e) => {
        if (e.target === drawerBackdrop) this.closeDrawer();
      });
    }

    // Simulator Form Submit
    const simForm = document.getElementById("sim-webhook-form");
    if (simForm) {
      simForm.addEventListener("submit", (e) => this.handleSimulateWebhook(e));
    }
  }

  /* ─────────────────────────────────────────────────────────────
     Real-time SSE Connection with Webhook Stream
  ───────────────────────────────────────────────────────────── */
  initSSE() {
    try {
      this.sseSource = new EventSource("/api/tickets/stream");

      this.sseSource.addEventListener("ticket_created", (e) => {
        const ticket = JSON.parse(e.data);
        console.log("⚡ [Live Webhook SSE] New Ticket Created:", ticket);
        this.tickets.unshift(ticket);
        this.updateStats();
        this.renderTicketsTable();
        AdminFloatingToast.show(`New WhatsApp Ticket from ${ticket.senderName || ticket.customerPhone}!`);
        this.playNotificationSound();
      });

      this.sseSource.addEventListener("ticket_updated", (e) => {
        const updated = JSON.parse(e.data);
        const idx = this.tickets.findIndex((t) => t.id === updated.id);
        if (idx !== -1) {
          this.tickets[idx] = updated;
          if (this.selectedTicket && this.selectedTicket.id === updated.id) {
            this.selectedTicket = updated;
            this.renderDrawerContent(updated);
          }
        } else {
          this.tickets.unshift(updated);
        }
        this.updateStats();
        this.renderTicketsTable();
      });

      this.sseSource.addEventListener("ticket_deleted", (e) => {
        const data = JSON.parse(e.data);
        this.tickets = this.tickets.filter((t) => t.id !== data.id);
        if (this.selectedTicket && this.selectedTicket.id === data.id) {
          this.closeDrawer();
        }
        this.updateStats();
        this.renderTicketsTable();
      });

      this.sseSource.onerror = () => {
        console.warn("SSE connection interrupted. Reconnecting automatically...");
      };
    } catch (err) {
      console.warn("Could not establish SSE:", err);
    }
  }

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
  }

  /* ─────────────────────────────────────────────────────────────
     API Requests
  ───────────────────────────────────────────────────────────── */
  async fetchTickets() {
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.success) {
        this.tickets = data.tickets || [];
        this.stats = data.stats || this.calculateStats();
        this.renderKPIs();
        this.renderTicketsTable();
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  }

  calculateStats() {
    const total = this.tickets.length;
    const newCount = this.tickets.filter((t) => t.status === "new").length;
    const inProgress = this.tickets.filter((t) => t.status === "in_progress").length;
    const resolved = this.tickets.filter((t) => t.status === "resolved").length;
    const rejected = this.tickets.filter((t) => t.status === "rejected" || t.verificationStatus === "unauthorized").length;
    const verified = this.tickets.filter((t) => t.verificationStatus === "verified").length;
    return { total, newCount, inProgress, resolved, rejected, verified };
  }

  updateStats() {
    this.stats = this.calculateStats();
    this.renderKPIs();
  }

  renderKPIs() {
    const totalEl = document.getElementById("stat-total");
    const newEl = document.getElementById("stat-new");
    const verifiedEl = document.getElementById("stat-verified");
    const unauthorizedEl = document.getElementById("stat-unauthorized");

    if (totalEl) totalEl.textContent = this.stats.total;
    if (newEl) newEl.textContent = this.stats.newCount;
    if (verifiedEl) verifiedEl.textContent = this.stats.verified;
    if (unauthorizedEl) unauthorizedEl.textContent = this.stats.rejected;
  }

  /* ─────────────────────────────────────────────────────────────
     Tabs & Views
  ───────────────────────────────────────────────────────────── */
  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    const simulatorSection = document.getElementById("tab-simulator-view");
    const ticketsSection = document.getElementById("tab-tickets-view");

    if (tabId === "simulator") {
      if (simulatorSection) simulatorSection.style.display = "block";
      if (ticketsSection) ticketsSection.style.display = "none";
    } else {
      if (simulatorSection) simulatorSection.style.display = "none";
      if (ticketsSection) ticketsSection.style.display = "block";
      this.renderTicketsTable();
    }
  }

  getFilteredTickets() {
    return this.tickets.filter((ticket) => {
      // Tab based filter
      if (this.currentTab === "pending" && ticket.status !== "new" && ticket.status !== "in_progress") {
        return false;
      }
      if (this.currentTab === "verified" && ticket.verificationStatus !== "verified") {
        return false;
      }
      if (this.currentTab === "unauthorized" && ticket.verificationStatus !== "unauthorized" && ticket.status !== "rejected") {
        return false;
      }

      // Status pill filter
      if (this.statusFilter !== "all" && ticket.status !== this.statusFilter) {
        return false;
      }

      // Search query filter
      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchName = (ticket.senderName || "").toLowerCase().includes(q);
        const matchPhone = (ticket.customerPhone || "").toLowerCase().includes(q);
        const matchMsg = (ticket.lastMessage || "").toLowerCase().includes(q);
        const matchId = (ticket.id || "").toLowerCase().includes(q);
        const matchErp = (ticket.erpClient?.companyName || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg && !matchId && !matchErp) {
          return false;
        }
      }

      return true;
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Render Tickets Table
  ───────────────────────────────────────────────────────────── */
  renderTicketsTable() {
    const tbody = document.getElementById("tickets-table-body");
    const countBadge = document.getElementById("filtered-count-badge");
    if (!tbody) return;

    const filtered = this.getFilteredTickets();
    if (countBadge) countBadge.textContent = `${filtered.length} Inquiries`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 60px 20px; text-align: center; color: #64748b;">
            <i class="fas fa-folder-open" style="font-size: 2.4rem; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">No Customer Inquiries Found</h3>
            <p style="font-size: 0.85rem; color: #94a3b8; max-width: 360px; margin: 0 auto;">
              ${this.searchQuery ? "No inquiries matching your search criteria." : "Incoming customer messages from WhatsApp or Webhook will automatically show up here live."}
            </p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((t) => {
        const isSelected = this.selectedTicket?.id === t.id;
        const dateStr = t.createdAt
          ? new Date(t.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Just now";

        // Verification Badge
        let verifBadge = "";
        if (t.verificationStatus === "verified") {
          verifBadge = `
            <span class="badge badge-verified" title="Registered ERP Customer">
              <span class="badge-dot"></span>
              ERP Verified
            </span>
          `;
        } else {
          verifBadge = `
            <span class="badge badge-unauthorized" title="Not registered in Digify ERP">
              <span class="badge-dot"></span>
              Unauthorized
            </span>
          `;
        }

        // Status Badge
        let statusBadge = "";
        if (t.status === "new") {
          statusBadge = `<span class="badge badge-new"><span class="badge-dot"></span>New Ticket</span>`;
        } else if (t.status === "in_progress") {
          statusBadge = `<span class="badge badge-progress"><span class="badge-dot"></span>In Progress</span>`;
        } else if (t.status === "resolved") {
          statusBadge = `<span class="badge badge-resolved"><span class="badge-dot"></span>Resolved</span>`;
        } else {
          statusBadge = `<span class="badge badge-unauthorized"><span class="badge-dot"></span>Rejected / Closed</span>`;
        }

        return `
          <tr class="${isSelected ? 'active-row' : ''}" data-ticket-id="${t.id}">
            <!-- Customer / Contact -->
            <td>
              <div style="font-weight: 700; color: #0f172a; font-size: 0.92rem; margin-bottom: 2px;">
                ${t.senderName || "Unknown Customer"}
              </div>
              <div style="color: #2563eb; font-weight: 600; font-size: 0.82rem; font-family: monospace;">
                +${t.customerPhone}
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">ID: ${t.id}</div>
            </td>

            <!-- ERP Verification Status -->
            <td>
              ${verifBadge}
              ${t.erpClient ? `<div style="font-size: 0.76rem; color: #475569; font-weight: 600; margin-top: 4px;">${t.erpClient.companyName}</div>` : ''}
            </td>

            <!-- Latest Query Message -->
            <td style="max-width: 320px;">
              <div style="color: #1e293b; font-size: 0.84rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                "${t.lastMessage || 'No message'}"
              </div>
              <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">
                <i class="fab fa-whatsapp" style="color: #22c55e; margin-right: 4px;"></i>${t.channel || "WhatsApp"}
              </div>
            </td>

            <!-- Date / Source -->
            <td>
              <div style="color: #0f172a; font-weight: 600; font-size: 0.8rem;">${dateStr}</div>
              <div style="color: #94a3b8; font-size: 0.74rem;">${t.messages?.length || 1} message(s)</div>
            </td>

            <!-- Ticket Status -->
            <td>
              ${statusBadge}
            </td>

            <!-- Actions -->
            <td style="text-align: right;" onclick="event.stopPropagation();">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <!-- Open Drawer -->
                <button class="action-icon-btn btn-verify" title="View Conversation & Reply" onclick="digifyApp.openDrawer('${t.id}')">
                  <i class="fas fa-comment-dots"></i>
                </button>
                <!-- Direct WhatsApp Link -->
                <a class="action-icon-btn btn-whatsapp" href="https://wa.me/${t.customerPhone}?text=${encodeURIComponent('Namaste, Digify Customer Care se sampark kar rahe hain. Aapki kya sahayata kar sakte hain?')}" target="_blank" title="Open in WhatsApp Web">
                  <i class="fab fa-whatsapp"></i>
                </a>
                <!-- Delete Button -->
                <button class="action-icon-btn btn-delete" title="Delete Inquiry" onclick="digifyApp.confirmDelete('${t.id}', '${t.senderName || t.customerPhone}')">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    // Attach row click to open drawer
    tbody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.ticketId;
        if (id) this.openDrawer(id);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Drawer (Ticket Inspection & WhatsApp Reply)
  ───────────────────────────────────────────────────────────── */
  openDrawer(ticketId) {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    this.selectedTicket = ticket;
    this.renderDrawerContent(ticket);

    const backdrop = document.getElementById("ticket-drawer-backdrop");
    if (backdrop) backdrop.style.display = "flex";
  }

  closeDrawer() {
    this.selectedTicket = null;
    const backdrop = document.getElementById("ticket-drawer-backdrop");
    if (backdrop) backdrop.style.display = "none";
  }

  renderDrawerContent(ticket) {
    const drawerTitle = document.getElementById("drawer-ticket-title");
    const drawerPhone = document.getElementById("drawer-customer-phone");
    const drawerErpBox = document.getElementById("drawer-erp-box");
    const drawerChatBox = document.getElementById("drawer-chat-box");
    const drawerNotes = document.getElementById("drawer-notes-input");

    if (drawerTitle) drawerTitle.textContent = `${ticket.senderName || 'Customer'} (${ticket.id})`;
    if (drawerPhone) drawerPhone.textContent = `+${ticket.customerPhone}`;

    // ERP Status in Drawer
    if (drawerErpBox) {
      if (ticket.verificationStatus === "verified" && ticket.erpClient) {
        drawerErpBox.innerHTML = `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 700; color: #065f46; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-check-circle" style="color: #10b981;"></i> ERP Verified Active Client
              </span>
              <span style="font-size: 0.72rem; color: #059669; font-weight: 600; background: #d1fae5; padding: 2px 8px; border-radius: 6px;">
                ID: ${ticket.erpClient.id}
              </span>
            </div>
            <div style="color: #047857; font-weight: 700; font-size: 0.92rem; margin-top: 4px;">${ticket.erpClient.companyName}</div>
            <div style="color: #065f46; font-size: 0.78rem; margin-top: 2px;">Plan: <strong>${ticket.erpClient.plan}</strong></div>
          </div>
        `;
      } else {
        drawerErpBox.innerHTML = `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 700; color: #991b1b; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-exclamation-triangle" style="color: #dc2626;"></i> Not Registered in Digify ERP
              </span>
              <button onclick="digifyApp.confirmVerifyErp('${ticket.id}')" style="background: #2563eb; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                Approve &amp; Verify
              </button>
            </div>
            <div style="color: #7f1d1d; font-size: 0.78rem; margin-top: 6px; line-height: 1.4;">
              Yeh client hamare ERP database me registered nahi hai. Gatekeeping policy ke according customer care access block hai.
            </div>
          </div>
        `;
      }
    }

    // Chat History
    if (drawerChatBox) {
      drawerChatBox.innerHTML = (ticket.messages || [])
        .map((m) => {
          const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const senderLabel = m.sender === 'customer' ? 'Customer' : (m.sender === 'bot' ? 'Digify AI Bot' : 'Admin Agent');
          return `
            <div class="chat-bubble ${m.sender}">
              <div style="font-size: 0.7rem; font-weight: 700; color: inherit; opacity: 0.75; margin-bottom: 2px;">
                ${senderLabel} • ${time}
              </div>
              <div style="word-break: break-word;">${m.text}</div>
            </div>
          `;
        })
        .join("");

      // Scroll to bottom of chat
      drawerChatBox.scrollTop = drawerChatBox.scrollHeight;
    }

    // Notes
    if (drawerNotes) {
      drawerNotes.value = ticket.notes || "";
    }
  }

  /* ─────────────────────────────────────────────────────────────
     Admin Actions with Custom Confirm Modals & Toasts
  ───────────────────────────────────────────────────────────── */

  // Send WhatsApp Reply
  async sendReply() {
    if (!this.selectedTicket) return;
    const input = document.getElementById("drawer-reply-input");
    const message = input?.value.trim();

    if (!message) {
      AdminFloatingToast.show("Please write a message to send.");
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${this.selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        input.value = "";
        this.selectedTicket = data.ticket;
        this.renderDrawerContent(data.ticket);
        this.renderTicketsTable();
        AdminFloatingToast.show("Message dispatched to client's WhatsApp via webhook!");
      }
    } catch (e) {
      AdminFloatingToast.show("Failed to dispatch reply. Check server connection.");
    }
  }

  // Save Notes
  async saveNotes() {
    if (!this.selectedTicket) return;
    const notes = document.getElementById("drawer-notes-input")?.value;

    try {
      const res = await fetch(`/api/tickets/${this.selectedTicket.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (data.success) {
        this.selectedTicket.notes = notes;
        AdminFloatingToast.show("Internal customer care notes saved.");
      }
    } catch (e) {
      AdminFloatingToast.show("Failed to save notes.");
    }
  }

  // Confirm ERP Verification
  confirmVerifyErp(ticketId) {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    AdminConfirmModal.show({
      title: "Approve Client in Digify ERP?",
      message: `Do you want to authorize "+${ticket.customerPhone}" (${ticket.senderName}) as a registered ERP subscriber with priority Customer Care access?`,
      icon: "fas fa-shield-alt",
      iconBg: "#ecfdf5",
      iconColor: "#10b981",
      confirmText: "Yes, Verify in ERP",
      confirmBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tickets/${ticketId}/verify-erp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approve: true }),
          });
          const data = await res.json();
          if (data.success) {
            AdminFloatingToast.show(`Client ${ticket.senderName} verified successfully in ERP!`);
          }
        } catch (e) {
          AdminFloatingToast.show("Verification failed.");
        }
      },
    });
  }

  // Send Unauthorized Rejection Notice
  confirmRejectNotice(ticketId) {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    AdminConfirmModal.show({
      title: "Dispatch Unauthorized Rejection Notice?",
      message: `Are you sure you want to reject this inquiry and send the standard notice to +${ticket.customerPhone} stating: "Aap hamare user nahi hain, pehle hamari services lijiye tabhi aap hamara customer care use kar payenge"?`,
      icon: "fas fa-user-slash",
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      confirmText: "Yes, Send Rejection Notice",
      confirmBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tickets/${ticketId}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sendWhatsApp: true }),
          });
          const data = await res.json();
          if (data.success) {
            AdminFloatingToast.show(`Rejection notice dispatched to +${ticket.customerPhone} via WhatsApp.`);
          }
        } catch (e) {
          AdminFloatingToast.show("Rejection dispatch failed.");
        }
      },
    });
  }

  // Confirm Resolve Ticket
  confirmResolve(ticketId) {
    AdminConfirmModal.show({
      title: "Mark Ticket as Resolved?",
      message: "Has this customer care query been completely addressed?",
      icon: "fas fa-check-double",
      iconBg: "#ecfdf5",
      iconColor: "#10b981",
      confirmText: "Mark Resolved",
      confirmBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await fetch(`/api/tickets/${ticketId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "resolved" }),
          });
          AdminFloatingToast.show("Customer care ticket marked as resolved!");
        } catch (e) {
          AdminFloatingToast.show("Failed to update status.");
        }
      },
    });
  }

  // Confirm Delete
  confirmDelete(ticketId, name) {
    AdminConfirmModal.show({
      title: "Delete Customer Inquiry?",
      message: `Are you sure you want to delete the inquiry for "${name || ticketId}"? This action cannot be undone.`,
      icon: "fas fa-trash-alt",
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      confirmText: "Yes, Delete Inquiry",
      confirmBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            AdminFloatingToast.show(`Customer inquiry "${name}" deleted.`);
          }
        } catch (e) {
          AdminFloatingToast.show("Delete failed.");
        }
      },
    });
  }

  /* ─────────────────────────────────────────────────────────────
     Live Webhook Simulator Handler
  ───────────────────────────────────────────────────────────── */
  async handleSimulateWebhook(e) {
    e.preventDefault();
    const phoneInput = document.getElementById("sim-phone");
    const nameInput = document.getElementById("sim-name");
    const msgInput = document.getElementById("sim-message");

    const phone = phoneInput?.value.trim() || "919829012345";
    const name = nameInput?.value.trim() || "Simulation Customer";
    const message = msgInput?.value.trim() || "Test query from WhatsApp webhook";

    const submitBtn = document.getElementById("sim-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching Webhook...';
    }

    try {
      const res = await fetch("/api/webhook/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, message }),
      });
      const data = await res.json();

      if (data.status === "success") {
        AdminFloatingToast.show(`Live Webhook Received! Ticket ${data.ticketId} created/updated.`);
        msgInput.value = "";
        // Switch back to inquiries tab so user sees it instantly
        this.switchTab("all");
      } else {
        AdminFloatingToast.show("Webhook processed but no ticket created.");
      }
    } catch (err) {
      AdminFloatingToast.show("Webhook simulation error: " + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Live WhatsApp Webhook';
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     Export to CSV
  ───────────────────────────────────────────────────────────── */
  exportCSV() {
    const filtered = this.getFilteredTickets();
    if (filtered.length === 0) {
      AdminFloatingToast.show("No records to export.");
      return;
    }

    const headers = ["Ticket ID", "Customer Name", "Phone", "ERP Status", "Ticket Status", "Created Date", "Latest Query", "Notes"];
    const rows = filtered.map((t) => [
      `"${t.id}"`,
      `"${(t.senderName || "").replace(/"/g, '""')}"`,
      `"${t.customerPhone || ""}"`,
      `"${t.verificationStatus || "unauthorized"}"`,
      `"${t.status || "new"}"`,
      `"${t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : ""}"`,
      `"${(t.lastMessage || "").replace(/"/g, '""')}"`,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `digify_customer_care_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AdminFloatingToast.show("Customer care tickets exported to CSV.");
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.digifyApp = new DigifyCareAdminApp();
});
