/**
 * reveal.js — Reveal animation, camera flash, particles
 */

/**
 * Initialize reveal system.
 * @param {object} els  Cached DOM elements
 * @param {function} showHandshakeCount  Callback to show counter
 * @returns {{ triggerReveal }}
 */
export function initReveal(els, showHandshakeCount) {
  const { revealOverlay, handshakeCounter } = els;

  function spawnParticles(container, count, originX, originY) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'reveal-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = 80 + Math.random() * 200;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.width = `${3 + Math.random() * 3}px`;
      particle.style.height = particle.style.width;
      particle.style.background = i % 2 === 0 ? 'var(--red)' : 'var(--gold)';
      container.appendChild(particle);
    }
    setTimeout(() => {
      container.querySelectorAll('.reveal-particle').forEach(p => p.remove());
    }, 1500);
  }

  function triggerReveal(count) {
    revealOverlay.innerHTML = '';
    revealOverlay.style.background = 'transparent';
    revealOverlay.style.pointerEvents = 'auto';

    // Camera flash
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.background = '#FFFFFF';
    flash.style.opacity = '0';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '81';
    flash.style.animation = 'camera-flash 0.3s ease-out forwards';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 350);

    // Step 1: Fade in dim background
    revealOverlay.style.transition = 'background 0.4s ease';
    void revealOverlay.offsetWidth;
    revealOverlay.style.background = 'rgba(10, 10, 12, 0.7)';

    // Step 2: Large number
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

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        numberEl.style.opacity = '1';
        numberEl.style.transform = 'scale(1)';
        spawnParticles(revealOverlay, 35, window.innerWidth / 2, window.innerHeight / 2);
      });
    });

    // Step 3: Shrink toward counter
    setTimeout(() => {
      const counterRect = handshakeCounter.getBoundingClientRect();
      const targetX = counterRect.left + counterRect.width / 2;
      const targetY = counterRect.top + counterRect.height / 2;
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

      setTimeout(() => {
        revealOverlay.innerHTML = '';
      }, 400);

      showHandshakeCount(count);
    }, 2200);
  }

  return { triggerReveal };
}
