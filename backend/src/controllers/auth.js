const User = require("../models/User");
const { signToken } = require("../middleware/auth");
const { HttpError, str, normalizeList } = require("../utils/helpers");

// POST /api/auth/register  - always creates a "student"; admins promote users later.
exports.register = async (req, res) => {
  const name = str(req.body.name, 80);
  const studentId = str(req.body.studentId, 30).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name) throw new HttpError(400, "Name is required");
  if (!/^[a-z0-9._-]{3,30}$/.test(studentId)) {
    throw new HttpError(400, "Student ID must be 3-30 characters (letters, numbers, . _ -)");
  }
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  if (await User.exists({ studentId })) throw new HttpError(409, "Student ID already registered");

  const user = await User.create({
    name,
    studentId,
    password,
    role: "student",
    interests: normalizeList(req.body.interests),
  });
  res.status(201).json({ token: signToken(user), user });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const studentId = str(req.body.studentId, 30).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const user = studentId ? await User.findOne({ studentId }).select("+password") : null;

  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, "Invalid Student ID or Password");
  }
  res.json({ token: signToken(user), user });
};

// GET /api/auth/me
exports.me = async (req, res) => res.json({ user: req.user });

// PUT /api/auth/me  - update name, interests, optionally password
exports.updateMe = async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  if (req.body.name !== undefined) {
    const name = str(req.body.name, 80);
    if (!name) throw new HttpError(400, "Name cannot be empty");
    user.name = name;
  }
  if (req.body.interests !== undefined) user.interests = normalizeList(req.body.interests);

  if (req.body.newPassword !== undefined) {
    const current = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    const next = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    if (!(await user.comparePassword(current))) throw new HttpError(401, "Current password is incorrect");
    if (next.length < 6) throw new HttpError(400, "New password must be at least 6 characters");
    user.password = next;
  }
  await user.save();
  res.json({ user });
};
