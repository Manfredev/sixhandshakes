/**
 * empty-state.js — Show/hide empty state + typewriter
 */

/**
 * Initialize empty state.
 * @param {HTMLElement} emptyState  The #empty-state element
 * @returns {{ hideEmptyState, showEmptyState, startTypewriter }}
 */
export function initEmptyState(emptyState) {

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

  function startTypewriter() {
    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const phrases = [
      'Upload a photo with a famous person to begin',
      'Everyone is connected through at most 6 handshakes',
      'Who is your closest celebrity connection?',
      'Discover the chain of meetings between any two people',
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function step() {
      const phrase = phrases[phraseIdx];

      if (!deleting) {
        charIdx++;
        el.textContent = phrase.substring(0, charIdx);
        if (charIdx >= phrase.length) {
          setTimeout(() => { deleting = true; step(); }, 2500);
          return;
        }
        setTimeout(step, 50 + Math.random() * 30);
      } else {
        charIdx--;
        el.textContent = phrase.substring(0, charIdx);
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(step, 500);
          return;
        }
        setTimeout(step, 25);
      }
    }

    step();
  }

  return { hideEmptyState, showEmptyState, startTypewriter };
}
