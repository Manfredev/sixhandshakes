/**
 * stats-display.js — Stats bar, share text/image export
 */

/**
 * Initialize stats and share system.
 * @param {object} els    Cached DOM elements
 * @param {function} toast  Toast function for feedback
 * @returns {object}  Stats/share API
 */
export function initStatsDisplay(els, toast) {
  const { statNodes, statEdges, handshakeCounter, handshakeNumber, handshakeLabel } = els;
  const shareActions = document.getElementById('share-actions');
  const btnShareText = document.getElementById('btn-share-text');
  const btnShareImage = document.getElementById('btn-share-image');

  let _shareChainData = null;
  let _shareDegrees = 0;

  // ── Animate count ──────────────────────────────────────────

  function animateCount(el, from, to, duration = 600) {
    const start = performance.now();
    const diff = to - from;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Stats bar ──────────────────────────────────────────────

  function updateStats(nodeCount, edgeCount) {
    statNodes.textContent = `${nodeCount} ${nodeCount === 1 ? 'person' : 'people'}`;
    statEdges.textContent = `${edgeCount} ${edgeCount === 1 ? 'connection' : 'connections'}`;
  }

  // ── Handshake counter ──────────────────────────────────────

  function showHandshakeCount(count) {
    handshakeCounter.classList.remove('hidden');
    const current = parseInt(handshakeNumber.textContent, 10) || 0;
    animateCount(handshakeNumber, current, count);
    handshakeLabel.textContent = count === 1 ? 'handshake' : 'handshakes';
  }

  function hideHandshakeCount() {
    handshakeCounter.classList.add('hidden');
  }

  // ── Share ──────────────────────────────────────────────────

  function setShareData(chainData, degrees) {
    _shareChainData = chainData;
    _shareDegrees = degrees;
  }

  function showShareActions() {
    if (shareActions) shareActions.classList.remove('hidden');
  }

  function hideShareActions() {
    if (shareActions) shareActions.classList.add('hidden');
  }

  function copyPathAsText() {
    if (!_shareChainData || !_shareChainData.length) return;
    const lastPerson = _shareChainData[_shareChainData.length - 1].name;
    const names = _shareChainData.map(p => p.name).join(' → ');
    const text = `I'm ${_shareDegrees} handshake${_shareDegrees !== 1 ? 's' : ''} from ${lastPerson}!\n\n${names}\n\nvia ${window.location.origin}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast('Copied to clipboard!', 'success');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Copied to clipboard!', 'success');
    } catch {
      toast('Copy failed — select and copy manually.', 'error');
    }
    document.body.removeChild(ta);
  }

  function exportPathAsImage() {
    if (!_shareChainData || !_shareChainData.length) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A0A0C';
    ctx.fillRect(0, 0, 1200, 630);

    const vignette = ctx.createRadialGradient(600, 315, 100, 600, 315, 600);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(230, 50, 40, 0.05)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.font = '24px "DM Serif Display", serif';
    ctx.fillStyle = '#9A9490';
    ctx.textAlign = 'center';
    ctx.fillText('SIX HANDSHAKES', 600, 60);

    const grad = ctx.createLinearGradient(540, 100, 660, 280);
    grad.addColorStop(0, '#E63228');
    grad.addColorStop(1, '#C4A35A');
    ctx.font = '120px "DM Serif Display", serif';
    ctx.fillStyle = grad;
    ctx.fillText(String(_shareDegrees), 600, 240);

    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#9A9490';
    ctx.fillText(_shareDegrees === 1 ? 'HANDSHAKE' : 'HANDSHAKES', 600, 270);

    const names = _shareChainData.map(p => p.name).join('  →  ');
    ctx.font = '16px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#E8E4DF';
    ctx.fillText(names, 600, 340);

    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#9A9490';
    let relY = 380;
    for (let i = 0; i < _shareChainData.length - 1; i++) {
      const rel = _shareChainData[i].relationship;
      if (rel) {
        ctx.fillText(`${_shareChainData[i].name} — ${rel}`, 600, relY);
        relY += 24;
      }
    }

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#9A949060';
    ctx.fillText(window.location.origin, 600, 600);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast('Image export failed.', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        const file = new File([blob], 'six-handshakes.png', { type: 'image/png' });
        navigator.share({ files: [file], title: 'Six Handshakes' }).catch(() => downloadBlob(url));
      } else {
        downloadBlob(url);
      }
    }, 'image/png');
  }

  function downloadBlob(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'six-handshakes.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Image saved!', 'success');
  }

  // Wire share buttons
  if (btnShareText) btnShareText.addEventListener('click', copyPathAsText);
  if (btnShareImage) btnShareImage.addEventListener('click', exportPathAsImage);

  return {
    updateStats,
    showHandshakeCount,
    hideHandshakeCount,
    setShareData,
    showShareActions,
    hideShareActions,
  };
}
