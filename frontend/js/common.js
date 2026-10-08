// Shared client helpers: API wrapper, auth session, toasts, live socket connection.
window.App = (() => {
  const TOKEN_KEY = "ea_token";
  const USER_KEY = "ea_user";

  const CATEGORIES = {
    workshop: "Workshops", seminar: "Seminars", conference: "Conferences", exam: "Exams",
    fees: "Fees", cultural: "Cultural Events", fest: "Main Fest", club: "Club Activities",
  };
  const INTERESTS = ["coding", "python", "machine learning", "ai", "web", "career", "startups", "research",
    "music", "dance", "photography", "competition", "workshop", "seminar", "cultural", "fest", "club"];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const getUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
  const saveSession = (token, user) => { if (token) localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); };
  const saveUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "index.html";
  }

  async function api(path, { method = "GET", body, form } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch("/api" + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
    } catch {
      throw new Error("Cannot reach the server. Is it running?");
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (res.status === 401 && token && !path.startsWith("/auth/login")) logout();
    if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
    return data;
  }

  // Redirects to login if there is no session; optionally restricts by role.
  function requireLogin(roles) {
    const user = getUser();
    if (!getToken() || !user) { window.location.href = "index.html"; return null; }
    if (roles && !roles.includes(user.role)) { window.location.href = "notices.html"; return null; }
    return user;
  }

  function toast(message, type = "info", title = "") {
    let box = document.getElementById("toastBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "toastBox";
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerHTML = (title ? `<strong>${esc(title)}</strong>` : "") + `<span>${esc(message)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 5000);
  }

  const fmtDate = (iso, opts = { dateStyle: "medium", timeStyle: "short" }) => new Date(iso).toLocaleString([], opts);
  function fmtRange(start, end) {
    const s = new Date(start), e = new Date(end);
    if (s.toDateString() === e.toDateString()) {
      return `${fmtDate(start)} - ${e.toLocaleTimeString([], { timeStyle: "short" })}`;
    }
    return `${fmtDate(start)} \u2192 ${fmtDate(end)}`;
  }

  // Opens the authenticated Socket.IO connection. handlers = { eventName: fn }
  function connectLive(handlers = {}) {
    if (typeof io === "undefined") return null;
    const socket = io({ auth: { token: getToken() } });
    Object.entries(handlers).forEach(([name, fn]) => socket.on(name, fn));
    socket.on("connect_error", (err) => { if (err.message === "unauthorized") logout(); });
    return socket;
  }

  function mountNav(active) {
    const user = getUser();
    const el = document.getElementById("navUser");
    if (el && user) el.innerHTML = `<strong>${esc(user.name)}</strong><span class="role-pill ${esc(user.role)}">${esc(user.role)}</span>`;
    document.querySelectorAll("[data-admin-only]").forEach((n) => { n.style.display = user && user.role === "admin" ? "" : "none"; });
    document.querySelectorAll("[data-nav]").forEach((n) => n.classList.toggle("active", n.dataset.nav === active));
    const out = document.getElementById("logoutLink");
    if (out) out.addEventListener("click", (e) => { e.preventDefault(); logout(); });
  }

  return { CATEGORIES, INTERESTS, esc, api, getToken, getUser, saveSession, saveUser, logout, requireLogin, toast, fmtDate, fmtRange, connectLive, mountNav };
})();
