// Socket.IO layer: JWT-authenticated live updates, personal notifications, presence.
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("./config/env");
const User = require("./models/User");

let io = null;
const online = new Map(); // userId -> open socket count

const presence = () => ({ online: online.size });

function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: true } });

  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token || "", env.jwtSecret);
      const user = await User.findById(payload.id).select("name role");
      if (!user) return next(new Error("unauthorized"));
      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId;
    socket.join(`user:${uid}`);
    online.set(uid, (online.get(uid) || 0) + 1);
    io.emit("presence", presence());

    socket.on("disconnect", () => {
      const n = (online.get(uid) || 1) - 1;
      if (n <= 0) online.delete(uid);
      else online.set(uid, n);
      io.emit("presence", presence());
    });
  });

  return io;
}

const broadcast = (event, payload) => io && io.emit(event, payload);
const toUser = (userId, event, payload) => io && io.to(`user:${userId}`).emit(event, payload);

// Personal toast-style notification pushed to one or many users.
function notify(userIds, notification) {
  if (!io) return;
  const body = { at: new Date().toISOString(), ...notification };
  for (const id of new Set([].concat(userIds).map(String))) toUser(id, "notification", body);
}

module.exports = { init, broadcast, toUser, notify, presence };
