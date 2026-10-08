// Usage: (server + seed running)  npm run smoke
// Exercises all 18 REST endpoints, role rules, capacity limits and live socket events.
const { io } = require("socket.io-client");
const BASE = process.env.BASE_URL || "http://localhost:3000";

let passed = 0, failed = 0;
const ok = (cond, name) => { cond ? passed++ : failed++; console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}`); };

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const login = async (studentId, password) => (await api("POST", "/api/auth/login", { body: { studentId, password } })).data;

function listen(token, names) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ["websocket"] });
    const got = {};
    names.forEach((n) => { got[n] = []; socket.on(n, (p) => got[n].push(p)); });
    socket.on("connect", () => resolve({ socket, got }));
    socket.on("connect_error", reject);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const admin = await login("admin", "Admin@123");
  const org = await login("org001", "Organizer@123");
  const org2 = await login("org002", "Organizer@123");
  ok(admin?.token && org?.token, "seeded admin/organizer can log in (run `npm run seed` first)");
  if (!admin?.token) process.exit(1);

  console.log("\nAuth");
  const sid = "smoke" + Date.now().toString(36);
  let r = await api("POST", "/api/auth/register", { body: { name: "Smoke Tester", studentId: sid, password: "secret1", interests: ["python", "workshop"], role: "admin" } });
  ok(r.status === 201 && r.data.user.role === "student", "1  POST /auth/register -> 201, role forced to student");
  const stu = r.data;
  ok((await api("POST", "/api/auth/register", { body: { name: "x", studentId: sid, password: "secret1" } })).status === 409, "   duplicate studentId -> 409");
  ok((await api("POST", "/api/auth/login", { body: { studentId: sid, password: "wrong" } })).status === 401, "2  POST /auth/login wrong password -> 401");
  ok((await api("POST", "/api/auth/login", { body: { studentId: { $ne: "" }, password: { $ne: "" } } })).status === 401, "   NoSQL operator injection rejected");
  r = await api("GET", "/api/auth/me", { token: stu.token });
  ok(r.status === 200 && r.data.user.studentId === sid && !r.data.user.password, "3  GET /auth/me (no password leaked)");
  r = await api("PUT", "/api/auth/me", { token: stu.token, body: { name: "Smoke Updated", interests: ["Python", "machine learning", "coding"] } });
  ok(r.status === 200 && r.data.user.interests.includes("machine learning"), "4  PUT /auth/me updates profile");
  ok((await api("GET", "/api/events")).status === 401, "   no token -> 401");

  console.log("\nRole-based access");
  const stuLive = await listen(stu.token, ["event:created", "event:updated", "event:deleted", "event:attendance", "notice:created", "notice:deleted", "notification", "presence"]);
  const orgLive = await listen(org.token, ["notification"]);
  const evForm = (extra = {}) => {
    const f = new FormData();
    const o = { title: "Smoke Python Workshop", description: "Learn python machine learning basics", category: "workshop", tags: "python,ml", location: "Lab 9",
      startDate: new Date(Date.now() + 2 * 864e5).toISOString(), endDate: new Date(Date.now() + 2 * 864e5 + 36e5).toISOString(), capacity: "1", ...extra };
    Object.entries(o).forEach(([k, v]) => f.append(k, v));
    return f;
  };
  ok((await api("POST", "/api/events", { token: stu.token, form: evForm() })).status === 403, "   student cannot create event -> 403");
  ok((await api("GET", "/api/admin/users", { token: org.token })).status === 403, "   organizer cannot list users -> 403");

  console.log("\nEvents + real-time");
  r = await api("POST", "/api/events", { token: org.token, form: evForm() });
  ok(r.status === 201 && r.data.event.capacity === 1, "7  POST /events (organizer) -> 201");
  const ev = r.data.event;
  await wait(400);
  ok(stuLive.got["event:created"].some((e) => e.id === ev.id), "   LIVE: student received event:created");
  ok(stuLive.got.notification.some((n) => n.type === "recommendation" && n.eventId === ev.id), "   LIVE: interest-matched user got personal notification");
  ok((await api("POST", "/api/events", { token: org.token, form: evForm({ endDate: "2000-01-01" }) })).status === 400, "   end before start -> 400");

  r = await api("GET", "/api/events?search=smoke&category=workshop", { token: stu.token });
  ok(r.status === 200 && r.data.events.some((e) => e.id === ev.id), "5  GET /events (search + category filter)");
  r = await api("GET", `/api/events/${ev.id}`, { token: stu.token });
  ok(r.status === 200 && r.data.event.attendeeCount === 0, "6  GET /events/:id");
  ok((await api("GET", "/api/events/not-an-id", { token: stu.token })).status === 400, "   bad id -> 400");

  r = await api("PUT", `/api/events/${ev.id}`, { token: org.token, body: { title: "Smoke Python Workshop v2" } });
  ok(r.status === 200 && r.data.event.title.endsWith("v2"), "8  PUT /events/:id (owner)");
  ok((await api("PUT", `/api/events/${ev.id}`, { token: org2.token, body: { title: "hijack" } })).status === 403, "   other organizer cannot edit -> 403");
  await wait(300);
  ok(stuLive.got["event:updated"].some((e) => e.id === ev.id), "   LIVE: event:updated broadcast");

  r = await api("POST", `/api/events/${ev.id}/rsvp`, { token: stu.token });
  ok(r.status === 200 && r.data.event.isAttending && r.data.event.attendeeCount === 1, "9  POST /events/:id/rsvp");
  await wait(300);
  ok(stuLive.got["event:attendance"].some((e) => e.id === ev.id && e.attendeeCount === 1 && e.spotsLeft === 0), "   LIVE: attendee count broadcast");
  ok(orgLive.got.notification.some((n) => n.type === "rsvp"), "   LIVE: organizer notified of registration");
  ok((await api("POST", `/api/events/${ev.id}/rsvp`, { token: stu.token })).status === 409, "   duplicate RSVP -> 409");
  ok((await api("POST", `/api/events/${ev.id}/rsvp`, { token: admin.token })).status === 409, "   capacity=1 full -> 409");
  r = await api("GET", "/api/events/me/rsvps", { token: stu.token });
  ok(r.status === 200 && r.data.events.length === 1, "11 GET /events/me/rsvps");

  r = await api("GET", "/api/recommendations", { token: stu.token });
  ok(r.status === 200 && r.data.recommendations.length > 0, `13 GET /recommendations (source: ${r.data?.source})`);
  ok(r.data.recommendations.every((e) => !e.isAttending), "   already-registered events excluded");
  console.log(`       top: ${r.data.recommendations.slice(0, 3).map((e) => `${e.title} [${e.score}]`).join(" | ")}`);

  r = await api("DELETE", `/api/events/${ev.id}/rsvp`, { token: stu.token });
  ok(r.status === 200 && !r.data.event.isAttending && r.data.event.attendeeCount === 0, "10 DELETE /events/:id/rsvp");
  ok((await api("DELETE", `/api/events/${ev.id}/rsvp`, { token: stu.token })).status === 409, "   cancel when not registered -> 409");

  console.log("\nNotices");
  r = await api("POST", "/api/notices", { token: org.token, body: { title: "Smoke notice", description: "hello", category: "exam" } });
  ok(r.status === 201, "14 POST /notices");
  const notice = r.data;
  await wait(300);
  ok(stuLive.got["notice:created"].some((n) => n.id === notice.id), "   LIVE: notice:created broadcast");
  r = await api("GET", "/api/notices?search=smoke&category=exam", { token: stu.token });
  ok(r.status === 200 && r.data.some((n) => n.id === notice.id), "15 GET /notices (search + category)");
  ok((await api("POST", "/api/notices", { token: stu.token, body: { title: "x", description: "y", category: "exam" } })).status === 403, "   student cannot post notice -> 403");
  ok((await api("DELETE", `/api/notices/${notice.id}`, { token: org2.token })).status === 403, "   non-author organizer cannot delete -> 403");
  ok((await api("DELETE", `/api/notices/${notice.id}`, { token: admin.token })).status === 200, "16 DELETE /notices/:id (admin)");

  console.log("\nAdmin");
  r = await api("GET", "/api/admin/users?search=" + sid, { token: admin.token });
  ok(r.status === 200 && r.data.users.length === 1 && r.data.roleCounts.admin >= 1, "17 GET /admin/users");
  const target = r.data.users[0];
  r = await api("PATCH", `/api/admin/users/${target.id}/role`, { token: admin.token, body: { role: "organizer" } });
  ok(r.status === 200 && r.data.user.role === "organizer", "18 PATCH /admin/users/:id/role");
  await wait(300);
  ok(stuLive.got.notification.some((n) => n.type === "role"), "   LIVE: promoted user notified instantly");
  ok((await api("POST", "/api/events", { token: stu.token, form: evForm({ title: "Promoted event" }) })).status === 201, "   promotion takes effect immediately (same token)");
  ok((await api("PATCH", `/api/admin/users/${(await api("GET", "/api/auth/me", { token: admin.token })).data.user.id}/role`, { token: admin.token, body: { role: "student" } })).status === 400, "   admin cannot demote self -> 400");

  console.log("\nCleanup");
  r = await api("DELETE", `/api/events/${ev.id}`, { token: org.token });
  ok(r.status === 200, "9b DELETE /events/:id (owner)");
  await wait(300);
  ok(stuLive.got["event:deleted"].some((e) => e.id === ev.id), "   LIVE: event:deleted broadcast");
  ok(stuLive.got.presence.length > 0 && stuLive.got.presence.at(-1).online >= 2, "   LIVE: presence count broadcast");

  stuLive.socket.close(); orgLive.socket.close();
  const bad = io(BASE, { auth: { token: "garbage" }, transports: ["websocket"] });
  await new Promise((res) => bad.on("connect_error", (e) => { ok(e.message === "unauthorized", "   socket with bad JWT rejected"); res(); }));
  bad.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
