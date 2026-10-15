"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import AdminConfirmModal from "../components/AdminConfirmModal";
import AdminFloatingToast from "../components/AdminFloatingToast";

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [authSubFilter, setAuthSubFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Modal and Toast state
  const [confirmModal, setConfirmModal] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Simulator state
  const [simPhone, setSimPhone] = useState("919829012345");
  const [simName, setSimName] = useState("Vikram Sharma");
  const [simMessage, setSimMessage] = useState(
    "Namaste, hamare Digify ERP system me new WhatsApp chatbot activate karna hai."
  );
  const [simulating, setSimulating] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  // 1. Fetch initial tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // 2. Real-time Server-Sent Events (SSE) Listener
  useEffect(() => {
    let sseSource = null;
    try {
      sseSource = new EventSource("/api/tickets/stream");

      sseSource.addEventListener("ticket_created", (e) => {
        const newTicket = JSON.parse(e.data);
        setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== newTicket.id)]);
        showToast(`New WhatsApp Ticket from ${newTicket.senderName || newTicket.customerPhone}!`);
      });

      sseSource.addEventListener("ticket_updated", (e) => {
        const updated = JSON.parse(e.data);
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setSelectedTicket((curr) => (curr && curr.id === updated.id ? updated : curr));
      });

      sseSource.addEventListener("ticket_deleted", (e) => {
        const { id } = JSON.parse(e.data);
        setTickets((prev) => prev.filter((t) => t.id !== id));
        setSelectedTicket((curr) => (curr && curr.id === id ? null : curr));
      });
    } catch (e) {
      console.warn("SSE error:", e);
    }

    return () => {
      if (sseSource) sseSource.close();
    };
  }, []);

  // Update notes input when selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setNotesInput(selectedTicket.notes || "");
    }
  }, [selectedTicket]);

  // 3. Computed Stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const newCount = tickets.filter((t) => t.status === "new").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    const rejected = tickets.filter(
      (t) => t.status === "rejected" || t.verificationStatus === "unauthorized"
    ).length;
    const verified = tickets.filter((t) => t.verificationStatus === "verified").length;
    return { total, newCount, inProgress, resolved, rejected, verified };
  }, [tickets]);

  // 4. Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Tab based filter
      if (activeTab === "auth") {
        if (authSubFilter === "verified" && ticket.verificationStatus !== "verified") {
          return false;
        }
        if (authSubFilter === "not_verified" && ticket.verificationStatus === "verified") {
          return false;
        }
      }

      // Status pill filter
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [tickets, activeTab, statusFilter, searchQuery]);

  // 5. Actions
  const handleSendReply = async () => {
    if (!selectedTicket || !replyInput.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyInput("");
        setSelectedTicket(data.ticket);
        showToast("Message dispatched to client's WhatsApp via webhook!");
      }
    } catch (e) {
      showToast("Failed to dispatch reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        showToast("Internal customer care notes saved.");
      }
    } catch (e) {
      showToast("Failed to save notes.");
    }
  };

  const confirmVerifyErp = (ticketId) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setConfirmModal({
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
            showToast(`Client ${ticket.senderName} verified successfully in ERP!`);
          }
        } catch (e) {
          showToast("Verification failed.");
        }
      },
    });
  };

  const confirmRejectNotice = (ticketId) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setConfirmModal({
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
            showToast(`Rejection notice dispatched to +${ticket.customerPhone} via WhatsApp.`);
          }
        } catch (e) {
          showToast("Rejection dispatch failed.");
        }
      },
    });
  };

  const confirmResolve = (ticketId) => {
    setConfirmModal({
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
          showToast("Customer care ticket marked as resolved!");
        } catch (e) {
          showToast("Failed to update status.");
        }
      },
    });
  };

  const confirmDelete = (ticketId, name) => {
    setConfirmModal({
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
            showToast(`Customer inquiry "${name}" deleted.`);
          }
        } catch (e) {
          showToast("Delete failed.");
        }
      },
    });
  };

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await fetch("/api/webhook/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: simPhone.trim(),
          name: simName.trim(),
          message: simMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(`Live Webhook Received! Ticket ${data.ticketId} created/updated.`);
        setSimMessage("");
        setActiveTab("all");
      }
    } catch (err) {
      showToast("Simulation error: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const exportCSV = () => {
    if (filteredTickets.length === 0) {
      showToast("No records to export.");
      return;
    }

    const headers = [
      "Ticket ID",
      "Customer Name",
      "Phone",
      "ERP Status",
      "Ticket Status",
      "Created Date",
      "Latest Query",
      "Notes",
    ];
    const rows = filteredTickets.map((t) => [
      `"${t.id}"`,
      `"${(t.senderName || "").replace(/"/g, '""')}"`,
      `"${t.customerPhone || ""}"`,
      `"${t.verificationStatus || "unauthorized"}"`,
      `"${t.status || "new"}"`,
      `"${t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : ""}"`,
      `"${(t.lastMessage || "").replace(/"/g, '""')}"`,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `digify_customer_care_tickets_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Customer care tickets exported to CSV.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* ── Top Navbar ── */}
      <nav className="admin-navbar">
        {/* Brand */}
        <div className="brand-wrapper" style={{ cursor: "pointer" }} onClick={() => setActiveTab("all")}>
          <img
            src="/digify-logo.png"
            alt="Digify Soft Solutions"
            style={{ height: "36px", objectFit: "contain", maxWidth: "130px" }}
          />
          <span style={{ width: "1px", height: "26px", background: "#cbd5e1", margin: "0 2px" }} />
          <div
            className="brand-icon-box"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35)",
            }}
          >
            <i className="fab fa-whatsapp" style={{ fontSize: "1.15rem" }} />
          </div>
          <div>
            <div className="brand-title">Digify Soft Console</div>
            <div className="brand-badge">Customer Care &amp; ERP Gatekeeper</div>
          </div>
        </div>

        {/* Center: Nav Tabs */}
        <div className="admin-nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <i className="fas fa-inbox" />
            <span>Customer Inquiries</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "auth" ? "active" : ""}`}
            onClick={() => setActiveTab("auth")}
          >
            <i className="fas fa-shield-alt" />
            <span>User Authentication</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === "simulator" ? "active" : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            <i className="fas fa-satellite-dish" />
            <span>Webhook Simulator</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="nav-right-controls">
          <button
            className="btn-secondary"
            style={{ height: "34px", padding: "0 12px", fontSize: "0.8rem" }}
            onClick={() => {
              fetchTickets();
              showToast("Inquiries synced live.");
            }}
            title="Sync Live Stream"
          >
            <i className="fas fa-rotate" style={{ color: "#0284c7", fontSize: "0.78rem" }} />
            <span>Sync Live</span>
          </button>
        </div>
      </nav>

      {/* ── Main Container ── */}
      <main className="admin-container">
        {activeTab !== "simulator" ? (
          <div>
            {/* Page Header Row */}
            <div className="page-title-row">
              <div>
                <h1 className="page-title">
                  Customer Care Inquiries &amp; WhatsApp Tickets
                </h1>
                <p className="page-subtitle">
                  Live omnichannel ticket stream connected to WhatsApp Webhook, AI Engine, and ERP Authenticity Gatekeeping.
                </p>
              </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="kpi-grid">
              <div className="kpi-card blue">
                <div className="kpi-header">
                  <span className="kpi-label">Total Inquiries</span>
                  <div className="kpi-icon-badge">
                    <i className="fas fa-inbox" />
                  </div>
                </div>
                <div className="kpi-value">{stats.total}</div>
                <div className="kpi-footer" style={{ color: "#2563eb" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />
                  <span>Live Stream Connected</span>
                </div>
              </div>

              <div className="kpi-card amber">
                <div className="kpi-header">
                  <span className="kpi-label">Pending / Action Required</span>
                  <div className="kpi-icon-badge">
                    <i className="fas fa-clock" />
                  </div>
                </div>
                <div className="kpi-value" style={{ color: "#d97706" }}>
                  {stats.newCount}
                </div>
                <div className="kpi-footer" style={{ color: "#d97706" }}>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#f59e0b",
                      animation: "pulseDot 1.5s infinite",
                    }}
                  />
                  <span>Awaiting Agent Review</span>
                </div>
              </div>

              <div className="kpi-card green">
                <div className="kpi-header">
                  <span className="kpi-label">ERP Verified Clients</span>
                  <div className="kpi-icon-badge">
                    <i className="fas fa-shield-alt" />
                  </div>
                </div>
                <div className="kpi-value" style={{ color: "#15803d" }}>
                  {stats.verified}
                </div>
                <div className="kpi-footer" style={{ color: "#16a34a" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                  <span>Authorized Active Subscribers</span>
                </div>
              </div>

              <div className="kpi-card red">
                <div className="kpi-header">
                  <span className="kpi-label">Unauthorized Queries</span>
                  <div className="kpi-icon-badge">
                    <i className="fas fa-user-slash" />
                  </div>
                </div>
                <div className="kpi-value" style={{ color: "#dc2626" }}>
                  {stats.rejected}
                </div>
                <div className="kpi-footer" style={{ color: "#dc2626" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                  <span>Restricted / Gatekeeper Blocked</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              {activeTab === "auth" ? (
                <div className="status-filter-pills">
                  {[
                    { key: "all", label: `All Users (${tickets.length})` },
                    { key: "verified", label: `ERP Verified (${stats.verified})`, icon: "fa-check-circle", color: "#16a34a" },
                    { key: "not_verified", label: `ERP Not Verified (${stats.rejected})`, icon: "fa-times-circle", color: "#dc2626" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      className={`status-pill-btn ${authSubFilter === item.key ? "active" : ""}`}
                      onClick={() => setAuthSubFilter(item.key)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {item.icon && (
                        <i
                          className={`fas ${item.icon}`}
                          style={{
                            fontSize: "12px",
                            color: authSubFilter === item.key ? "#ffffff" : item.color,
                          }}
                        />
                      )}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="status-filter-pills">
                  {[
                    { key: "all", label: "All Inquiries" },
                    { key: "new", label: "New Inquiries" },
                    { key: "in_progress", label: "In Progress" },
                    { key: "resolved", label: "Resolved" },
                    { key: "rejected", label: "Rejected / Unauthorized" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      className={`status-pill-btn ${statusFilter === item.key ? "active" : ""}`}
                      onClick={() => setStatusFilter(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="search-box-wrapper">
                <i className="fas fa-search search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search customer name, phone, message, ERP firm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table Section */}
            <div className="table-wrapper">
              <div
                style={{
                  padding: "14px 20px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.84rem" }}>
                  <i className="fab fa-whatsapp" style={{ color: "#22c55e", marginRight: "6px" }} />
                  Incoming Customer Support Feed
                </div>
                <div
                  style={{
                    background: "#e2e8f0",
                    color: "#475569",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "999px",
                  }}
                >
                  {filteredTickets.length} Inquiries
                </div>
              </div>

              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Customer / Contact</th>
                    <th>ERP Gatekeeping Status</th>
                    <th>Latest WhatsApp Query</th>
                    <th>Date &amp; Source</th>
                    <th>Ticket Status</th>
                    <th style={{ textAlign: "right" }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: "1.8rem", color: "#0284c7", marginBottom: "12px", display: "block" }} />
                        Connecting to Live WhatsApp Webhook Database...
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                        <i className="fas fa-folder-open" style={{ fontSize: "2.4rem", color: "#cbd5e1", marginBottom: "12px", display: "block" }} />
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                          No Customer Inquiries Found
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "#94a3b8", maxWidth: "360px", margin: "0 auto" }}>
                          {searchQuery
                            ? "No inquiries matching your search criteria."
                            : "Incoming customer messages from WhatsApp or Webhook will automatically show up here live."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => {
                      const isSelected = selectedTicket?.id === t.id;
                      const dateStr = t.createdAt
                        ? new Date(t.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now";

                      return (
                        <tr
                          key={t.id}
                          className={isSelected ? "active-row" : ""}
                          onClick={() => setSelectedTicket(t)}
                        >
                          {/* Contact */}
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.92rem", marginBottom: "2px" }}>
                              {t.senderName || "Unknown Customer"}
                            </div>
                            <div style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.82rem", fontFamily: "monospace" }}>
                              +{t.customerPhone}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                              ID: {t.id}
                            </div>
                          </td>

                          {/* ERP Status */}
                          <td>
                            {t.verificationStatus === "verified" ? (
                              <span className="badge badge-verified">
                                <span className="badge-dot" />
                                ERP Verified
                              </span>
                            ) : (
                              <span className="badge badge-unauthorized">
                                <span className="badge-dot" />
                                Unauthorized
                              </span>
                            )}
                            {t.erpClient && (
                              <div style={{ fontSize: "0.76rem", color: "#475569", fontWeight: 600, marginTop: "4px" }}>
                                {t.erpClient.companyName}
                              </div>
                            )}
                          </td>

                          {/* Latest Query */}
                          <td style={{ maxWidth: "320px" }}>
                            <div style={{ color: "#1e293b", fontSize: "0.84rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              "{t.lastMessage || "No message"}"
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                              <i className="fab fa-whatsapp" style={{ color: "#22c55e", marginRight: "4px" }} />
                              {t.channel || "WhatsApp"}
                            </div>
                          </td>

                          {/* Date */}
                          <td>
                            <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.8rem" }}>{dateStr}</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                              {t.messages?.length || 1} message(s)
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            {t.status === "new" ? (
                              <span className="badge badge-new"><span className="badge-dot" />New Ticket</span>
                            ) : t.status === "in_progress" ? (
                              <span className="badge badge-progress"><span className="badge-dot" />In Progress</span>
                            ) : t.status === "resolved" ? (
                              <span className="badge badge-resolved"><span className="badge-dot" />Resolved</span>
                            ) : (
                              <span className="badge badge-unauthorized"><span className="badge-dot" />Rejected / Closed</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button
                                className="action-icon-btn btn-verify"
                                title="View Conversation & Reply"
                                onClick={() => setSelectedTicket(t)}
                              >
                                <i className="fas fa-comment-dots" />
                              </button>
                              <a
                                className="action-icon-btn btn-whatsapp"
                                href={`https://wa.me/${t.customerPhone}?text=${encodeURIComponent(
                                  "Namaste, Digify Customer Care se sampark kar rahe hain. Aapki kya sahayata kar sakte hain?"
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open in WhatsApp Web"
                              >
                                <i className="fab fa-whatsapp" />
                              </a>
                              <button
                                className="action-icon-btn btn-delete"
                                title="Delete Inquiry"
                                onClick={() => confirmDelete(t.id, t.senderName || t.customerPhone)}
                              >
                                <i className="fas fa-trash-alt" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Simulator View ── */
          <div>
            <div className="page-title-row">
              <div>
                <h1 className="page-title">Live WhatsApp Webhook Simulator</h1>
                <p className="page-subtitle">
                  Simulate incoming WhatsApp messages from clients to test ticket generation, ERP gatekeeping, and AI replies live.
                </p>
              </div>

              <button className="btn-secondary" onClick={() => setActiveTab("all")}>
                <i className="fas fa-arrow-left" />
                <span>Back to Inquiries</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
              <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                    <i className="fab fa-whatsapp" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      Trigger Incoming WhatsApp Message
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0 0" }}>
                      Sends payload to <code>/api/webhook/whatsapp</code> endpoint.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSimulateWebhook}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Customer WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ paddingLeft: "14px" }}
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "4px" }}>
                      Try <code>919829012345</code> (Registered ERP) or <code>919988776655</code> (Unregistered).
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Customer / Sender Name
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      style={{ paddingLeft: "14px" }}
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: "22px" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Customer Query Message
                    </label>
                    <textarea
                      rows={4}
                      className="search-input"
                      style={{ padding: "12px 14px", resize: "vertical" }}
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={simulating}
                    style={{ width: "100%", justifyContent: "center", padding: "13px" }}
                  >
                    {simulating ? (
                      <>
                        <i className="fas fa-spinner fa-spin" />
                        <span>Dispatching Webhook...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" />
                        <span>Send Live WhatsApp Webhook</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Guide Card */}
              <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                    <i className="fas fa-shield-alt" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      ERP Gatekeeper Architecture
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "2px 0 0 0" }}>
                      Authenticity verification flow
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: "0.86rem", color: "#334155", lineHeight: 1.6 }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
                    <div style={{ fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <i className="fas fa-check-circle" style={{ color: "#10b981" }} /> Case 1: Authentic ERP Customer
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#475569" }}>
                      Jab customer WhatsApp par query bhejta hai, system phone number ko backend ERP database se match karta hai. Active client hone par AI unhe multilingual assistance provide karta hai aur ticket <strong>ERP Verified</strong> show hoti hai.
                    </p>
                  </div>

                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
                    <div style={{ fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <i className="fas fa-times-circle" style={{ color: "#dc2626" }} /> Case 2: Unregistered / Guest User
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#7f1d1d" }}>
                      Customer number ERP me na milne par customer care access restrict hota hai aur automatic notice dispatch hota hai:<br />
                      <em>"Aap hamare registered user nahi hain. Customer care access karne ke liye pehle hamari services lijiye..."</em>
                    </p>
                  </div>

                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontWeight: 700, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <i className="fas fa-user-check" style={{ color: "#2563eb" }} /> Manual Override by Admin
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e3a8a" }}>
                      Admin kisi bhi unauthorized inquiry ko inspect karke 1-click me <strong>Approve &amp; Verify</strong> kar sakta hai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Side Inspection & WhatsApp Reply Drawer ── */}
      {selectedTicket && (
        <div
          className="drawer-backdrop"
          onClick={(e) => {
            if (e.target.classList.contains("drawer-backdrop")) {
              setSelectedTicket(null);
            }
          }}
        >
          <div className="drawer-panel">
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: "1.12rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {selectedTicket.senderName || "Customer"} ({selectedTicket.id})
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 700, marginTop: "2px", fontFamily: "monospace" }}>
                  +{selectedTicket.customerPhone}
                </div>
              </div>
              <button
                className="action-icon-btn"
                style={{ background: "#f1f5f9", color: "#64748b", fontSize: "1rem" }}
                onClick={() => setSelectedTicket(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {/* ERP Box */}
              {selectedTicket.verificationStatus === "verified" && selectedTicket.erpClient ? (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "#065f46", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fas fa-check-circle" style={{ color: "#10b981" }} /> ERP Verified Active Client
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600, background: "#d1fae5", padding: "2px 8px", borderRadius: "6px" }}>
                      ID: {selectedTicket.erpClient.id}
                    </span>
                  </div>
                  <div style={{ color: "#047857", fontWeight: 700, fontSize: "0.92rem", marginTop: "4px" }}>
                    {selectedTicket.erpClient.companyName}
                  </div>
                  <div style={{ color: "#065f46", fontSize: "0.78rem", marginTop: "2px" }}>
                    Plan: <strong>{selectedTicket.erpClient.plan}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "#991b1b", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: "#dc2626" }} /> Not Registered in Digify ERP
                    </span>
                    <button
                      onClick={() => confirmVerifyErp(selectedTicket.id)}
                      style={{ background: "#2563eb", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Approve &amp; Verify
                    </button>
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: "0.78rem", marginTop: "6px", lineHeight: "1.4" }}>
                    Yeh client hamare ERP database me registered nahi hai. Gatekeeping policy ke according customer care access block hai.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                <button
                  className="btn-secondary"
                  onClick={() => confirmVerifyErp(selectedTicket.id)}
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.78rem", padding: "8px 10px" }}
                >
                  <i className="fas fa-shield-alt" style={{ color: "#10b981" }} /> Verify ERP
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => confirmRejectNotice(selectedTicket.id)}
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.78rem", padding: "8px 10px", color: "#dc2626" }}
                >
                  <i className="fas fa-user-slash" style={{ color: "#dc2626" }} /> Send Reject Notice
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => confirmResolve(selectedTicket.id)}
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.78rem", padding: "8px 10px", color: "#16a34a" }}
                >
                  <i className="fas fa-check-double" style={{ color: "#16a34a" }} /> Resolve
                </button>
              </div>

              {/* Chat Thread */}
              <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.84rem", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>WhatsApp Conversation Thread</span>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>Live Webhook Sync</span>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", marginBottom: "20px" }}>
                {(selectedTicket.messages || []).map((m, idx) => {
                  const time = m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";
                  const senderLabel =
                    m.sender === "customer"
                      ? "Customer"
                      : m.sender === "bot"
                      ? "Digify AI Bot"
                      : "Admin Agent";
                  return (
                    <div key={idx} className={`chat-bubble ${m.sender}`}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "inherit", opacity: 0.75, marginBottom: "2px" }}>
                        {senderLabel} • {time}
                      </div>
                      <div style={{ wordBreak: "break-word" }}>{m.text}</div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "6px" }}>
                  Dispatch WhatsApp Reply via Webhook
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Type reply to send to client's WhatsApp..."
                    style={{ paddingLeft: "14px" }}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleSendReply}
                    disabled={sendingReply}
                    style={{ flexShrink: 0 }}
                  >
                    {sendingReply ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
                    Internal Care Team Notes
                  </label>
                  <button
                    onClick={handleSaveNotes}
                    style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows={3}
                  className="search-input"
                  style={{ padding: "10px 12px", resize: "vertical" }}
                  placeholder="Add internal notes about this customer issue..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Centered Confirm Modal ── */}
      <AdminConfirmModal config={confirmModal} onClose={() => setConfirmModal(null)} />

      {/* ── Custom Top Floating Toast ── */}
      <AdminFloatingToast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
}
