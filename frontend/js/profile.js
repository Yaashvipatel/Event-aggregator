document.addEventListener("DOMContentLoaded", async () => {
  if (!App.requireLogin()) return;
  App.mountNav("profile");
  const { esc } = App;
  const $ = (id) => document.getElementById(id);
  const selected = new Set();

  function renderChips() {
    const all = [...new Set([...App.INTERESTS, ...selected])];
    $("pChips").innerHTML = all.map((i) => `<button type="button" class="chip ${selected.has(i) ? "on" : ""}" data-i="${esc(i)}">${esc(i)}</button>`).join("");
  }
  $("pChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    selected.has(b.dataset.i) ? selected.delete(b.dataset.i) : selected.add(b.dataset.i);
    renderChips();
  });

  async function loadMe() {
    const { user } = await App.api("/auth/me");
    App.saveUser(user);
    App.mountNav("profile");
    $("pSid").textContent = user.studentId;
    $("pName").value = user.name;
    user.interests.forEach((i) => selected.add(i));
    renderChips();
  }

  async function loadRsvps() {
    const { events } = await App.api("/events/me/rsvps");
    $("myRsvps").innerHTML = events.length
      ? `<table class="grid"><tr><th>Event</th><th>When</th><th>Where</th><th></th></tr>${events.map((e) => `
          <tr><td>${esc(e.title)}</td><td>${esc(App.fmtDate(e.startDate))}</td><td>${esc(e.location)}</td>
          <td>${e.status === "past" ? '<span class="pill past">ended</span>' : `<button class="btn danger" data-cancel="${e.id}">Cancel</button>`}</td></tr>`).join("")}</table>`
      : '<p class="muted">You have not registered for any events yet.</p>';
  }
  $("myRsvps").addEventListener("click", async (e) => {
    const id = e.target.dataset.cancel;
    if (!id) return;
    try { await App.api(`/events/${id}/rsvp`, { method: "DELETE" }); App.toast("Registration cancelled", "success"); loadRsvps(); }
    catch (err) { App.toast(err.message, "error"); }
  });

  $("saveProfile").addEventListener("click", async () => {
    try {
      const { user } = await App.api("/auth/me", { method: "PUT", body: { name: $("pName").value, interests: [...selected] } });
      App.saveUser(user); App.mountNav("profile");
      App.toast("Profile saved - your recommendations are updated", "success");
    } catch (err) { App.toast(err.message, "error"); }
  });

  $("savePw").addEventListener("click", async () => {
    try {
      await App.api("/auth/me", { method: "PUT", body: { currentPassword: $("curPw").value, newPassword: $("newPw").value } });
      $("curPw").value = ""; $("newPw").value = "";
      App.toast("Password updated", "success");
    } catch (err) { App.toast(err.message, "error"); }
  });

  App.connectLive({
    connect: () => { $("liveDot").className = "dot on"; $("liveText").textContent = "Live"; },
    disconnect: () => { $("liveDot").className = "dot off"; $("liveText").textContent = "Reconnecting..."; },
    presence: (p) => { $("liveText").textContent = `Live - ${p.online} online`; },
    notification: (n) => App.toast(n.message, n.type === "cancelled" ? "error" : "info", n.title),
    "event:updated": loadRsvps,
    "event:deleted": loadRsvps,
    "user:role": () => setTimeout(() => location.reload(), 1200),
  });

  try { await Promise.all([loadMe(), loadRsvps()]); } catch (err) { App.toast(err.message, "error"); }
});
