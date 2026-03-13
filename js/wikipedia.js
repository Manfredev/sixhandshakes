/**
 * wikipedia.js — Wikipedia / Wikimedia photo & search service
 *
 * Fetches person thumbnails and provides search/autocomplete against
 * the English Wikipedia API.  Results are cached in memory to avoid
 * redundant network requests.
 *
 * Usage:
 *   import { createWikipediaService } from "./wikipedia.js";
 *   const wiki = createWikipediaService();
 *   const url  = await wiki.getPersonPhoto("Ada_Lovelace");
 */

const REST_BASE = "https://en.wikipedia.org/api/rest_v1";
const ACTION_BASE = "https://en.wikipedia.org/w/api.php";
const LOG_PREFIX = "[Wikipedia]";

/**
 * Create a Wikipedia service instance with its own internal cache.
 *
 * @returns {{ getPersonPhoto, searchPerson }}
 */
export function createWikipediaService() {
  /**
   * Cache for thumbnail URLs.
   * Keys are wiki titles; values are URL strings or null (explicit miss).
   * @type {Map<string, string|null>}
   */
  const photoCache = new Map();

  // ---------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------

  /**
   * Fetch the Wikipedia thumbnail for a person (or any article).
   *
   * Uses the REST page/summary endpoint which follows redirects
   * automatically and returns structured JSON including a thumbnail.
   *
   * @param {string} wikiTitle  Wikipedia article title (e.g. "Ada_Lovelace")
   * @returns {Promise<string|null>}  Thumbnail URL or null
   */
  async function getPersonPhoto(wikiTitle) {
    if (!wikiTitle) return null;

    // Normalize: the REST API accepts spaces or underscores, but we key
    // the cache on the raw title to keep lookups consistent.
    const cacheKey = wikiTitle;

    if (photoCache.has(cacheKey)) {
      return photoCache.get(cacheKey);
    }

    try {
      const url = `${REST_BASE}/page/summary/${encodeURIComponent(wikiTitle)}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(
          LOG_PREFIX,
          `getPersonPhoto: ${res.status} for "${wikiTitle}"`
        );
        photoCache.set(cacheKey, null);
        return null;
      }

      const data = await res.json();
      const thumbUrl = data?.thumbnail?.source ?? null;

      photoCache.set(cacheKey, thumbUrl);
      return thumbUrl;
    } catch (err) {
      console.error(LOG_PREFIX, "getPersonPhoto error:", err);
      photoCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Search Wikipedia for articles matching `query`.
   *
   * Useful for autocomplete and validating person names before adding
   * them to the graph.
   *
   * @param {string} query  Free-text search query
   * @returns {Promise<Array<{title:string, snippet:string}>>}
   */
  async function searchPerson(query) {
    if (!query || !query.trim()) return [];

    try {
      const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: "0",
        srlimit: "5",
        format: "json",
        origin: "*", // required for CORS on the action API
      });

      const res = await fetch(`${ACTION_BASE}?${params}`);

      if (!res.ok) {
        console.warn(LOG_PREFIX, `searchPerson: ${res.status} for "${query}"`);
        return [];
      }

      const data = await res.json();
      const results = data?.query?.search ?? [];

      return results.map((item) => ({
        title: item.title,
        snippet: item.snippet,
      }));
    } catch (err) {
      console.error(LOG_PREFIX, "searchPerson error:", err);
      return [];
    }
  }

  /**
   * Search Wikipedia by name and return the best match's thumbnail.
   *
   * Composes searchPerson() + getPersonPhoto(): search for the name,
   * take the top result, fetch its thumbnail.
   *
   * @param {string} personName  Free-text person name
   * @returns {Promise<{photoUrl: string|null, wikiTitle: string|null}>}
   */
  async function searchAndGetPhoto(personName) {
    if (!personName || !personName.trim()) return { photoUrl: null, wikiTitle: null };

    try {
      const results = await searchPerson(personName);
      if (results.length === 0) return { photoUrl: null, wikiTitle: null };

      const bestTitle = results[0].title;
      const photoUrl = await getPersonPhoto(bestTitle);
      return { photoUrl, wikiTitle: bestTitle };
    } catch (err) {
      console.error(LOG_PREFIX, "searchAndGetPhoto error:", err);
      return { photoUrl: null, wikiTitle: null };
    }
  }

  // ---------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------

  return {
    getPersonPhoto,
    searchPerson,
    searchAndGetPhoto,
  };
}
