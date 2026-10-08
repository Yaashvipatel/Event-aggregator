const express = require("express");
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { validateId } = require("../utils/helpers");

const auth = require("../controllers/auth");
const events = require("../controllers/events");
const notices = require("../controllers/notices");
const recommendations = require("../controllers/recommendations");
const admin = require("../controllers/admin");

const router = express.Router();
const staff = requireRole("organizer", "admin");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

// ---- Auth (4) ----
router.post("/auth/register", authLimiter, auth.register);
router.post("/auth/login", authLimiter, auth.login);
router.get("/auth/me", requireAuth, auth.me);
router.put("/auth/me", requireAuth, auth.updateMe);

// ---- Events (5 + RSVP 3) ----
router.get("/events", requireAuth, events.list);
router.get("/events/me/rsvps", requireAuth, events.myRsvps); // must stay above /events/:id
router.get("/events/:id", requireAuth, validateId, events.get);
router.post("/events", requireAuth, staff, upload.array("images", 4), events.create);
router.put("/events/:id", requireAuth, staff, validateId, events.update);
router.delete("/events/:id", requireAuth, staff, validateId, events.remove);
router.post("/events/:id/rsvp", requireAuth, validateId, events.rsvp);
router.delete("/events/:id/rsvp", requireAuth, validateId, events.cancelRsvp);

// ---- Recommendations (1) ----
router.get("/recommendations", requireAuth, recommendations.forMe);

// ---- Notices (3) ----
router.get("/notices", requireAuth, notices.list);
router.post("/notices", requireAuth, staff, notices.create);
router.delete("/notices/:id", requireAuth, staff, validateId, notices.remove);

// ---- Admin (2) ----
router.get("/admin/users", requireAuth, requireRole("admin"), admin.listUsers);
router.patch("/admin/users/:id/role", requireAuth, requireRole("admin"), validateId, admin.setRole);

module.exports = router;
