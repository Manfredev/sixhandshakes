/**
 * gemini.js — Gemini API client for Six Handshakes
 *
 * Provides AI-powered social-graph exploration: connection discovery,
 * pathfinding between two people, and photo-based person identification.
 *
 * Usage:
 *   import { createGeminiClient } from "./gemini.js";
 *   const client = createGeminiClient(apiKey);
 *   const connections = await client.getConnections("Ada Lovelace");
 */

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const MODEL = "gemini-2.5-flash";
const LOG_PREFIX = "[Gemini]";

/**
 * Create a Gemini API client bound to the given key.
 *
 * @param {string} apiKey  Google AI Studio API key
 * @returns {{ getConnections, findConnectionPath, analyzePhoto }}
 */
export function createGeminiClient(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("A valid Gemini API key is required.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // ---------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------

  /**
   * Safely parse a JSON string returned by the model.  Gemini *usually*
   * returns clean JSON when responseMimeType is set, but occasionally wraps
   * it in a markdown code fence — strip that if present.
   */
  function parseJSON(text) {
    let cleaned = text.trim();
    // Strip optional ```json ... ``` wrapper
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    return JSON.parse(cleaned);
  }

  /**
   * Wrap an async API call with consistent error handling.
   * Re-throws auth errors so the app layer can re-prompt for a key.
   */
  async function safeCall(label, fn) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || String(err);
      const status = err?.status || err?.httpStatus;

      console.error(LOG_PREFIX, label, "status:", status, "message:", msg, err);

      // Surface auth errors distinctly so app.js can re-prompt
      if (
        msg.includes("API key") ||
        msg.includes("API_KEY_INVALID") ||
        status === 401 ||
        status === 403
      ) {
        const authError = new Error("Invalid or expired Gemini API key.");
        authError.name = "GeminiAuthError";
        throw authError;
      }

      // Surface rate-limit / quota errors
      if (
        status === 429 ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota")
      ) {
        const rlError = new Error(msg);
        rlError.name = "GeminiRateLimitError";
        throw rlError;
      }

      // For any other error, propagate with the real message so the user sees it
      const wrapped = new Error(msg);
      wrapped.name = "GeminiError";
      throw wrapped;
    }
  }

  // ---------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------

  /**
   * Discover 2-3 famous people who have verifiably met `personName`.
   *
   * @param {string} personName
   * @param {object}  [opts]
   * @param {string[]} [opts.exclude]     Names already in the graph
   * @param {string}   [opts.targetBias]  Bias toward this person's circle
   * @returns {Promise<Array<{name:string, relationship:string, confidence:string, wikiTitle:string}>>}
   */
  async function getConnections(personName, opts = {}) {
    const { exclude = [], targetBias } = opts;

    let prompt =
      "You are a historian and social network expert. Given a person, " +
      "return 2-3 famous people who have VERIFIABLY met them in real life. " +
      "Each connection must be documented (photos together, interviews, " +
      "known collaborations, events).\n\n" +
      `Person: ${personName}\n`;

    if (exclude.length) {
      prompt += `Exclude these people (already in graph): ${exclude.join(", ")}\n`;
    }
    if (targetBias) {
      prompt += `If possible, bias toward people connected to: ${targetBias}\n`;
    }

    prompt +=
      "\nDo NOT fabricate meetings. If you cannot find 2-3 verified connections, " +
      "return fewer or an empty array.\n\n" +
      "Return JSON array:\n" +
      "[\n" +
      "  {\n" +
      '    "name": "Full Name",\n' +
      '    "relationship": "Brief description of how they met/know each other (1 sentence)",\n' +
      '    "confidence": "high" | "medium",\n' +
      '    "wikiTitle": "Wikipedia article title if known, or null"\n' +
      "  }\n" +
      "]\n\n" +
      "wikiTitle is optional — only include it if you know the exact Wikipedia article title.\n" +
      "Only include people you are highly confident have met in person. " +
      "Prefer well-documented meetings.";

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const result = await safeCall("getConnections", async () => {
      const res = await model.generateContent(prompt);
      return parseJSON(res.response.text());
    });

    if (!Array.isArray(result)) {
      console.warn(LOG_PREFIX, "getConnections: unexpected response, returning []");
      return [];
    }
    return result;
  }

  /**
   * Find the shortest chain of famous people connecting two individuals.
   *
   * @param {string} fromName
   * @param {string} toName
   * @param {number} [maxSteps=10]
   * @returns {Promise<{found:boolean, path:Array, relationships:string[], degrees:number}>}
   */
  async function findConnectionPath(fromName, toName, maxSteps = 10) {
    const prompt =
      "You are a social network pathfinder. Find the shortest chain of famous people\n" +
      `connecting ${fromName} to ${toName}, where each adjacent pair has VERIFIABLY met\n` +
      "in real life.\n\n" +
      "ACCURACY IS PARAMOUNT. Every connection in the chain must be a real, documented\n" +
      "meeting — not a guess, not a plausible-but-unverified claim. If you are not\n" +
      "certain two people have met, do NOT include that link. Returning found:false is\n" +
      "ALWAYS better than including a single uncertain connection.\n\n" +
      `Maximum chain length: ${maxSteps} people (including start and end).\n` +
      "Prefer shorter paths, but never sacrifice accuracy for brevity. A longer\n" +
      "accurate path is always better than a shorter fabricated one.\n\n" +
      "Rules for each connection:\n" +
      "- Must be a documented, real-life meeting (photo evidence, recorded event,\n" +
      "  known collaboration, interview together, etc.)\n" +
      "- The relationship description must be a single factual sentence citing the\n" +
      '  specific context (e.g. "Met at the 1985 Live Aid concert" not "They were\n' +
      '  both musicians in the 1980s")\n' +
      "- Do NOT include reasoning, hedging, or commentary in relationship text\n" +
      "- If a person died before the other was born, they obviously never met\n\n" +
      "Return JSON:\n" +
      '{ "found": true/false, "path": [...], "relationships": [...], "degrees": number }\n\n' +
      "wikiTitle is optional — only include it if you know the exact Wikipedia article title.\n" +
      "If you cannot find a fully verified path, set found to false.";

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const fallback = { found: false, path: [], relationships: [], degrees: 0 };

    const result = await safeCall("findConnectionPath", async () => {
      const res = await model.generateContent(prompt);
      return parseJSON(res.response.text());
    });

    if (!result || typeof result !== "object") {
      console.warn(LOG_PREFIX, "findConnectionPath: unexpected response");
      return fallback;
    }
    return { ...fallback, ...result };
  }

  /**
   * Identify famous people in an uploaded photo.
   *
   * @param {string} base64Data  Raw base64 image data (no data-URL prefix)
   * @param {string} mimeType    e.g. "image/jpeg"
   * @returns {Promise<{people:Array<{name:string, wikiTitle:string}>, description:string}>}
   */
  async function analyzePhoto(base64Data, mimeType) {
    const prompt =
      "Look at this photo. Identify any famous or well-known people " +
      "visible in the image. For each famous person identified, provide " +
      "their full name and Wikipedia article title.\n\n" +
      "Return JSON:\n" +
      "{\n" +
      '  "people": [\n' +
      '    { "name": "Full Name", "wikiTitle": "Wikipedia article title if known, or null" }\n' +
      "  ],\n" +
      '  "description": "Brief description of the photo context"\n' +
      "}\n\n" +
      "wikiTitle is optional — only include it if you know the exact Wikipedia article title.\n" +
      'If you cannot identify anyone, return { "people": [], "description": "..." }.';

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const fallback = { people: [], description: "Could not analyze photo." };

    const result = await safeCall("analyzePhoto", async () => {
      const res = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ]);
      return parseJSON(res.response.text());
    });

    if (!result || typeof result !== "object") {
      console.warn(LOG_PREFIX, "analyzePhoto: unexpected response");
      return fallback;
    }

    // Gemini may refuse face identification due to safety policies —
    // ensure people is always an array.
    if (!Array.isArray(result.people)) {
      result.people = [];
    }
    return result;
  }

  // ---------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------

  return {
    getConnections,
    findConnectionPath,
    analyzePhoto,
  };
}
