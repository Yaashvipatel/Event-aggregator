const User = require("../models/User");
const { ROLES } = require("../config/constants");
const { HttpError, str, escapeRegex, parsePaging } = require("../utils/helpers");
const realtime = require("../realtime");

// GET /api/admin/users?search=&role=&page=&limit=
exports.listUsers = async (req, res) => {
  const search = str(req.query.search, 60);
  const role = str(req.query.role, 20);
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 25, maxLimit: 100 });

  const query = {};
  if (ROLES.includes(role)) query.role = role;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    query.$or = [{ name: rx }, { studentId: rx }];
  }
  const [users, total, counts] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
    Promise.all(ROLES.map((r) => User.countDocuments({ role: r }))),
  ]);
  res.json({
    users,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    roleCounts: Object.fromEntries(ROLES.map((r, i) => [r, counts[i]])),
    ...realtime.presence(),
  });
};

// PATCH /api/admin/users/:id/role   body: { role }
exports.setRole = async (req, res) => {
  const role = str(req.body.role, 20);
  if (!ROLES.includes(role)) throw new HttpError(400, `Role must be one of: ${ROLES.join(", ")}`);
  if (String(req.user._id) === req.params.id) throw new HttpError(400, "You cannot change your own role");

  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  user.role = role;
  await user.save();

  realtime.toUser(user._id, "user:role", { role });
  realtime.notify(user._id, {
    type: "role",
    title: "Role updated",
    message: `Your role is now "${role}"`,
  });
  res.json({ user });
};
