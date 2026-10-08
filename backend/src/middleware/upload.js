const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { HttpError } = require("../utils/helpers");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Only JPG, PNG, WEBP or GIF images are allowed")),
});

module.exports = { upload, UPLOAD_DIR };
