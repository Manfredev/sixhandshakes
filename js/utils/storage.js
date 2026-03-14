/**
 * storage.js — localStorage helpers for Six Handshakes
 */

const API_KEY_STORAGE = 'gemini-api-key';

/** Read and parse JSON from localStorage, returning fallback on failure. */
export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Write JSON to localStorage. */
export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Read API key from localStorage. */
export function readApiKey() {
  return localStorage.getItem(API_KEY_STORAGE);
}

/** Save API key to localStorage. */
export function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

/** Remove API key from localStorage. */
export function removeApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}
