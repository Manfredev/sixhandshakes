/**
 * gemini-rate-limit.js — safeCall, RPM throttle, RPD counter, error classifiers
 */

import { delay, todayString } from '../utils/helpers.js';
import { API } from '../utils/constants.js';

const LOG_PREFIX = '[Gemini]';

/** Sliding window of request timestamps (epoch ms) for RPM throttle */
const requestTimestamps = [];

// ── Daily usage counter (localStorage) ──────────────────────────

function loadDailyUsage() {
  try {
    const raw = localStorage.getItem(API.RPD_STORAGE_KEY);
    if (!raw) return { date: todayString(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayString()) return { date: todayString(), count: 0 };
    return parsed;
  } catch {
    return { date: todayString(), count: 0 };
  }
}

function saveDailyUsage(usage) {
  localStorage.setItem(API.RPD_STORAGE_KEY, JSON.stringify(usage));
}

function checkDailyLimit() {
  const usage = loadDailyUsage();
  if (usage.count >= API.RPD_LIMIT) {
    const err = new Error("Daily limit reached (20 requests). Resets tomorrow.");
    err.name = "GeminiRateLimitError";
    throw err;
  }
  if (usage.count >= API.RPD_WARNING) {
    console.warn(LOG_PREFIX, `Daily usage warning: ${usage.count}/${API.RPD_LIMIT} requests used today.`);
  }
}

function incrementDailyCounter() {
  const usage = loadDailyUsage();
  usage.count += 1;
  saveDailyUsage(usage);
  console.log(LOG_PREFIX, `Daily usage: ${usage.count}/${API.RPD_LIMIT}`);
}

/**
 * Public accessor for daily usage stats.
 * @returns {{ used: number, limit: number, remaining: number }}
 */
export function getDailyUsage() {
  const usage = loadDailyUsage();
  return { used: usage.count, limit: API.RPD_LIMIT, remaining: API.RPD_LIMIT - usage.count };
}

// ── RPM throttle (sliding window) ──────────────────────────────

async function throttleRPM() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] <= now - 60_000) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= API.RPM_LIMIT) {
    const waitMs = requestTimestamps[0] - (now - 60_000) + 100;
    console.log(LOG_PREFIX, `RPM limit reached, waiting ${Math.round(waitMs / 1000)}s...`);
    await delay(waitMs);
    const after = Date.now();
    while (requestTimestamps.length && requestTimestamps[0] <= after - 60_000) {
      requestTimestamps.shift();
    }
  }
  requestTimestamps.push(Date.now());
}

// ── Error classification ──────────────────────────────────────

function isAuthError(msg, status) {
  return (
    msg.includes("API key") ||
    msg.includes("API_KEY_INVALID") ||
    status === 401 ||
    status === 403
  );
}

function isRateLimitError(msg, status) {
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

// ── safeCall — rate-limited with retry ──────────────────────────

/**
 * Wrap an async API call with rate limiting, retry, and error handling.
 * @param {string} label  For logging
 * @param {function} fn   Async function to call
 * @returns {Promise<*>}
 */
export async function safeCall(label, fn) {
  checkDailyLimit();
  await throttleRPM();

  let lastErr = null;
  for (let attempt = 0; attempt <= API.MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      incrementDailyCounter();
      return result;
    } catch (err) {
      lastErr = err;
      const msg = err?.message || String(err);
      const status = err?.status || err?.httpStatus;

      console.error(LOG_PREFIX, label, `attempt ${attempt + 1}`, "status:", status, "message:", msg);

      if (isAuthError(msg, status)) {
        const authError = new Error("Invalid or expired Gemini API key.");
        authError.name = "GeminiAuthError";
        throw authError;
      }

      if (isRateLimitError(msg, status) && attempt < API.MAX_RETRIES) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.warn(LOG_PREFIX, label, `Rate limited. Retrying in ${backoff / 1000}s... (${attempt + 1}/${API.MAX_RETRIES})`);
        await delay(backoff);
        continue;
      }

      if (isRateLimitError(msg, status)) {
        const rlError = new Error("Too many requests. Please wait a minute and try again.");
        rlError.name = "GeminiRateLimitError";
        throw rlError;
      }

      const wrapped = new Error(msg);
      wrapped.name = "GeminiError";
      throw wrapped;
    }
  }

  const fallback = new Error(lastErr?.message || "Request failed after retries.");
  fallback.name = "GeminiError";
  throw fallback;
}
