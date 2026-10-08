document.addEventListener("DOMContentLoaded", () => {
  const me = App.requireLogin(["admin"]);
  if (!me) return;
  App.mountNav("admin");
  const { esc } = App;
  const $ = (id) => document.getElementById(id);

  async function load() {
    const q = encodeURIComponent($("searchInput").value.trim());
    try {
      const d = await App.api(`/admin/users?search=${q}&role=${$("roleFilter").value}&limit=100`);
      $("sOnline").textContent = d.online;
      $("sStudent").textContent = d.roleCounts.student;
      $("sOrganizer").textContent = d.roleCounts.organizer;
      $("sAdmin").textContent = d.roleCounts.admin;
      $("pager").textContent = `Showing ${d.users.length} of ${d.total} users`;
      $("userTable").innerHTML = `<table class="grid"><tr><th>Name</th><th>Student ID</th><th>Interests</th><th>Role</th></tr>${d.users.map((u) => `
        <tr><td>${esc(u.name)}</td><td>${esc(u.studentId)}</td><td>${esc(u.interests.join(", "))}</td>
        <td>${u.id === me.id ? `<span class="role-pill admin">admin (you)</span>` : `
          <select data-uid="${u.id}">${["student", "organizer", "admin"].map((r) => `<option ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select>`}</td></tr>`).join("")}</table>`;
    } catch (err) { $("userTable").innerHTML = `<p class="error">${esc(err.message)}</p>`; }
  }

  $("userTable").addEventListener("change", async (e) => {
    const uid = e.target.dataset.uid;
    if (!uid) return;
    try {
      await App.api(`/admin/users/${uid}/role`, { method: "PATCH", body: { role: e.target.value } });
      App.toast("Role updated - the user was notified live", "success");
      load();
    } catch (err) { App.toast(err.message, "error"); load(); }
  });
  let t;
  $("searchInput").addEventListener("input", () => { clearTimeout(t); t = setTimeout(load, 250); });
  $("roleFilter").addEventListener("change", load);

  App.connectLive({
    connect: () => { $("liveDot").className = "dot on"; $("liveText").textContent = "Live"; },
    disconnect: () => { $("liveDot").className = "dot off"; $("liveText").textContent = "Reconnecting..."; },
    presence: (p) => { $("liveText").textContent = `Live - ${p.online} online`; $("sOnline").textContent = p.online; },
  });
  load();
});
