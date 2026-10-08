// Client for the Python/Flask TF-IDF recommender, with a local keyword fallback
// so the app keeps working if the microservice is down.
const env = require("../config/env");

const STOP = new Set("a an the and or of to in on at for with by from is are be this that it as your you we our us will".split(" "));
const tokenize = (text) =>
  String(text || "").toLowerCase().match(/[a-z0-9]+/g)?.filter((t) => t.length > 2 && !STOP.has(t)) || [];

const eventText = (e) => [e.title, e.title, e.category, ...(e.tags || []), ...(e.tags || []), e.description].join(" ");

function fallbackRank(profileText, events) {
  const profile = new Map();
  for (const t of tokenize(profileText)) profile.set(t, (profile.get(t) || 0) + 1);
  const scored = events
    .map((e) => {
      const toks = new Set(tokenize(eventText(e)));
      const matched = [...toks].filter((t) => profile.has(t));
      const score = matched.reduce((s, t) => s + profile.get(t), 0) / Math.sqrt(toks.size || 1);
      return { id: e.id, score, matchedTerms: matched.slice(0, 3) };
    });
  // Normalise to 0..1 so scores read like the Flask cosine similarity.
  const max = Math.max(...scored.map((x) => x.score), 0) || 1;
  return scored
    .map((x) => ({ ...x, score: Number((x.score / max).toFixed(4)) }))
    .sort((a, b) => b.score - a.score);
}

async function rank({ interests, history, events, topN }) {
  const payload = {
    interests,
    history: history.map((e) => ({ title: e.title, description: e.description, category: e.category, tags: e.tags })),
    events: events.map((e) => ({ id: e.id, title: e.title, description: e.description, category: e.category, tags: e.tags })),
    top_n: topN,
  };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), env.recommenderTimeoutMs);
    const res = await fetch(`${env.recommenderUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`recommender responded ${res.status}`);
    const data = await res.json();
    return {
      source: "tfidf-flask",
      items: data.recommendations.map((r) => ({ id: r.id, score: r.score, matchedTerms: r.matched_terms || [] })),
    };
  } catch (err) {
    console.warn(`[recommender] unavailable (${err.message}) - using local fallback`);
    const profileText = [...interests, ...interests, ...history.map(eventText)].join(" ");
    return { source: "fallback", items: fallbackRank(profileText, events).slice(0, topN) };
  }
}

module.exports = { rank };
