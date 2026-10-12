/**
 * AdminConfirmModal.js
 * Centered modal, blurred dark backdrop, icon in colored rounded box,
 * smooth animations, customizable buttons and callbacks.
 */

window.AdminConfirmModal = {
  show(config) {
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
      onClose
    } = config;

    const showCancel = cancelText !== null && cancelText !== false && cancelText !== "";

    // Remove any existing modal
    this.close();

    const backdrop = document.createElement("div");
    backdrop.id = "admin-confirm-modal-root";
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background-color: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: adminModalFadeIn 0.2s ease-out;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      width: 100%;
      max-width: 460px;
      background: #ffffff;
      border-radius: 20px;
      padding: 28px 26px 24px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05);
      text-align: center;
      position: relative;
      animation: adminModalPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    `;

    // Icon
    const iconContainer = document.createElement("div");
    iconContainer.style.cssText = `
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: ${iconBg};
      color: ${iconColor};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 1.45rem;
      box-shadow: ${isSuccess ? "0 4px 16px rgba(16, 185, 129, 0.2)" : "none"};
    `;
    iconContainer.innerHTML = `<i class="${icon}"></i>`;

    // Title
    const titleEl = document.createElement("h3");
    titleEl.style.cssText = `
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.3px;
    `;
    titleEl.textContent = title;

    // Message
    const msgEl = document.createElement("p");
    msgEl.style.cssText = `
      font-size: 0.86rem;
      color: #64748b;
      line-height: 1.55;
      margin: 0 0 24px 0;
    `;
    msgEl.textContent = message;

    // Buttons Row
    const btnRow = document.createElement("div");
    btnRow.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
    `;

    if (showCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = cancelText;
      cancelBtn.style.cssText = `
        flex: 1;
        padding: 11px 18px;
        border-radius: 12px;
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
        font-weight: 700;
        font-size: 0.86rem;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      `;
      cancelBtn.onclick = () => {
        AdminConfirmModal.close();
        if (onClose) onClose();
      };
      btnRow.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.style.cssText = `
      flex: ${showCancel ? 1 : "0 0 100%"};
      max-width: ${showCancel ? "none" : "280px"};
      margin: ${showCancel ? "0" : "0 auto"};
      padding: 11px 22px;
      border-radius: 12px;
      background: ${confirmBg};
      color: #ffffff;
      border: none;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
      box-shadow: ${isSuccess ? "0 4px 14px rgba(16, 185, 129, 0.35)" : "0 4px 12px rgba(220, 38, 38, 0.25)"};
      transition: transform 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
    `;
    confirmBtn.innerHTML = `
      ${isSuccess ? '<i class="fas fa-check" style="font-size: 12px;"></i>' : ''}
      <span>${confirmText}</span>
    `;

    confirmBtn.onclick = async () => {
      AdminConfirmModal.close();
      if (onConfirm) await onConfirm();
    };
    btnRow.appendChild(confirmBtn);

    card.appendChild(iconContainer);
    card.appendChild(titleEl);
    card.appendChild(msgEl);
    card.appendChild(btnRow);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        AdminConfirmModal.close();
        if (onClose) onClose();
      }
    };

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  },

  close() {
    const existing = document.getElementById("admin-confirm-modal-root");
    if (existing) {
      existing.remove();
    }
  }
};
