document.addEventListener("DOMContentLoaded", async function () {
    const me = App.requireLogin();
    if (!me) return;
    App.mountNav("home");

    const { esc } = App;
    const container = document.getElementById("eventsContainer");
    const searchInput = document.getElementById("searchInput");
    const timeFilter = document.getElementById("timeFilter");
    const categoryItems = document.querySelectorAll("#categoryList li");
    const isStaff = me.role === "organizer" || me.role === "admin";
    if (isStaff) document.getElementById("addBtn").style.display = "";

    const state = { tab: "events", category: "all", events: [], notices: [], recs: [], recSource: "", loaded: false };
    const readKey = `ea_read_${me.id}`;
    const readSet = new Set(JSON.parse(localStorage.getItem(readKey) || "[]"));
    const saveRead = () => localStorage.setItem(readKey, JSON.stringify([...readSet]));
    const canManage = (ev) => me.role === "admin" || ev.organizer === me.id;
    let openEventId = null;

    // ---------- data loading ----------
    async function load() {
        const q = encodeURIComponent(searchInput.value.trim());
        const cat = state.category;
        container.innerHTML = '<p class="muted">Loading...</p>';
        try {
            if (state.tab === "events") {
                const d = await App.api(`/events?search=${q}&category=${cat}&filter=${timeFilter.value}&limit=50`);
                state.events = d.events;
            } else if (state.tab === "notices") {
                state.notices = await App.api(`/notices?search=${q}&category=${cat}`);
            } else {
                const d = await App.api("/recommendations");
                state.recs = d.recommendations;
                state.recSource = d.source;
            }
            state.loaded = true;
            render();
        } catch (err) {
            container.innerHTML = `<p class="error">${esc(err.message)}</p>`;
        }
    }

    // ---------- rendering ----------
    const badge = (c) => `<span class="badge ${esc(c)}">${esc(App.CATEGORIES[c] || c)}</span>`;

    function spotsText(ev) {
        if (ev.capacity === 0) return `${ev.attendeeCount} going`;
        return ev.spotsLeft === 0 ? `${ev.attendeeCount} / ${ev.capacity} - FULL` : `${ev.attendeeCount} / ${ev.capacity} going`;
    }

    function rsvpButton(ev) {
        if (ev.status === "past") return "";
        if (ev.isAttending) return `<button class="btn danger" data-action="cancel" data-id="${ev.id}">Cancel RSVP</button>`;
        if (ev.spotsLeft === 0) return `<button class="btn secondary" disabled>Full</button>`;
        return `<button class="btn green" data-action="rsvp" data-id="${ev.id}">RSVP</button>`;
    }

    function eventCard(ev) {
        const img = ev.images[0] ? `<img class="banner" src="${esc(ev.images[0])}" alt="">` : "";
        const rec = ev.reason === "match"
            ? `<p class="rec-why">Recommended${ev.matchedTerms.length ? " because you like: " + ev.matchedTerms.map(esc).join(", ") : ""} <span class="score">${Math.round(ev.score * 100)}% match</span></p>`
            : ev.reason === "popular" ? `<p class="rec-why">Popular on campus</p>` : "";
        const manage = canManage(ev)
            ? `<a class="btn secondary" href="add-event.html?edit=${ev.id}">Edit</a><button class="btn danger" data-action="delete" data-id="${ev.id}">Delete</button>` : "";
        return `<div class="event-card" data-id="${ev.id}">
            ${img}
            <div class="event-top"><h3>${esc(ev.title)}</h3>${badge(ev.category)}</div>
            ${rec}
            <p class="event-date">${esc(App.fmtRange(ev.startDate, ev.endDate))} &middot; ${esc(ev.location)}</p>
            <p class="event-desc">${esc(ev.description.length > 180 ? ev.description.slice(0, 180) + "..." : ev.description)}</p>
            <p class="event-by">Posted by : ${esc(ev.organizerName)} &middot; <span class="count" data-count="${ev.id}">${esc(spotsText(ev))}</span>
              ${ev.status === "ongoing" ? '<span class="pill live">LIVE NOW</span>' : ""}${ev.status === "past" ? '<span class="pill past">ended</span>' : ""}
              ${ev.isAttending ? '<span class="pill going">registered</span>' : ""}</p>
            <div class="event-actions">
                <button class="btn" data-action="view" data-id="${ev.id}">View Details</button>
                ${rsvpButton(ev)}${manage}
            </div></div>`;
    }

    function noticeCard(n) {
        const read = readSet.has(n.id);
        const del = me.role === "admin" || n.author === me.id
            ? `<button class="btn danger" data-action="delnotice" data-id="${n.id}">Delete</button>` : "";
        return `<div class="event-card ${read ? "is-read" : ""}" data-nid="${n.id}">
            <div class="event-top"><h3>${esc(n.title)}</h3>${badge(n.category)}</div>
            <p class="event-date">${esc(App.fmtDate(n.createdAt))}</p>
            <p class="event-desc">${esc(n.description)}</p>
            <p class="event-by">Posted by : ${esc(n.postedBy)}</p>
            <div class="event-actions">
                <button class="btn secondary" data-action="read" data-id="${n.id}" ${read ? "disabled" : ""}>${read ? "Read" : "Mark as read"}</button>${del}
            </div></div>`;
    }

    function render() {
        let html = "";
        if (state.tab === "events") {
            html = state.events.length ? state.events.map(eventCard).join("") : '<p class="muted">No events found.</p>';
        } else if (state.tab === "notices") {
            html = state.notices.length ? state.notices.map(noticeCard).join("") : '<p class="muted">No notices found.</p>';
        } else {
            const note = state.recSource === "popular"
                ? "Add interests in your Profile (or register for events) to get personalised picks. Showing popular events for now."
                : state.recSource === "fallback"
                    ? "Recommendation service is offline - showing basic keyword matches."
                    : "Ranked for you by TF-IDF + cosine similarity on your interests and event history.";
            html = `<p class="muted rec-note">${esc(note)}</p>` + (state.recs.length ? state.recs.map(eventCard).join("") : '<p class="muted">No upcoming events to recommend.</p>');
        }
        container.innerHTML = html;
        if (openEventId) refreshModal();
    }

    // ---------- modal ----------
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    const findEvent = (id) => state.events.find((e) => e.id === id) || state.recs.find((e) => e.id === id);

    function refreshModal() {
        const ev = findEvent(openEventId);
        if (!ev) { closeModal(); return; }
        const imgs = ev.images.map((s) => `<img src="${esc(s)}" alt="">`).join("");
        modalBody.innerHTML = `
            <div class="event-top"><h2>${esc(ev.title)}</h2>${badge(ev.category)}</div>
            ${imgs ? `<div class="gallery">${imgs}</div>` : ""}
            <p class="event-date"><strong>When:</strong> ${esc(App.fmtRange(ev.startDate, ev.endDate))}</p>
            <p class="event-date"><strong>Where:</strong> ${esc(ev.location)}</p>
            <p class="event-date"><strong>Organizer:</strong> ${esc(ev.organizerName)}</p>
            <p class="event-date"><strong>Attendance:</strong> <span data-count="${ev.id}">${esc(spotsText(ev))}</span></p>
            <p class="event-desc full">${esc(ev.description)}</p>
            ${ev.tags.length ? `<p>${ev.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(" ")}</p>` : ""}
            <div class="event-actions">${rsvpButton(ev)}</div>`;
    }
    function openModal(id) { openEventId = id; refreshModal(); modal.hidden = false; }
    function closeModal() { openEventId = null; modal.hidden = true; }
    document.getElementById("modalClose").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // ---------- actions (event delegation for cards + modal) ----------
    function applyUpdated(ev) {
        for (const list of [state.events, state.recs]) {
            const i = list.findIndex((x) => x.id === ev.id);
            if (i >= 0) list[i] = { ...list[i], ...ev };
        }
    }

    async function onClick(e) {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const { action, id } = btn.dataset;
        try {
            if (action === "view") return openModal(id);
            if (action === "rsvp" || action === "cancel") {
                const d = await App.api(`/events/${id}/rsvp`, { method: action === "rsvp" ? "POST" : "DELETE" });
                applyUpdated(d.event);
                App.toast(action === "rsvp" ? `You're registered for "${d.event.title}"` : "Registration cancelled", "success");
                return render();
            }
            if (action === "delete") {
                if (!confirm("Delete this event for everyone?")) return;
                await App.api(`/events/${id}`, { method: "DELETE" });
                return; // the live event:deleted broadcast updates the UI
            }
            if (action === "delnotice") {
                if (!confirm("Delete this notice?")) return;
                await App.api(`/notices/${id}`, { method: "DELETE" });
                return;
            }
            if (action === "read") { readSet.add(id); saveRead(); return render(); }
        } catch (err) { App.toast(err.message, "error"); }
    }
    container.addEventListener("click", onClick);
    modalBody.addEventListener("click", onClick);

    // ---------- filters ----------
    let debounce;
    searchInput.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(load, 250); });
    timeFilter.addEventListener("change", load);
    categoryItems.forEach((item) => item.addEventListener("click", function () {
        categoryItems.forEach((li) => li.classList.remove("active"));
        this.classList.add("active");
        state.category = this.dataset.category;
        load();
    }));
    document.querySelectorAll("#tabs .tab").forEach((t) => t.addEventListener("click", function () {
        document.querySelectorAll("#tabs .tab").forEach((x) => x.classList.remove("active"));
        this.classList.add("active");
        state.tab = this.dataset.tab;
        timeFilter.style.display = state.tab === "events" ? "" : "none";
        searchInput.style.display = state.tab === "foryou" ? "none" : "";
        load();
    }));

    // ---------- notification bell ----------
    const bellBtn = document.getElementById("bellBtn");
    const bellPanel = document.getElementById("bellPanel");
    const bellCount = document.getElementById("bellCount");
    const bellList = document.getElementById("bellList");
    let unread = 0;
    const feed = [];
    const ICON = { reminder: "\u23F0", rsvp: "\uD83C\uDF9F\uFE0F", recommendation: "\u2728", update: "\u270F\uFE0F", cancelled: "\u274C", role: "\uD83D\uDD11", notice: "\uD83D\uDCE2", event: "\uD83C\uDD95" };
    function pushFeed(item) {
        feed.unshift(item); feed.length = Math.min(feed.length, 20);
        unread++; bellCount.textContent = unread; bellCount.hidden = false;
        bellList.innerHTML = feed.map((n) => `<div class="bell-item"><span>${ICON[n.type] || "\uD83D\uDD14"}</span><div><strong>${esc(n.title)}</strong><br>${esc(n.message)}<br><small>${esc(new Date(n.at).toLocaleTimeString())}</small></div></div>`).join("");
    }
    bellBtn.addEventListener("click", () => { bellPanel.hidden = !bellPanel.hidden; unread = 0; bellCount.hidden = true; });
    document.getElementById("bellClear").addEventListener("click", (e) => { e.preventDefault(); feed.length = 0; bellList.innerHTML = '<p class="muted pad">Cleared.</p>'; });
    document.addEventListener("click", (e) => { if (!e.target.closest(".bell-wrap")) bellPanel.hidden = true; });

    // ---------- real-time ----------
    const passesFilters = (ev) => {
        if (state.category !== "all" && ev.category !== state.category) return false;
        const q = searchInput.value.trim().toLowerCase();
        if (q && ![ev.title, ev.description, ev.location, ev.organizerName, ...ev.tags].join(" ").toLowerCase().includes(q)) return false;
        if (timeFilter.value === "upcoming" && ev.status === "past") return false;
        if (timeFilter.value === "past" && ev.status !== "past") return false;
        return true;
    };
    const flash = (id) => document.querySelectorAll(`[data-count="${id}"]`).forEach((n) => { n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash"); });

    const socket = App.connectLive({
        connect: () => { document.getElementById("liveDot").className = "dot on"; document.getElementById("liveText").textContent = "Live"; },
        disconnect: () => { document.getElementById("liveDot").className = "dot off"; document.getElementById("liveText").textContent = "Reconnecting..."; },
        presence: (p) => { document.getElementById("liveText").textContent = `Live - ${p.online} online`; },
        notification: (n) => { pushFeed(n); App.toast(n.message, n.type === "cancelled" ? "error" : "info", n.title); },

        "event:created": (ev) => {
            if (state.tab === "events" && passesFilters(ev)) {
                state.events.push(ev);
                state.events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                render();
            }
            if (ev.organizer !== me.id) { pushFeed({ type: "event", title: "New event", message: ev.title, at: new Date().toISOString() }); App.toast(ev.title, "info", "New event posted"); }
        },
        "event:updated": (ev) => { applyUpdated(ev); render(); },
        "event:deleted": ({ id }) => {
            state.events = state.events.filter((e) => e.id !== id);
            state.recs = state.recs.filter((e) => e.id !== id);
            render();
        },
        "event:attendance": ({ id, attendeeCount, spotsLeft }) => {
            for (const list of [state.events, state.recs]) {
                const ev = list.find((x) => x.id === id);
                if (ev) { ev.attendeeCount = attendeeCount; ev.spotsLeft = spotsLeft; }
            }
            render();
            flash(id);
        },
        "notice:created": (n) => {
            pushFeed({ type: "notice", title: "New notice", message: n.title, at: new Date().toISOString() });
            if (n.author !== me.id) App.toast(n.title, "info", "New notice");
            if (state.tab === "notices" && (state.category === "all" || state.category === n.category)) { state.notices.unshift(n); render(); }
        },
        "notice:deleted": ({ id }) => { state.notices = state.notices.filter((n) => n.id !== id); render(); },
        "user:role": async () => {
            const d = await App.api("/auth/me");
            App.saveUser(d.user);
            App.toast("Your permissions changed - reloading...", "info");
            setTimeout(() => location.reload(), 1500);
        },
    });

    // The server handles registrations atomically, so a rejected RSVP simply shows a toast.
    window.addEventListener("beforeunload", () => socket && socket.close());
    load();
});
