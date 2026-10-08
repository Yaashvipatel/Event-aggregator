// Pushes a live reminder to registered attendees shortly before an event starts.
const Event = require("../models/Event");
const env = require("../config/env");
const realtime = require("../realtime");

async function checkReminders() {
  const now = new Date();
  const until = new Date(now.getTime() + env.reminderWindowMin * 60000);
  const due = await Event.find({
    startDate: { $gt: now, $lte: until },
    reminderSent: false,
    attendeeCount: { $gt: 0 },
  });
  for (const ev of due) {
    const mins = Math.max(Math.round((ev.startDate - now) / 60000), 1);
    realtime.notify(ev.attendees, {
      type: "reminder",
      title: "Starting soon",
      message: `"${ev.title}" starts in about ${mins} min at ${ev.location}`,
      eventId: String(ev._id),
    });
    ev.reminderSent = true;
    await ev.save();
  }
  return due.length;
}

function start(intervalMs = 60000) {
  const run = () => checkReminders().catch((e) => console.error("[reminders]", e.message));
  run();
  return setInterval(run, intervalMs).unref();
}

module.exports = { start, checkReminders };
