function eventStatus(ev, now = new Date()) {
  if (new Date(ev.endDate) < now) return "past";
  if (new Date(ev.startDate) <= now) return "ongoing";
  return "upcoming";
}

// Public representation of an event (attendee list is never exposed).
function serializeEvent(ev, userId = null) {
  const o = typeof ev.toObject === "function" ? ev.toObject() : ev;
  const attending = userId
    ? (o.attendees || []).some((a) => String(a) === String(userId))
    : false;
  return {
    id: String(o._id),
    title: o.title,
    description: o.description,
    category: o.category,
    tags: o.tags || [],
    location: o.location,
    startDate: o.startDate,
    endDate: o.endDate,
    capacity: o.capacity,
    images: o.images || [],
    organizer: String(o.organizer),
    organizerName: o.organizerName,
    attendeeCount: o.attendeeCount || 0,
    spotsLeft: o.capacity > 0 ? Math.max(o.capacity - (o.attendeeCount || 0), 0) : null,
    isAttending: attending,
    status: eventStatus(o),
    createdAt: o.createdAt,
  };
}

module.exports = { serializeEvent, eventStatus };
