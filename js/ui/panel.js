/**
 * panel.js — Side panel open/close, mobile swipe, person detail, chain
 */

import { escapeHtml, debounce } from '../utils/helpers.js';

/**
 * Initialize the side panel.
 * @param {object} els  Cached DOM elements
 * @returns {object}  Panel API
 */
export function initPanel(els) {
  const { body, sidePanel, panelCloseBtn, searchInput, targetInput,
          btnFindPath, chainDisplay, personDetail, targetSection } = els;

  // ── Open / Close ──────────────────────────────────────────────

  function openPanel()  { body.classList.add('panel-open'); }
  function closePanel() { body.classList.remove('panel-open'); }

  panelCloseBtn.addEventListener('click', closePanel);

  // ── Mobile swipe-to-dismiss ───────────────────────────────────

  let _touchStartY = 0;
  let _touchDragging = false;

  sidePanel.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    _touchStartY = e.touches[0].clientY;
    _touchDragging = true;
    sidePanel.style.transition = 'none';
  }, { passive: true });

  sidePanel.addEventListener('touchmove', (e) => {
    if (!_touchDragging || window.innerWidth > 768) return;
    const delta = e.touches[0].clientY - _touchStartY;
    if (delta > 0) {
      sidePanel.style.transform = `translateY(${delta}px)`;
    }
  }, { passive: true });

  sidePanel.addEventListener('touchend', (e) => {
    if (!_touchDragging || window.innerWidth > 768) return;
    _touchDragging = false;
    const delta = e.changedTouches[0].clientY - _touchStartY;
    sidePanel.style.transition = '';
    if (delta > 100) {
      closePanel();
    } else {
      sidePanel.style.transform = '';
    }
  }, { passive: true });

  // ── Person Detail ─────────────────────────────────────────────

  function showPersonDetail(person) {
    if (!person) {
      personDetail.innerHTML = '';
      return;
    }

    let html = '';

    if (person.photoUrl) {
      html += `<img src="${person.photoUrl}" alt="${person.name}" ` +
              `style="width:72px;height:72px;border-radius:50%;object-fit:cover;` +
              `border:2px solid var(--surface-up);margin-bottom:12px;display:block;">`;
    }

    html += `<div class="detail-name">${escapeHtml(person.name)}</div>`;

    if (person.wikiTitle) {
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(person.wikiTitle)}`;
      html += `<a href="${wikiUrl}" target="_blank" rel="noopener" ` +
              `style="font-size:11px;color:var(--text-dim);text-decoration:none;` +
              `letter-spacing:0.5px;">` +
              `Wikipedia &rarr;</a>`;
    }

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

  // ── Connection Chain ────────────────────────────────────────

  function showChain(chain) {
    if (!chain || chain.length === 0) {
      clearChain();
      return;
    }

    let html = '';

    chain.forEach((entry, i) => {
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
      html += `</div></div>`;

      if (i < chain.length - 1) {
        html += `<div class="chain-connector"></div>`;
      }
    });

    chainDisplay.innerHTML = html;
  }

  function clearChain() {
    chainDisplay.innerHTML = '';
  }

  // ── Search & Target Inputs ──────────────────────────────────

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

  function onTargetSet(callback) {
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
      if (e.key === 'Enter') handleFindPath();
    });
  }

  function setTargetStatus(status) {
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

    if (status.toLowerCase().includes('found!') || status.toLowerCase().includes('success')) {
      statusEl.style.color = 'var(--gold)';
    } else if (status.toLowerCase().includes('no path') || status.toLowerCase().includes('error')) {
      statusEl.style.color = 'var(--red)';
    } else {
      statusEl.style.color = 'var(--text-dim)';
    }
  }

  return {
    openPanel,
    closePanel,
    showPersonDetail,
    showChain,
    clearChain,
    onSearch,
    onTargetSet,
    setTargetStatus,
  };
}
