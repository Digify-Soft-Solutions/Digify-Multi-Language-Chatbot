"use client";
import React, { useEffect } from "react";

export default function AdminFloatingToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
        padding: "11px 22px",
        borderRadius: "999px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)",
        fontSize: "0.85rem",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        animation: "adminToastSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 8px #22c55e",
          flexShrink: 0,
        }}
      />
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          border: "none",
          color: "#ffffff",
          cursor: "pointer",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "6px",
          outline: "none",
        }}
      >
        <i className="fas fa-times" style={{ fontSize: "10px" }} />
      </button>
    </div>
  );
}
