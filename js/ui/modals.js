/**
 * modals.js — API key modal
 */

/**
 * Initialize the API key modal.
 * @param {object} els  Cached DOM elements
 * @returns {{ showApiKeyModal, hideApiKeyModal }}
 */
export function initModals(els) {
  const { apiKeyModal, apiKeyInput, btnSaveKey } = els;

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

  return { showApiKeyModal, hideApiKeyModal };
}
