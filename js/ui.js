/**
 * ui.js — UI components for Six Handshakes
 *
 * Manages side panel, handshake counter, toast notifications,
 * connection chain visualization, API key modal, and the
 * signature "reveal" animation.
 *
 * Usage:
 *   import { createUI } from './ui.js';
 *   const ui = createUI();
 *   ui.toast('Hello world', 'info');
 */

const LOG_PREFIX = '[UI]';

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Create a debounced version of `fn` that delays invocation until
 * `ms` milliseconds have passed since the last call.
 *
 * @param {function} fn
 * @param {number} ms
 * @returns {function}
 */
function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Animate a number counting up from `from` to `to` inside `el`.
 *
 * @param {HTMLElement} el   Element whose textContent will be updated
 * @param {number} from     Start value
 * @param {number} to       End value
 * @param {number} duration Milliseconds
 */
function animateCount(el, from, to, duration = 600) {
  const start = performance.now();
  const diff = to - from;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + diff * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create and return the UI controller. All DOM queries are performed
 * once and cached as local references.
 *
 * @returns {object} ui API
 */
export function createUI() {

  // ── Cached DOM references ───────────────────────────────────────

  const body            = document.body;
  const sidePanel       = document.getElementById('side-panel');
  const panelCloseBtn   = document.getElementById('panel-close');
  const searchInput     = document.getElementById('search-input');
  const targetInput     = document.getElementById('target-input');
  const btnFindPath     = document.getElementById('btn-find-path');
  const chainDisplay    = document.getElementById('chain-display');
  const personDetail    = document.getElementById('person-detail');
  const emptyState      = document.getElementById('empty-state');
  const handshakeCounter = document.getElementById('handshake-counter');
  const handshakeNumber = document.getElementById('handshake-number');
  const handshakeLabel  = document.getElementById('handshake-label');
  const statNodes       = document.getElementById('stat-nodes');
  const statEdges       = document.getElementById('stat-edges');
  const toastsContainer = document.getElementById('toasts');
  const apiKeyModal     = document.getElementById('api-key-modal');
  const apiKeyInput     = document.getElementById('api-key-input');
  const btnSaveKey      = document.getElementById('btn-save-key');
  const revealOverlay   = document.getElementById('reveal-overlay');
  const targetSection   = document.getElementById('target-section');

  // ── Toast state ─────────────────────────────────────────────────

  let toastIdCounter = 0;
  const MAX_TOASTS = 3;

  // ── Side Panel ──────────────────────────────────────────────────

  function openPanel() {
    body.classList.add('panel-open');
  }

  function closePanel() {
    body.classList.remove('panel-open');
  }

  // Close button
  panelCloseBtn.addEventListener('click', closePanel);

  // ── Person Detail ───────────────────────────────────────────────

  /**
   * Show person info in the detail section of the side panel.
   *
   * @param {object} person
   * @param {string} person.name
   * @param {string} [person.photoUrl]
   * @param {string} [person.wikiTitle]
   * @param {Array}  [person.connections]  Array of { name, relationship }
   */
  function showPersonDetail(person) {
    if (!person) {
      personDetail.innerHTML = '';
      return;
    }

    let html = '';

    // Photo
    if (person.photoUrl) {
      html += `<img src="${person.photoUrl}" alt="${person.name}" ` +
              `style="width:72px;height:72px;border-radius:50%;object-fit:cover;` +
              `border:2px solid var(--surface-up);margin-bottom:12px;display:block;">`;
    }

    // Name
    html += `<div class="detail-name">${escapeHtml(person.name)}</div>`;

    // Wikipedia link
    if (person.wikiTitle) {
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(person.wikiTitle)}`;
      html += `<a href="${wikiUrl}" target="_blank" rel="noopener" ` +
              `style="font-size:11px;color:var(--text-dim);text-decoration:none;` +
              `letter-spacing:0.5px;">` +
              `Wikipedia &rarr;</a>`;
    }

    // Connections list
    if (person.connections && person.connections.length > 0) {
      html += `<div style="margin-top:16px;">` +
              `<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;` +
              `color:var(--text-dim);margin-bottom:8px;">CONNECTIONS</div>`;
      html += `<ul style="list-style:none;padding:0;margin:0;">`;
      for (const conn of person.connections) {
        html += `<li style="font-size:12px;color:var(--text);padding:4px 0;` +
                `border-bottom:1px solid var(--surface-up);">` +
                `<span style="color:var(--gold);">${escapeHtml(conn.name)}</span>`;
        if (conn.relationship) {
          html += ` <span style="color:var(--text-dim);font-size:11px;">` +
                  `&mdash; ${escapeHtml(conn.relationship)}</span>`;
        }
        html += `</li>`;
      }
      html += `</ul></div>`;
    }

    personDetail.innerHTML = html;
  }

  // ── Connection Chain ────────────────────────────────────────────

  /**
   * Display a connection chain as a vertical sequence of person photos
   * connected by thin red lines.
   *
   * @param {Array} chain  Array of { name, photoUrl, relationship }
   *   `relationship` describes the link to the NEXT person in the chain.
   */
  function showChain(chain) {
    if (!chain || chain.length === 0) {
      clearChain();
      return;
    }

    let html = '';

    chain.forEach((entry, i) => {
      // Person node
      html += `<div class="chain-node">`;

      if (entry.photoUrl) {
        html += `<img class="chain-photo" src="${entry.photoUrl}" ` +
                `alt="${escapeHtml(entry.name)}">`;
      } else {
        const initial = entry.name ? entry.name.charAt(0).toUpperCase() : '?';
        html += `<div class="chain-photo-placeholder">${initial}</div>`;
      }

      html += `<div>`;
      html += `<div class="chain-name">${escapeHtml(entry.name)}</div>`;
      if (entry.relationship && i < chain.length - 1) {
        html += `<div class="chain-role">${escapeHtml(entry.relationship)}</div>`;
      }
      html += `</div>`;
      html += `</div>`;

      // Red connector line (between entries, not after the last)
      if (i < chain.length - 1) {
        html += `<div class="chain-connector"></div>`;
      }
    });

    chainDisplay.innerHTML = html;
  }

  function clearChain() {
    chainDisplay.innerHTML = '';
  }

  // ── Handshake Counter ───────────────────────────────────────────

  /**
   * Show the handshake counter with an animated count-up.
   * @param {number} count
   */
  function showHandshakeCount(count) {
    handshakeCounter.classList.remove('hidden');
    const current = parseInt(handshakeNumber.textContent, 10) || 0;
    animateCount(handshakeNumber, current, count);
    handshakeLabel.textContent = count === 1 ? 'handshake' : 'handshakes';
  }

  function hideHandshakeCount() {
    handshakeCounter.classList.add('hidden');
  }

  // ── Reveal Animation ────────────────────────────────────────────

  /**
   * The signature "reveal" animation: dim screen, show large number at center,
   * hold, shrink toward counter position, then show counter.
   *
   * Total duration ~2.5s.
   *
   * @param {number} count  The degrees-of-separation number to reveal
   */
  function triggerReveal(count) {
    // Clear any prior reveal content
    revealOverlay.innerHTML = '';
    revealOverlay.style.background = 'transparent';
    revealOverlay.style.pointerEvents = 'auto';

    // Step 1: Fade in dim background
    revealOverlay.style.transition = 'background 0.4s ease';
    // Force reflow so the transition fires
    void revealOverlay.offsetWidth;
    revealOverlay.style.background = 'rgba(10, 10, 12, 0.7)';

    // Step 2: Create the large number element
    const numberEl = document.createElement('div');
    numberEl.className = 'reveal-number';
    numberEl.textContent = count;
    numberEl.style.opacity = '0';
    numberEl.style.transform = 'scale(1.5)';
    numberEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    numberEl.style.background = 'linear-gradient(135deg, #E63228 30%, #C4A35A 100%)';
    numberEl.style.webkitBackgroundClip = 'text';
    numberEl.style.webkitTextFillColor = 'transparent';
    numberEl.style.backgroundClip = 'text';
    revealOverlay.appendChild(numberEl);

    // Step 2b: Fade the number in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        numberEl.style.opacity = '1';
        numberEl.style.transform = 'scale(1)';
      });
    });

    // Step 3: Hold for 1.5s, then shrink toward counter
    setTimeout(() => {
      // Get counter position for the shrink target
      const counterRect = handshakeCounter.getBoundingClientRect();
      const targetX = counterRect.left + counterRect.width / 2;
      const targetY = counterRect.top + counterRect.height / 2;

      // Current position (center of viewport)
      const currentX = window.innerWidth / 2;
      const currentY = window.innerHeight / 2;

      const dx = targetX - currentX;
      const dy = targetY - currentY;

      numberEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      numberEl.style.opacity = '0';
      numberEl.style.transform = `scale(0.3) translate(${dx}px, ${dy}px)`;
    }, 1500);

    // Step 4: Fade out overlay and show counter
    setTimeout(() => {
      revealOverlay.style.transition = 'background 0.4s ease';
      revealOverlay.style.background = 'transparent';
      revealOverlay.style.pointerEvents = 'none';

      // Clean up after transition
      setTimeout(() => {
        revealOverlay.innerHTML = '';
      }, 400);

      // Show the counter
      showHandshakeCount(count);
    }, 2200);
  }

  // ── Toasts ──────────────────────────────────────────────────────

  /**
   * Show a toast notification.
   *
   * @param {string} message
   * @param {'info'|'success'|'error'} [type='info']
   */
  function toast(message, type = 'info') {
    const id = ++toastIdCounter;

    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.toastId = id;
    el.textContent = message;

    // Type-specific styling
    switch (type) {
      case 'success':
        el.style.borderLeftColor = 'var(--gold)';
        break;
      case 'error':
        el.style.borderLeftColor = 'var(--red)';
        el.style.background = 'rgba(230, 50, 40, 0.15)';
        break;
      case 'info':
      default:
        // Default red left border from CSS
        break;
    }

    toastsContainer.appendChild(el);

    // Enforce max visible toasts — remove oldest
    const toasts = toastsContainer.querySelectorAll('.toast');
    if (toasts.length > MAX_TOASTS) {
      dismissToast(toasts[0]);
    }

    // Auto-dismiss after 4s
    const timer = setTimeout(() => dismissToast(el), 4000);
    el._dismissTimer = timer;

    return id;
  }

  /**
   * Dismiss a toast element with slide-out animation.
   * @param {HTMLElement} el
   */
  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    clearTimeout(el._dismissTimer);
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
  }

  // ── API Key Modal ───────────────────────────────────────────────

  /**
   * Show the API key modal and return a Promise that resolves with
   * the entered key when the user submits, or rejects if dismissed.
   *
   * @returns {Promise<string>}
   */
  function showApiKeyModal() {
    return new Promise((resolve, reject) => {
      apiKeyModal.classList.remove('hidden');
      apiKeyInput.value = '';
      apiKeyInput.focus();

      function handleSubmit() {
        const key = apiKeyInput.value.trim();
        if (!key) return;
        cleanup();
        apiKeyModal.classList.add('hidden');
        resolve(key);
      }

      function handleDismiss(e) {
        // Only dismiss if clicking the backdrop, not the modal content
        if (e.target === apiKeyModal) {
          cleanup();
          apiKeyModal.classList.add('hidden');
          reject(new Error('API key modal dismissed'));
        }
      }

      function handleKeydown(e) {
        if (e.key === 'Enter') {
          handleSubmit();
        } else if (e.key === 'Escape') {
          cleanup();
          apiKeyModal.classList.add('hidden');
          reject(new Error('API key modal dismissed'));
        }
      }

      function cleanup() {
        btnSaveKey.removeEventListener('click', handleSubmit);
        apiKeyModal.removeEventListener('click', handleDismiss);
        apiKeyInput.removeEventListener('keydown', handleKeydown);
      }

      btnSaveKey.addEventListener('click', handleSubmit);
      apiKeyModal.addEventListener('click', handleDismiss);
      apiKeyInput.addEventListener('keydown', handleKeydown);
    });
  }

  function hideApiKeyModal() {
    apiKeyModal.classList.add('hidden');
  }

  // ── Search & Target Inputs ──────────────────────────────────────

  /**
   * Register a callback for the search input. Fires on Enter key
   * immediately, or after 300ms debounce on typing.
   *
   * @param {function} callback — receives (query: string)
   */
  function onSearch(callback) {
    const debouncedCb = debounce((query) => {
      if (query.trim()) callback(query.trim());
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedCb(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) callback(query);
      }
    });
  }

  /**
   * Register a callback for the target input + Find Path button.
   *
   * @param {function} callback — receives (targetName: string)
   */
  function onTargetSet(callback) {
    // Enable/disable Find Path button based on input content
    targetInput.addEventListener('input', () => {
      btnFindPath.disabled = !targetInput.value.trim();
    });

    function handleFindPath() {
      const name = targetInput.value.trim();
      if (!name) return;
      callback(name);
    }

    btnFindPath.addEventListener('click', handleFindPath);

    targetInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleFindPath();
      }
    });
  }

  /**
   * Update the target section with a status message.
   *
   * @param {string} status  e.g. 'Searching...', 'Path found!', 'No path found'
   */
  function setTargetStatus(status) {
    // Find or create a status element within the target section
    let statusEl = targetSection.querySelector('.target-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'target-status';
      statusEl.style.fontSize = '11px';
      statusEl.style.marginTop = '8px';
      statusEl.style.letterSpacing = '0.5px';
      targetSection.appendChild(statusEl);
    }

    statusEl.textContent = status;

    // Color based on status content
    if (status.toLowerCase().includes('found!') || status.toLowerCase().includes('success')) {
      statusEl.style.color = 'var(--gold)';
    } else if (status.toLowerCase().includes('no path') || status.toLowerCase().includes('error')) {
      statusEl.style.color = 'var(--red)';
    } else {
      statusEl.style.color = 'var(--text-dim)';
    }
  }

  // ── Empty State ─────────────────────────────────────────────────

  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.transition = 'opacity 0.4s ease';
      emptyState.style.opacity = '0';
      setTimeout(() => {
        emptyState.style.display = 'none';
      }, 400);
    }
  }

  function showEmptyState() {
    if (emptyState) {
      emptyState.style.display = '';
      emptyState.style.opacity = '0';
      requestAnimationFrame(() => {
        emptyState.style.transition = 'opacity 0.4s ease';
        emptyState.style.opacity = '1';
      });
    }
  }

  // ── Stats ───────────────────────────────────────────────────────

  /**
   * Update the stats bar with current node and edge counts.
   *
   * @param {number} nodeCount
   * @param {number} edgeCount
   */
  function updateStats(nodeCount, edgeCount) {
    statNodes.textContent = `${nodeCount} ${nodeCount === 1 ? 'person' : 'people'}`;
    statEdges.textContent = `${edgeCount} ${edgeCount === 1 ? 'connection' : 'connections'}`;
  }

  // ── HTML escaping ───────────────────────────────────────────────

  /**
   * Escape HTML entities to prevent XSS in user-provided strings.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Public API ──────────────────────────────────────────────────

  return {
    // Side panel
    openPanel,
    closePanel,
    showPersonDetail,
    showChain,
    clearChain,

    // Handshake counter
    showHandshakeCount,
    hideHandshakeCount,
    triggerReveal,

    // Toasts
    toast,

    // API Key modal
    showApiKeyModal,
    hideApiKeyModal,

    // Search & target
    onSearch,
    onTargetSet,
    setTargetStatus,

    // Empty state
    hideEmptyState,
    showEmptyState,

    // Stats
    updateStats,
  };
}
