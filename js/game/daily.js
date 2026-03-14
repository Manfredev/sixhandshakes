/**
 * daily.js — Daily puzzle manager for Six Handshakes
 *
 * Usage:
 *   import { createDailyManager } from './game/daily.js';
 *   const daily = createDailyManager(gemini, wikipedia);
 */

import { DEMO_PUZZLES } from '../data/demo-puzzles.js';
import { todayString, yesterdayString, shuffleArray } from '../utils/helpers.js';
import { readStorage, writeStorage } from '../utils/storage.js';

const LOG_PREFIX = '[Daily]';
const EPOCH = '2026-03-13';

export function createDailyManager(gemini, wikipedia) {

  // ── Option shuffling (for demo puzzles) ─────────────────────

  function shuffleOptions(puzzle) {
    if (!Array.isArray(puzzle.steps)) return;
    for (const step of puzzle.steps) {
      if (Array.isArray(step.options)) {
        shuffleArray(step.options);
      }
    }
  }

  // ── Photo resolution ────────────────────────────────────────

  async function resolveAllPhotos(puzzle) {
    const people = [];
    const seen = new Set();

    function addPerson(person) {
      if (!person || !person.wikiTitle || seen.has(person.wikiTitle)) return;
      seen.add(person.wikiTitle);
      people.push(person);
    }

    addPerson(puzzle.start);
    addPerson(puzzle.target);
    if (puzzle.optimalPath) {
      for (const person of puzzle.optimalPath) addPerson(person);
    }
    if (puzzle.steps) {
      for (const step of puzzle.steps) {
        if (step.options) {
          for (const option of step.options) addPerson(option);
        }
      }
    }

    const results = await Promise.allSettled(
      people.map(async (person) => {
        const url = await wikipedia.getPersonPhoto(person.wikiTitle);
        person.photoUrl = url;
      })
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.warn(LOG_PREFIX, `Photo fetch failed for ${people[i].wikiTitle}:`, results[i].reason);
      }
    }
  }

  // ── Public methods ──────────────────────────────────────────

  async function getTodaysPuzzle() {
    const today = todayString();
    const cacheKey = `daily-puzzle-${today}`;

    let puzzle;

    if (!gemini) {
      const idx = (getPuzzleNumber() - 1) % DEMO_PUZZLES.length;
      puzzle = structuredClone(DEMO_PUZZLES[idx]);
      shuffleOptions(puzzle);
      console.log(LOG_PREFIX, 'Using demo puzzle', idx);
    } else {
      const cached = readStorage(cacheKey, null);
      if (cached) {
        console.log(LOG_PREFIX, 'Returning cached puzzle for', today);
        return cached;
      }
      console.log(LOG_PREFIX, 'Generating new puzzle for', today);
      puzzle = await gemini.generatePuzzle();
      await resolveAllPhotos(puzzle);
      writeStorage(cacheKey, puzzle);
      console.log(LOG_PREFIX, 'Cached puzzle for', today);
    }

    puzzle.date = today;
    puzzle.puzzleNumber = getPuzzleNumber();
    return puzzle;
  }

  let _lastPracticeIdx = -1;

  function hasPlayedToday() {
    const today = todayString();
    return localStorage.getItem(`daily-result-${today}`) !== null;
  }

  function getPuzzleNumber() {
    const now = new Date();
    const epoch = new Date(EPOCH + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = today - epoch;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  function getStreak() {
    const streak = readStorage('daily-streak', { current: 0, max: 0, lastDate: null });
    const yesterday = yesterdayString();
    if (streak.lastDate === yesterday || streak.lastDate === todayString()) {
      return { current: streak.current, max: streak.max };
    }
    return { current: 0, max: streak.max };
  }

  function recordResult(result) {
    const today = todayString();
    const yesterday = yesterdayString();

    writeStorage(`daily-result-${today}`, result);

    const streak = readStorage('daily-streak', { current: 0, max: 0, lastDate: null });
    if (streak.lastDate === yesterday || streak.lastDate === today) {
      if (streak.lastDate !== today) streak.current++;
    } else {
      streak.current = 1;
    }
    if (streak.current > streak.max) streak.max = streak.current;
    streak.lastDate = today;
    writeStorage('daily-streak', streak);

    const stats = readStorage('daily-stats', {
      played: 0, wins: 0,
      distribution: { '0': 0, '1': 0, '2': 0, '3': 0, '4+': 0 },
    });
    stats.played++;
    stats.wins++;
    const bucket = result.scoreOverOptimal >= 4 ? '4+' : String(result.scoreOverOptimal);
    stats.distribution[bucket] = (stats.distribution[bucket] || 0) + 1;
    writeStorage('daily-stats', stats);

    console.log(LOG_PREFIX, 'Recorded result:', result.grade, 'streak:', streak.current);
  }

  function getStats() {
    const stats = readStorage('daily-stats', {
      played: 0, wins: 0,
      distribution: { '0': 0, '1': 0, '2': 0, '3': 0, '4+': 0 },
    });
    const streak = getStreak();
    return {
      played: stats.played,
      winPct: stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0,
      currentStreak: streak.current,
      maxStreak: streak.max,
      distribution: stats.distribution,
    };
  }

  async function generatePracticePuzzle(difficulty) {
    console.log(LOG_PREFIX, 'Generating practice puzzle', difficulty || '');

    let puzzle;
    if (!gemini) {
      let idx;
      if (DEMO_PUZZLES.length <= 1) {
        idx = 0;
      } else {
        do {
          idx = Math.floor(Math.random() * DEMO_PUZZLES.length);
        } while (idx === _lastPracticeIdx);
      }
      _lastPracticeIdx = idx;
      puzzle = structuredClone(DEMO_PUZZLES[idx]);
      shuffleOptions(puzzle);
      console.log(LOG_PREFIX, 'Using demo puzzle', idx);
    } else {
      puzzle = await gemini.generatePuzzle(difficulty);
      await resolveAllPhotos(puzzle);
    }

    puzzle.date = null;
    puzzle.puzzleNumber = null;
    return puzzle;
  }

  return {
    getTodaysPuzzle,
    hasPlayedToday,
    getPuzzleNumber,
    getStreak,
    recordResult,
    getStats,
    generatePracticePuzzle,
  };
}
