/**
 * toasts.js — Toast notification system
 */

import { LAYOUT } from '../utils/constants.js';

let toastIdCounter = 0;

/**
 * Initialize toast system.
 * @param {HTMLElement} container  The #toasts element
 * @returns {{ toast, dismissToast }}
 */
export function initToasts(container) {

  function toast(message, type = 'info') {
    const id = ++toastIdCounter;

    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.toastId = id;
    el.textContent = message;

    switch (type) {
      case 'success':
        el.style.borderLeftColor = 'var(--gold)';
        break;
      case 'error':
        el.style.borderLeftColor = 'var(--red)';
        el.style.background = 'rgba(230, 50, 40, 0.15)';
        break;
    }

    container.appendChild(el);

    const toasts = container.querySelectorAll('.toast');
    if (toasts.length > LAYOUT.MAX_TOASTS) {
      dismissToast(toasts[0]);
    }

    const timer = setTimeout(() => dismissToast(el), 4000);
    el._dismissTimer = timer;

    return id;
  }

  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    clearTimeout(el._dismissTimer);
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
  }

  return { toast, dismissToast };
}
