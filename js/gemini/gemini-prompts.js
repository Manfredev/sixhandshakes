/**
 * gemini-prompts.js — Prompt template builders for Gemini API
 */

/** Build the getConnections prompt. */
export function buildConnectionsPrompt(personName, opts = {}) {
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

  return prompt;
}

/** Build the findConnectionPath prompt. */
export function buildPathPrompt(fromName, toName, maxSteps = 10) {
  return (
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
    "If you cannot find a fully verified path, set found to false."
  );
}

/** Build the analyzePhoto prompt. */
export function buildPhotoPrompt() {
  return (
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
    'If you cannot identify anyone, return { "people": [], "description": "..." }.'
  );
}

/** Build the generatePuzzle prompt. */
export function buildPuzzlePrompt(difficulty = 'medium') {
  const difficultyGuide = {
    easy: "Use very well-known public figures (household names). The optimal path should have exactly 3 intermediate people (3 links/steps from start to target).",
    medium: "Use moderately well-known public figures. The optimal path should have 3-4 intermediate people (3-4 links/steps from start to target).",
    hard: "Use more obscure but still recognizable public figures. The optimal path should have 4-5 intermediate people (4-5 links/steps from start to target).",
  };

  return (
    "You are a social network puzzle designer. Generate a complete Six Degrees puzzle.\n\n" +
    `Difficulty: ${difficulty}\n` +
    `${difficultyGuide[difficulty] || difficultyGuide.medium}\n\n` +
    "Instructions:\n" +
    "1. Pick two recognizable public figures as start and target.\n" +
    "2. Find the shortest verified chain of real-life meetings between them.\n" +
    "3. For each step on the optimal path, generate exactly 4 options. ALL four must be real verified connections:\n" +
    "   - 1 green: the next person on the optimal path (real verified meeting, shortest route to target)\n" +
    "   - 3 yellow: people who DID verifiably meet the current person but whose shortest path to the target is 1-3 steps longer than the green option\n" +
    "4. For each person provide: name, a brief descriptor (e.g. \"American filmmaker\"), and wikiTitle if known.\n" +
    "5. For ALL options, provide the relationship (how they met the current person).\n\n" +
    "ACCURACY IS PARAMOUNT. Every connection must be a real, documented meeting. There are NO trick questions or red herrings.\n" +
    "The challenge is efficiency — all four options are valid, only one is optimal.\n\n" +
    "Return JSON in this exact format:\n" +
    "{\n" +
    '  "start": { "name": "...", "descriptor": "...", "wikiTitle": "..." },\n' +
    '  "target": { "name": "...", "descriptor": "...", "wikiTitle": "..." },\n' +
    '  "optimalPath": [\n' +
    '    { "name": "...", "descriptor": "...", "wikiTitle": "...", "relationship": "how they met previous person" }\n' +
    "  ],\n" +
    '  "steps": [\n' +
    "    {\n" +
    '      "from": "current person name",\n' +
    '      "options": [\n' +
    '        { "name": "...", "descriptor": "...", "wikiTitle": "...", "color": "green", "relationship": "..." },\n' +
    '        { "name": "...", "descriptor": "...", "wikiTitle": "...", "color": "yellow", "relationship": "..." },\n' +
    '        { "name": "...", "descriptor": "...", "wikiTitle": "...", "color": "yellow", "relationship": "..." },\n' +
    '        { "name": "...", "descriptor": "...", "wikiTitle": "...", "color": "yellow", "relationship": "..." }\n' +
    "      ]\n" +
    "    }\n" +
    "  ]\n" +
    "}"
  );
}
