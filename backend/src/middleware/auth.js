const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const { HttpError } = require("../utils/helpers");

const signToken = (user) =>
  jwt.sign({ id: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpires });

// Verifies the JWT and loads the user fresh from the DB so that role changes
// and account removal take effect immediately.
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Authentication required");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, "Account no longer exists");
  req.user = user;
  next();
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new HttpError(403, `Requires role: ${roles.join(" or ")}`);
  }
  next();
};

module.exports = { signToken, requireAuth, requireRole };
