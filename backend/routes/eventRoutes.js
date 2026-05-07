const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");

const {
  addEvent,
  getEvents,
  getBookmarkedEvents,
  getRegisteredEvents,
  registerForEvent,
  markEventRead,
  unmarkEventRead,
  bookmarkEvent,
  removeBookmark,
  deleteEvent,
  getRegistrations,
} = require("../controllers/eventController");

const { protect, authoriseRoles } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext     = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime    = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.get("/",           getEvents);
router.get("/bookmarks",  getBookmarkedEvents);
router.get("/registered", getRegisteredEvents);  

router.post("/addEvent", authoriseRoles("faculty", "admin"), upload.single("image"), addEvent);
router.post("/register/:eventId", registerForEvent);

router.patch("/mark-read/:eventId",     markEventRead);
router.patch("/unmark-read/:eventId",   unmarkEventRead);   
router.patch("/bookmark/:eventId",      bookmarkEvent);
router.patch("/remove-bookmark/:eventId", removeBookmark);

router.delete("/:eventId", authoriseRoles("faculty", "admin"), deleteEvent);
router.get("/:eventId/registrations", authoriseRoles("faculty", "admin"), getRegistrations);

module.exports = router;
