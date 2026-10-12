"use client";
import React from "react";

export default function AdminConfirmModal({ config, onClose }) {
  if (!config) return null;

  const isSuccess = Boolean(config.isSuccess || config.type === "success");

  const {
    title = isSuccess ? "Action Completed Successfully!" : "Confirm Action",
    message = "Are you sure you want to proceed with this action?",
    icon = isSuccess ? "fas fa-check-circle" : "fas fa-trash-alt",
    iconBg = isSuccess ? "#ecfdf5" : "#fee2e2",
    iconColor = isSuccess ? "#10b981" : "#dc2626",
    confirmText = isSuccess ? "Done" : "Confirm",
    confirmBg = isSuccess
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    cancelText = isSuccess ? null : "Cancel",
    onConfirm,
  } = config;

  const showCancel = cancelText !== null && cancelText !== false && cancelText !== "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "adminModalFadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "28px 26px 24px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
          position: "relative",
          animation: "adminModalPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "18px",
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "1.45rem",
            boxShadow: isSuccess ? "0 4px 16px rgba(16, 185, 129, 0.2)" : "none",
          }}
        >
          <i className={icon}></i>
        </div>

        <h3
          style={{
            fontSize: "1.2rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 8px 0",
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: "0.86rem",
            color: "#64748b",
            lineHeight: 1.55,
            margin: "0 0 24px 0",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 18px",
                borderRadius: "12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              onClose();
              if (onConfirm) await onConfirm();
            }}
            style={{
              flex: showCancel ? 1 : "0 0 100%",
              maxWidth: showCancel ? "none" : "280px",
              margin: showCancel ? "0" : "0 auto",
              padding: "11px 22px",
              borderRadius: "12px",
              background: confirmBg,
              color: "#ffffff",
              border: "none",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: isSuccess
                ? "0 4px 14px rgba(16, 185, 129, 0.35)"
                : "0 4px 12px rgba(220, 38, 38, 0.25)",
              transition: "transform 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isSuccess && <i className="fas fa-check" style={{ fontSize: "12px" }} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
