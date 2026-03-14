/**
 * gemini.js — Gemini API client (factory + public methods)
 *
 * Usage:
 *   import { createGeminiClient } from './gemini/gemini.js';
 *   const client = createGeminiClient(apiKey);
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { API } from '../utils/constants.js';
import { shuffleArray } from '../utils/helpers.js';
import { safeCall, getDailyUsage } from './gemini-rate-limit.js';
import { buildConnectionsPrompt, buildPathPrompt, buildPhotoPrompt, buildPuzzlePrompt } from './gemini-prompts.js';

const LOG_PREFIX = '[Gemini]';

/** Parse JSON, stripping optional markdown code-fence wrapper. */
function parseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Create a Gemini API client bound to the given key.
 * @param {string} apiKey
 * @returns {object}
 */
export function createGeminiClient(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('A valid Gemini API key is required.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  function getModel(temperature) {
    return genAI.getGenerativeModel({
      model: API.MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature },
    });
  }

  async function getConnections(personName, opts = {}) {
    const prompt = buildConnectionsPrompt(personName, opts);
    const model = getModel(0.3);

    const result = await safeCall('getConnections', async () => {
      const res = await model.generateContent(prompt);
      return parseJSON(res.response.text());
    });

    if (!Array.isArray(result)) {
      console.warn(LOG_PREFIX, 'getConnections: unexpected response, returning []');
      return [];
    }
    return result;
  }

  async function findConnectionPath(fromName, toName, maxSteps = 10) {
    const prompt = buildPathPrompt(fromName, toName, maxSteps);
    const model = getModel(0.1);
    const fallback = { found: false, path: [], relationships: [], degrees: 0 };

    const result = await safeCall('findConnectionPath', async () => {
      const res = await model.generateContent(prompt);
      return parseJSON(res.response.text());
    });

    if (!result || typeof result !== 'object') {
      console.warn(LOG_PREFIX, 'findConnectionPath: unexpected response');
      return fallback;
    }
    return { ...fallback, ...result };
  }

  async function analyzePhoto(base64Data, mimeType) {
    const prompt = buildPhotoPrompt();
    const model = getModel(0.2);
    const fallback = { people: [], description: 'Could not analyze photo.' };

    const result = await safeCall('analyzePhoto', async () => {
      const res = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } },
      ]);
      return parseJSON(res.response.text());
    });

    if (!result || typeof result !== 'object') {
      console.warn(LOG_PREFIX, 'analyzePhoto: unexpected response');
      return fallback;
    }
    if (!Array.isArray(result.people)) result.people = [];
    return result;
  }

  async function generatePuzzle(options = {}) {
    const difficulty = options.difficulty || 'medium';
    const prompt = buildPuzzlePrompt(difficulty);
    const model = getModel(0.4);

    const puzzle = await safeCall('generatePuzzle', async () => {
      const res = await model.generateContent(prompt);
      return parseJSON(res.response.text());
    });

    // Shuffle each step's options so green isn't always first
    if (Array.isArray(puzzle.steps)) {
      for (const step of puzzle.steps) {
        if (Array.isArray(step.options)) {
          shuffleArray(step.options);
        }
      }
    }

    puzzle.optimalLength = Array.isArray(puzzle.steps) ? puzzle.steps.length : 0;
    return puzzle;
  }

  return {
    getConnections,
    findConnectionPath,
    analyzePhoto,
    generatePuzzle,
    getDailyUsage,
  };
}
