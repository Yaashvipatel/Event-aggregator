const Notice = require("../models/Notice");
const { CATEGORIES } = require("../config/constants");
const { HttpError, str, escapeRegex, parsePaging } = require("../utils/helpers");
const realtime = require("../realtime");

// GET /api/notices?search=&category=   (keeps the original query contract)
exports.list = async (req, res) => {
  const search = str(req.query.search, 100);
  const category = str(req.query.category, 30).toLowerCase();
  const { limit, skip } = parsePaging(req.query, { defaultLimit: 50, maxLimit: 100 });

  const query = {};
  if (category && category !== "all") query.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    query.$or = [{ title: rx }, { description: rx }, { postedBy: rx }];
  }
  const notices = await Notice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json(notices);
};

// POST /api/notices   (organizer, admin)
exports.create = async (req, res) => {
  const title = str(req.body.title, 120);
  const description = str(req.body.description, 2000);
  const category = str(req.body.category, 30).toLowerCase();
  if (!title || !description) throw new HttpError(400, "Title and description are required");
  if (!CATEGORIES.includes(category)) throw new HttpError(400, `Category must be one of: ${CATEGORIES.join(", ")}`);

  const notice = await Notice.create({
    title, description, category, postedBy: req.user.name, author: req.user._id,
  });
  realtime.broadcast("notice:created", notice.toJSON());
  res.status(201).json(notice);
};

// DELETE /api/notices/:id   (author or admin)
exports.remove = async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw new HttpError(404, "Notice not found");
  if (req.user.role !== "admin" && String(notice.author) !== String(req.user._id)) {
    throw new HttpError(403, "You can only delete your own notices");
  }
  await notice.deleteOne();
  realtime.broadcast("notice:deleted", { id: String(notice._id) });
  res.json({ message: "Notice deleted" });
};
