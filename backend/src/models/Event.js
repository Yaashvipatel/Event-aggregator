const mongoose = require("mongoose");
const { CATEGORIES } = require("../config/constants");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, enum: CATEGORIES, required: true },
    tags: { type: [String], default: [] },
    location: { type: String, trim: true, maxlength: 120, default: "TBA" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    capacity: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    images: { type: [String], default: [] },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organizerName: { type: String, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    attendeeCount: { type: Number, default: 0 },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model("Event", eventSchema);
