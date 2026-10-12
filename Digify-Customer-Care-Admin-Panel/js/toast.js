/**
 * AdminFloatingToast.js
 * Floating top pill, dark gradient, pulsing green dot, smooth slide-down animation
 */

window.AdminFloatingToast = {
  timeoutId: null,

  show(message, duration = 3500) {
    if (!message) return;

    this.close();

    const toast = document.createElement("div");
    toast.id = "admin-floating-toast-root";
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 11px 22px;
      border-radius: 999px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-size: 0.85rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      animation: adminToastSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    `;

    // Green glowing dot
    const dot = document.createElement("span");
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      flex-shrink: 0;
    `;

    // Text content
    const textSpan = document.createElement("span");
    textSpan.textContent = message;

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #ffffff;
      cursor: pointer;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 6px;
      outline: none;
      font-size: 10px;
    `;
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => this.close();

    toast.appendChild(dot);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);

    document.body.appendChild(toast);

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.close();
      }, duration);
    }
  },

  close() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    const existing = document.getElementById("admin-floating-toast-root");
    if (existing) {
      existing.remove();
    }
  }
};
