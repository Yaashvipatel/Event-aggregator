const Event = require("../models/Event");
const User  = require("../models/User");
const path  = require("path");
const fs    = require("fs");


const addEvent = async (req, res) => {
  try {
    const { title, description, category, startDate, endDate, requiresRegistration, formFields } = req.body;

    if (!title || !category || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, category, startDate, endDate are required" });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    let parsedFields = [];
    if (requiresRegistration === "true" || requiresRegistration === true) {
      try {
        parsedFields = JSON.parse(formFields || "[]");
      } catch {
        parsedFields = [];
      }
    }

    const image = req.file ? req.file.filename : null;

    const event = await Event.create({
      title,
      description,
      category,
      startDate,
      endDate,
      requiresRegistration: requiresRegistration === "true" || requiresRegistration === true,
      formFields: parsedFields,
      image,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    console.error("addEvent error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getEvents = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = { $regex: new RegExp(category, "i") };
    }

    if (search) {
      filter.$or = [
        { title:       { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
        { category:    { $regex: new RegExp(search, "i") } },
      ];
    }

    const events = await Event.find(filter)
      .populate("createdBy", "name role designation department")
      .populate("registrations.user", "name email studentId department year phone")
      .sort({ createdAt: -1 });

    const userId = req.user?.id;
    let bookmarks  = [];
    let readEvents = [];

    if (userId) {
      const user = await User.findById(userId).select("bookmarks readEvents");
      bookmarks  = (user?.bookmarks  || []).map(String);
      readEvents = (user?.readEvents || []).map(String);
    }

    const enriched = events.map((e) => ({
      ...e.toObject(),
      isBookmarked: bookmarks.includes(String(e._id)),
      isRead:       readEvents.includes(String(e._id)),
    }));

    res.json({ events: enriched });
  } catch (error) {
    console.error("getEvents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBookmarkedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("bookmarks readEvents");

    const events = await Event.find({ _id: { $in: user.bookmarks } })
      .populate("createdBy", "name role")
      .populate("registrations.user", "name email studentId department year phone")
      .sort({ createdAt: -1 });

    const bookmarks  = (user.bookmarks  || []).map(String);
    const readEvents = (user.readEvents || []).map(String);

    const enriched = events.map((e) => ({
      ...e.toObject(),
      isBookmarked: bookmarks.includes(String(e._id)),
      isRead:       readEvents.includes(String(e._id)),
    }));

    res.json({ events: enriched });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRegisteredEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const user   = await User.findById(userId).select("bookmarks readEvents");

    const events = await Event.find({ "registrations.user": userId })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    const bookmarks  = (user?.bookmarks  || []).map(String);
    const readEvents = (user?.readEvents || []).map(String);

    const enriched = events.map((e) => ({
      ...e.toObject(),
      isBookmarked: bookmarks.includes(String(e._id)),
      isRead:       readEvents.includes(String(e._id)),
      isRegistered: true,
    }));

    res.json({ events: enriched });
  } catch (error) {
    console.error("getRegisteredEvents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!event.requiresRegistration) {
      return res.status(400).json({ message: "This event does not require registration" });
    }

    const alreadyRegistered = event.registrations.some(
      (r) => String(r.user) === String(req.user.id)
    );
    if (alreadyRegistered) {
      return res.status(409).json({ message: "Already registered for this event" });
    }

    const formData = req.body.formData || {};
    for (const field of event.formFields) {
      if (field.required && !formData[field.fieldName]) {
        return res.status(400).json({ message: `'${field.label}' is required` });
      }
    }

    event.registrations.push({ user: req.user.id, formData });
    await event.save();

    res.json({ message: "Successfully registered for the event" });
  } catch (error) {
    console.error("registerForEvent error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const markEventRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const eventId = req.params.eventId;

    if (!user.readEvents.map(String).includes(eventId)) {
      user.readEvents.push(eventId);
      await user.save();
    }

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const unmarkEventRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const eventId = req.params.eventId;

    user.readEvents = user.readEvents.filter((id) => String(id) !== eventId);
    await user.save();

    res.json({ message: "Unmarked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const bookmarkEvent = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const eventId = req.params.eventId;

    if (!user.bookmarks.map(String).includes(eventId)) {
      user.bookmarks.push(eventId);
      await user.save();
    }

    res.json({ message: "Event bookmarked" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const removeBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const eventId = req.params.eventId;

    user.bookmarks = user.bookmarks.filter((id) => String(id) !== eventId);
    await user.save();

    res.json({ message: "Bookmark removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (String(event.createdBy) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorised to delete this event" });
    }

    if (event.image) {
      const imgPath = path.join(__dirname, "../uploads", event.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await event.deleteOne();
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate("registrations.user", "name email studentId department year phone");

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ registrations: event.registrations });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
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
};
