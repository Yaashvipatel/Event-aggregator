const mongoose = require("mongoose");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Only accept real strings (blocks NoSQL operator objects like {"$ne": ""}).
const str = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function normalizeList(value, { maxItems = 15, maxLen = 30 } = {}) {
  let arr = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try { arr = JSON.parse(trimmed); } catch { arr = trimmed.split(","); }
    } else {
      arr = trimmed.split(",");
    }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const v = item.trim().toLowerCase().slice(0, maxLen);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

function parseDate(v) {
  if (typeof v !== "string" && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateId(req, _res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new HttpError(400, "Invalid id"));
  }
  next();
}

function parsePaging(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { HttpError, str, escapeRegex, normalizeList, parseDate, validateId, parsePaging };
