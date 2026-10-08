const fs = require("fs");
const path = require("path");
const Event = require("../models/Event");
const User = require("../models/User");
const { CATEGORIES } = require("../config/constants");
const { UPLOAD_DIR } = require("../middleware/upload");
const { HttpError, str, escapeRegex, normalizeList, parseDate, parsePaging } = require("../utils/helpers");
const { serializeEvent } = require("../utils/serialize");
const realtime = require("../realtime");

const canManage = (user, ev) => user.role === "admin" || String(ev.organizer) === String(user._id);

const loadEvent = async (id) => {
  const ev = await Event.findById(id);
  if (!ev) throw new HttpError(404, "Event not found");
  return ev;
};

function readFields(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has("title")) out.title = str(body.title, 120);
  if (!partial || has("description")) out.description = str(body.description, 4000);
  if (!partial || has("category")) out.category = str(body.category, 30).toLowerCase();
  if (!partial || has("location")) out.location = str(body.location, 120) || "TBA";
  if (!partial || has("tags")) out.tags = normalizeList(body.tags);
  if (!partial || has("startDate")) out.startDate = parseDate(body.startDate);
  if (!partial || has("endDate")) out.endDate = parseDate(body.endDate);
  if (!partial || has("capacity")) out.capacity = body.capacity === undefined || body.capacity === "" ? 0 : Number(body.capacity);

  if (out.title === "") throw new HttpError(400, "Title is required");
  if (out.description === "") throw new HttpError(400, "Description is required");
  if (out.category !== undefined && !CATEGORIES.includes(out.category)) {
    throw new HttpError(400, `Category must be one of: ${CATEGORIES.join(", ")}`);
  }
  if (out.startDate === null) throw new HttpError(400, "A valid start date is required");
  if (out.endDate === null) throw new HttpError(400, "A valid end date is required");
  if (out.capacity !== undefined && (!Number.isInteger(out.capacity) || out.capacity < 0)) {
    throw new HttpError(400, "Capacity must be a whole number (0 = unlimited)");
  }
  return out;
}

// GET /api/events?search=&category=&filter=upcoming|past|all&page=&limit=
exports.list = async (req, res) => {
  const search = str(req.query.search, 100);
  const category = str(req.query.category, 30).toLowerCase();
  const filter = str(req.query.filter, 10) || "upcoming";
  const { page, limit, skip } = parsePaging(req.query);
  const now = new Date();

  const query = {};
  if (category && category !== "all") query.category = category;
  if (filter === "upcoming") query.endDate = { $gte: now };
  else if (filter === "past") query.endDate = { $lt: now };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    query.$or = [{ title: rx }, { description: rx }, { tags: rx }, { location: rx }, { organizerName: rx }];
  }

  const sort = filter === "past" ? { startDate: -1 } : { startDate: 1 };
  const [docs, total] = await Promise.all([
    Event.find(query).sort(sort).skip(skip).limit(limit),
    Event.countDocuments(query),
  ]);
  res.json({
    events: docs.map((d) => serializeEvent(d, req.user._id)),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
};

// GET /api/events/:id
exports.get = async (req, res) => {
  const ev = await loadEvent(req.params.id);
  res.json({ event: serializeEvent(ev, req.user._id) });
};

// POST /api/events   (organizer, admin) - multipart/form-data or JSON
exports.create = async (req, res) => {
  let fields;
  try {
    fields = readFields(req.body);
    if (fields.endDate < fields.startDate) throw new HttpError(400, "End date cannot be before start date");
  } catch (err) {
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    throw err;
  }

  const ev = await Event.create({
    ...fields,
    images: (req.files || []).map((f) => `/uploads/${f.filename}`),
    organizer: req.user._id,
    organizerName: req.user.name,
  });

  realtime.broadcast("event:created", serializeEvent(ev));

  // Personalised live push to users whose interests match this event.
  const keywords = [ev.category, ...ev.tags];
  const interested = await User.find({ interests: { $in: keywords }, _id: { $ne: req.user._id } }).select("_id");
  realtime.notify(interested.map((u) => u._id), {
    type: "recommendation",
    title: "New event for you",
    message: `"${ev.title}" matches your interests`,
    eventId: String(ev._id),
  });

  res.status(201).json({ event: serializeEvent(ev, req.user._id) });
};

// PUT /api/events/:id   (owner organizer or admin)
exports.update = async (req, res) => {
  const ev = await loadEvent(req.params.id);
  if (!canManage(req.user, ev)) throw new HttpError(403, "You can only edit your own events");

  const fields = readFields(req.body, { partial: true });
  const startDate = fields.startDate || ev.startDate;
  const endDate = fields.endDate || ev.endDate;
  if (endDate < startDate) throw new HttpError(400, "End date cannot be before start date");
  if (fields.capacity !== undefined && fields.capacity > 0 && fields.capacity < ev.attendeeCount) {
    throw new HttpError(400, `Capacity cannot be lower than current registrations (${ev.attendeeCount})`);
  }
  if (fields.startDate && fields.startDate.getTime() !== ev.startDate.getTime()) ev.reminderSent = false;

  Object.assign(ev, fields);
  await ev.save();

  realtime.broadcast("event:updated", serializeEvent(ev));
  realtime.notify(ev.attendees, {
    type: "update",
    title: "Event updated",
    message: `"${ev.title}" was updated by the organizer`,
    eventId: String(ev._id),
  });
  res.json({ event: serializeEvent(ev, req.user._id) });
};

// DELETE /api/events/:id   (owner organizer or admin)
exports.remove = async (req, res) => {
  const ev = await loadEvent(req.params.id);
  if (!canManage(req.user, ev)) throw new HttpError(403, "You can only delete your own events");
  await ev.deleteOne();

  for (const img of ev.images) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(img)), () => {});
  }
  realtime.broadcast("event:deleted", { id: String(ev._id) });
  realtime.notify(ev.attendees, {
    type: "cancelled",
    title: "Event cancelled",
    message: `"${ev.title}" has been removed`,
  });
  res.json({ message: "Event deleted" });
};

// POST /api/events/:id/rsvp
exports.rsvp = async (req, res) => {
  const ev = await loadEvent(req.params.id);
  if (ev.endDate < new Date()) throw new HttpError(400, "This event has already ended");

  // Single atomic update: refuses duplicates and never exceeds capacity, even under concurrency.
  const cond = { _id: ev._id, attendees: { $ne: req.user._id } };
  if (ev.capacity > 0) cond.attendeeCount = { $lt: ev.capacity };
  const updated = await Event.findOneAndUpdate(
    cond,
    { $addToSet: { attendees: req.user._id }, $inc: { attendeeCount: 1 } },
    { returnDocument: "after" }
  );

  if (!updated) {
    const fresh = await Event.findById(ev._id);
    if (fresh && fresh.attendees.some((a) => String(a) === String(req.user._id))) {
      throw new HttpError(409, "You are already registered for this event");
    }
    throw new HttpError(409, "This event is full");
  }

  realtime.broadcast("event:attendance", {
    id: String(updated._id),
    attendeeCount: updated.attendeeCount,
    spotsLeft: updated.capacity > 0 ? updated.capacity - updated.attendeeCount : null,
  });
  if (String(updated.organizer) !== String(req.user._id)) {
    realtime.notify(updated.organizer, {
      type: "rsvp",
      title: "New registration",
      message: `${req.user.name} registered for "${updated.title}" (${updated.attendeeCount} total)`,
      eventId: String(updated._id),
    });
  }
  res.json({ event: serializeEvent(updated, req.user._id) });
};

// DELETE /api/events/:id/rsvp
exports.cancelRsvp = async (req, res) => {
  const updated = await Event.findOneAndUpdate(
    { _id: req.params.id, attendees: req.user._id },
    { $pull: { attendees: req.user._id }, $inc: { attendeeCount: -1 } },
    { returnDocument: "after" }
  );
  if (!updated) {
    await loadEvent(req.params.id); // 404 if the event doesn't exist
    throw new HttpError(409, "You are not registered for this event");
  }
  realtime.broadcast("event:attendance", {
    id: String(updated._id),
    attendeeCount: updated.attendeeCount,
    spotsLeft: updated.capacity > 0 ? updated.capacity - updated.attendeeCount : null,
  });
  res.json({ event: serializeEvent(updated, req.user._id) });
};

// GET /api/events/me/rsvps
exports.myRsvps = async (req, res) => {
  const docs = await Event.find({ attendees: req.user._id }).sort({ startDate: 1 });
  res.json({ events: docs.map((d) => serializeEvent(d, req.user._id)) });
};
