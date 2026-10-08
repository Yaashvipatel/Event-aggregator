(function () {
  const me = App.requireLogin(["organizer", "admin"]);
  if (!me) return;

  const $ = (id) => document.getElementById(id);
  const editId = new URLSearchParams(location.search).get("edit");
  let images = [];
  let kind = "event";

  const showError = (m) => { $("errorMsg").textContent = m || ""; };
  const toLocalInput = (iso) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  function applyKind() {
    kind = document.querySelector('input[name="kind"]:checked').value;
    const isEvent = kind === "event";
    $("eventOnly1").classList.toggle("hidden", !isEvent);
    $("nextBtn").classList.toggle("hidden", !isEvent);
    $("postNoticeBtn").classList.toggle("hidden", isEvent);
    $("previewGrid").classList.toggle("hidden", !isEvent);
    $("pageTitle").innerHTML = isEvent ? "&#127882; Post Event" : "&#128226; Post Notice";
  }
  document.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", applyKind));

  // ----- image previews -----
  $("imageInput").addEventListener("change", function () {
    images.push(...Array.from(this.files));
    images = images.slice(0, 4);
    this.value = "";
    renderPreview();
  });
  function renderPreview() {
    const grid = $("previewGrid");
    grid.innerHTML = "";
    images.forEach((file, index) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      const btn = document.createElement("button");
      btn.className = "remove-btn";
      btn.innerText = "\u00d7";
      btn.onclick = () => { images.splice(index, 1); renderPreview(); };
      div.append(img, btn);
      grid.appendChild(div);
    });
  }

  // ----- navigation -----
  $("backHome").onclick = () => { location.href = "notices.html"; };
  $("backStep1").onclick = () => { $("step2").classList.add("hidden"); $("step1").classList.remove("hidden"); showError(""); };
  $("nextBtn").onclick = () => {
    if (!$("title").value.trim() || !$("description").value.trim()) return showError("Title and description are required.");
    showError("");
    $("step1").classList.add("hidden");
    $("step2").classList.remove("hidden");
  };

  // ----- submit notice -----
  $("postNoticeBtn").onclick = async () => {
    try {
      await App.api("/notices", { method: "POST", body: { title: $("title").value, category: $("category").value, description: $("description").value } });
      location.href = "notices.html";
    } catch (err) { showError(err.message); }
  };

  // ----- submit event (create or edit) -----
  $("submitBtn").onclick = async () => {
    const start = $("startDate").value, end = $("endDate").value;
    if (!start || !end) return showError("Select start and end date/time.");
    if (new Date(end) < new Date(start)) return showError("End cannot be before start.");

    const fields = {
      title: $("title").value, description: $("description").value, category: $("category").value,
      tags: $("tags").value, location: $("location").value, capacity: $("capacity").value || "0",
      startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(),
    };
    $("submitBtn").disabled = true;
    try {
      if (editId) {
        await App.api(`/events/${editId}`, { method: "PUT", body: fields });
      } else {
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, v));
        images.forEach((f) => form.append("images", f));
        await App.api("/events", { method: "POST", form });
      }
      location.href = "notices.html";
    } catch (err) {
      showError(err.message);
      $("submitBtn").disabled = false;
    }
  };

  // ----- edit mode: prefill -----
  if (editId) {
    $("typeToggle").classList.add("hidden");
    $("photoBlock").classList.add("hidden");
    $("pageTitle").innerHTML = "&#9999;&#65039; Edit Event";
    $("submitBtn").innerHTML = "Save Changes";
    App.api(`/events/${editId}`).then(({ event: ev }) => {
      $("title").value = ev.title;
      $("category").value = ev.category;
      $("description").value = ev.description;
      $("tags").value = ev.tags.join(", ");
      $("location").value = ev.location;
      $("startDate").value = toLocalInput(ev.startDate);
      $("endDate").value = toLocalInput(ev.endDate);
      $("capacity").value = ev.capacity;
    }).catch((err) => showError(err.message));
  }
  applyKind();
})();
