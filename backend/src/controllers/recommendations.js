const Event = require("../models/Event");
const recommender = require("../services/recommender");
const { serializeEvent } = require("../utils/serialize");

const TOP_N = 6;
const MIN_SCORE = 0.02;

// GET /api/recommendations
// Builds the user's profile (interests + events they registered for), asks the Flask
// TF-IDF/cosine service to rank upcoming events, and pads with soonest events if needed.
exports.forMe = async (req, res) => {
  const now = new Date();
  const [history, candidates] = await Promise.all([
    Event.find({ attendees: req.user._id }),
    Event.find({ endDate: { $gte: now }, attendees: { $ne: req.user._id } }).sort({ startDate: 1 }).limit(200),
  ]);

  const interests = req.user.interests || [];
  const byId = new Map(candidates.map((c) => [String(c._id), c]));
  const cards = [];
  let source = "none";

  if (candidates.length && (interests.length || history.length)) {
    const plain = candidates.map((c) => ({ id: String(c._id), title: c.title, description: c.description, category: c.category, tags: c.tags }));
    const ranked = await recommender.rank({ interests, history, events: plain, topN: TOP_N });
    source = ranked.source;
    for (const r of ranked.items) {
      if (r.score < MIN_SCORE || !byId.has(r.id)) continue;
      cards.push({ ...serializeEvent(byId.get(r.id), req.user._id), score: r.score, matchedTerms: r.matchedTerms, reason: "match" });
      byId.delete(r.id);
    }
  }

  // Cold start / not enough matches: fill with the most popular upcoming events.
  if (cards.length < TOP_N) {
    const popular = [...byId.values()].sort((a, b) => b.attendeeCount - a.attendeeCount || a.startDate - b.startDate);
    for (const ev of popular.slice(0, TOP_N - cards.length)) {
      cards.push({ ...serializeEvent(ev, req.user._id), score: 0, matchedTerms: [], reason: "popular" });
    }
    if (source === "none") source = "popular";
  }
  res.json({ source, recommendations: cards });
};
