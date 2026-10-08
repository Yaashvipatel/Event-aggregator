const crypto = require("crypto");
require("dotenv").config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || "development";
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (nodeEnv === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  jwtSecret = crypto.randomBytes(32).toString("hex");
  console.warn("[config] JWT_SECRET not set - using a random one (logins reset on restart)");
}

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_events",
  useMemoryDb: String(process.env.USE_MEMORY_DB).toLowerCase() === "true",
  jwtSecret,
  jwtExpires: process.env.JWT_EXPIRES_IN || "7d",
  recommenderUrl: (process.env.RECOMMENDER_URL || "http://127.0.0.1:5001").replace(/\/$/, ""),
  recommenderTimeoutMs: Number(process.env.RECOMMENDER_TIMEOUT_MS) || 3000,
  reminderWindowMin: Number(process.env.REMINDER_WINDOW_MIN) || 60,
  autoSeed: String(process.env.AUTO_SEED ?? "true").toLowerCase() === "true",
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 50,
};
