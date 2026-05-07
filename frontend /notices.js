function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}


function sanitize(str) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(str || ""));
    return d.innerHTML;
}

document.addEventListener("DOMContentLoaded", function () {
    const isDashboard = window.location.pathname.includes("dashboard.html");
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "select-role.html";
        return;
    }


    let role = 'student';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role;
    } catch(e) {}

    const isFacultyOrAdmin = (role === 'faculty' || role === 'admin');

    const container   = document.getElementById("eventsContainer");
    const searchInput = document.getElementById("searchInput");
    const catItems    = document.querySelectorAll(".categories ul li");
    const uploadBtn   = document.querySelector(".upload-icon");

    let allEvents      = [];
    let activeCategory = "all";


    if (role === "student" && uploadBtn) {
        uploadBtn.style.display = "none";
    }


    if (isDashboard) {
        const cat = document.querySelector(".categories");
        if (cat) cat.style.display = "none";
        if (uploadBtn) uploadBtn.style.display = "none";
    }

    async function fetchEvents(tabOverride) {
        try {
            let url;
            if (isDashboard) {
                if (role === 'student') {
                   
                    const tab = tabOverride || window._dashboardTab || 'bookmarks';
                    url = tab === 'registered'
                        ? "http://localhost:3000/api/events/registered"
                        : "http://localhost:3000/api/events/bookmarks";
                } else {
                    url = "http://localhost:3000/api/events/bookmarks";
                }
            } else {
                url = "http://localhost:3000/api/events";
            }

            const res  = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
            const data = await res.json();

            if (!Array.isArray(data.events)) {
                container.innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><h3>Failed to load events</h3></div>`;
                return;
            }

            allEvents = data.events;
            filterAndDisplay();

        } catch(err) {
            console.error("Fetch error:", err);
            container.innerHTML = `<div class="empty-state"><span class="icon">🔌</span><h3>Cannot connect to server</h3><p>Make sure the backend is running on port 3000</p></div>`;
        }
    }

    window._dashboardFetch = fetchEvents;

    function filterAndDisplay() {
        let filtered = [...allEvents];

        if (!isDashboard && searchInput) {
            const q = searchInput.value.toLowerCase();
            if (q) filtered = filtered.filter(e =>
                (e.title || '').toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q)
            );
        }

        if (!isDashboard && activeCategory !== 'all') {
            filtered = filtered.filter(e =>
                (e.category || '').toLowerCase() === activeCategory
            );
        }

        displayEvents(filtered);
    }

    function displayEvents(events) {
        container.innerHTML = '';

        if (events.length === 0) {
            if (isDashboard) {
                const tab = window._dashboardTab || 'bookmarks';
                let emptyMsg;
                if (role === 'student' && tab === 'registered') {
                    emptyMsg = `<div class="empty-state"><span class="icon">📝</span><h3>No registered events</h3><p style="color:rgba(255,255,255,.4)">Register for events from the Notices page!</p></div>`;
                } else if (role === 'student') {
                    emptyMsg = `<div class="empty-state"><span class="icon">⭐</span><h3>No bookmarks yet</h3><p style="color:rgba(255,255,255,.4)">Bookmark events from the Notices page!</p></div>`;
                } else {
                    emptyMsg = `<div class="empty-state"><span class="icon">⭐</span><h3>No bookmarks yet</h3><p style="color:rgba(255,255,255,.4)">Start bookmarking events from the Notices page!</p></div>`;
                }
                container.innerHTML = emptyMsg;
            } else {
                container.innerHTML = `<div class="empty-state"><span class="icon">🚀</span><h3>No events yet</h3></div>`;
            }
            return;
        }

        events.forEach(event => {
            const start = event.startDate ? new Date(event.startDate).toDateString() : '';
            const end   = event.endDate   ? new Date(event.endDate).toDateString()   : '';

            const card = document.createElement('div');
            card.className = 'event-card';

            const isBookmarked = event.isBookmarked === true;
            const isRead       = event.isRead === true;

            let isRegistered = false;
            if (event.isRegistered) {
                isRegistered = true;
            } else if (event.registrations && Array.isArray(event.registrations)) {
                let userId = '';
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.id;
                } catch(e) {}
                if (userId) {
                    isRegistered = event.registrations.some(r => {
                        const uid = r.user?._id || r.user;
                        return String(uid) === String(userId);
                    });
                }
            }

            
            const regCount = (event.registrations || []).length;
            let actionButtons = '';

          
            if (isRead) {
                actionButtons += `<button class="btn secondary read-btn read-active" data-read="true" title="Click to mark as unread">✓ Read</button>`;
            } else {
                actionButtons += `<button class="btn secondary read-btn" data-read="false">Mark as Read</button>`;
            }

            if (!isDashboard) {
                if (isBookmarked) {
                    actionButtons += `<button class="btn secondary bookmark-btn bookmark-active" data-bookmarked="true" title="Click to remove bookmark">⭐ Bookmarked</button>`;
                } else {
                    actionButtons += `<button class="btn secondary bookmark-btn" data-bookmarked="false">⭐ Bookmark</button>`;
                }
            } else {
                actionButtons += `<button class="btn secondary remove-bm-btn">❌ Remove Bookmark</button>`;
            }

            if (event.requiresRegistration) {
                if (isFacultyOrAdmin) {
                    actionButtons += `<button class="btn view-reg-btn">👥 Registrations (${regCount})</button>`;
                } else {
                    if (isRegistered) {
                        actionButtons += `<span class="registration-status">✅ Registered</span>`;
                    } else {
                        actionButtons += `<button class="btn register-btn">📝 Register</button>`;
                    }
                }
            }

            card.innerHTML = `
                ${event.image
                    ? `<div class="img-box"><img src="http://localhost:3000/uploads/${sanitize(event.image)}" alt="${sanitize(event.title)}"></div>`
                    : `<div class="img-box placeholder">No Image</div>`
                }
                <div class="event-content">
                    <div class="event-top">
                        <h3>${sanitize(event.title) || 'Untitled Event'}</h3>
                        <span class="badge">${sanitize(event.category) || 'General'}</span>
                    </div>
                    <p class="event-date">📅 <strong>${start}</strong>${end ? ' — ' + end : ''}</p>
                    <p class="event-desc">${sanitize(event.description) || 'No description provided.'}</p>
                    <div class="event-actions">
                        <button class="btn view-btn">👁️ View Details</button>
                        ${actionButtons}
                    </div>
                </div>`;

            if (isRead) card.style.opacity = '0.65';

            card.querySelector('.view-btn').addEventListener('click', () => {
                showDetailsModal(event, role);
            });

            const readBtn = card.querySelector('.read-btn');
            if (readBtn) {
                readBtn.addEventListener('click', async () => {
                    const currentlyRead = readBtn.dataset.read === 'true';
                    try {
                        const endpoint = currentlyRead
                            ? `http://localhost:3000/api/events/unmark-read/${event._id}`
                            : `http://localhost:3000/api/events/mark-read/${event._id}`;

                        const res = await fetch(endpoint, {
                            method: 'PATCH',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });

                        if (res.ok) {
                            if (currentlyRead) {
                                readBtn.textContent = 'Mark as Read';
                                readBtn.classList.remove('read-active');
                                readBtn.dataset.read = 'false';
                                card.style.opacity = '1';
                                event.isRead = false;
                                showToast('Marked as unread', 'info');
                            } else {
                                readBtn.textContent = '✓ Read';
                                readBtn.classList.add('read-active');
                                readBtn.dataset.read = 'true';
                                card.style.opacity = '0.65';
                                event.isRead = true;
                                showToast('Marked as read', 'info');
                            }
                        } else {
                            showToast('Failed to update read status', 'error');
                        }
                    } catch(e) {
                        showToast('Network error', 'error');
                    }
                });
            }

            const bmBtn = card.querySelector('.bookmark-btn');
            if (bmBtn) {
                bmBtn.addEventListener('click', async () => {
                    const currentlyBookmarked = bmBtn.dataset.bookmarked === 'true';
                    try {
                        const endpoint = currentlyBookmarked
                            ? `http://localhost:3000/api/events/remove-bookmark/${event._id}`
                            : `http://localhost:3000/api/events/bookmark/${event._id}`;

                        const res = await fetch(endpoint, {
                            method: 'PATCH',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });

                        if (res.ok) {
                            if (currentlyBookmarked) {
                                bmBtn.textContent = '⭐ Bookmark';
                                bmBtn.classList.remove('bookmark-active');
                                bmBtn.dataset.bookmarked = 'false';
                                event.isBookmarked = false;
                                showToast('Bookmark removed', 'info');
                            } else {
                                bmBtn.textContent = '⭐ Bookmarked';
                                bmBtn.classList.add('bookmark-active');
                                bmBtn.dataset.bookmarked = 'true';
                                event.isBookmarked = true;
                                showToast('Bookmarked!', 'success');
                            }
                        } else {
                            showToast('Failed to update bookmark', 'error');
                        }
                    } catch(e) {
                        showToast('Network error', 'error');
                    }
                });
            }

            const rmBmBtn = card.querySelector('.remove-bm-btn');
            if (rmBmBtn) {
                rmBmBtn.addEventListener('click', async () => {
                    try {
                        const res = await fetch(`http://localhost:3000/api/events/remove-bookmark/${event._id}`, {
                            method: 'PATCH',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (res.ok) {
                            card.remove();
                            showToast('Bookmark removed', 'info');
                        } else {
                            showToast('Failed to remove bookmark', 'error');
                        }
                    } catch(e) {
                        showToast('Network error', 'error');
                    }
                });
            }

            const regBtn = card.querySelector('.register-btn');
            if (regBtn) {
                regBtn.addEventListener('click', () => openRegistrationModal(event));
            }

            const viewRegBtn = card.querySelector('.view-reg-btn');
            if (viewRegBtn) {
                viewRegBtn.addEventListener('click', () => openRegistrationsModal(event));
            }

            container.appendChild(card);
        });
    }

    function openRegistrationModal(event) {
        let modal = document.getElementById("registerModal");
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'registerModal';
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem("user")); } catch(e) {}

        const fields = event.formFields || [];
        let formData = {};
        let fieldsHTML = '';

        fields.forEach(field => {
            let autoValue = '';
            let isAutoFilled = false;

            if (currentUser) {
                if (field.fieldName === 'email'      && currentUser.email)      { autoValue = currentUser.email;      isAutoFilled = true; }
                if (field.fieldName === 'phone'      && currentUser.phone)      { autoValue = currentUser.phone;      isAutoFilled = true; }
                if (field.fieldName === 'studentId'  && currentUser.studentId)  { autoValue = currentUser.studentId;  isAutoFilled = true; }
                if (field.fieldName === 'name'       && currentUser.name)       { autoValue = currentUser.name;       isAutoFilled = true; }
                if (field.fieldName === 'department' && currentUser.department) { autoValue = currentUser.department; isAutoFilled = true; }
                if (field.fieldName === 'year'       && currentUser.year)       { autoValue = currentUser.year;       isAutoFilled = true; }
            }

            formData[field.fieldName] = autoValue;

            const req   = field.required ? '<span class="required-star">*</span>' : '';
            const badge = isAutoFilled   ? '<span class="auto-fill-badge">✓ Auto-filled</span>' : '';
            const cls   = isAutoFilled   ? 'auto-filled' : '';

            fieldsHTML += `
                <div class="form-field-group">
                    <label>${sanitize(field.label || field.fieldName)}${req}${badge}</label>
                    <input
                        type="${field.type || 'text'}"
                        data-field="${field.fieldName}"
                        value="${sanitize(autoValue)}"
                        placeholder="${sanitize(field.label || field.fieldName)}"
                        class="${cls}"
                        ${field.required ? 'required' : ''}
                    >
                </div>
            `;
        });

        if (fields.length === 0) {
            fieldsHTML = `<div class="already-registered"><p>✅ No form needed — just confirm your registration!</p></div>`;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📝 Register for Event</h2>
                    <button class="modal-close" id="closeRegModal">&times;</button>
                </div>
                <div class="modal-event-info">
                    <h4>${sanitize(event.title)}</h4>
                    <p>📅 ${event.startDate ? new Date(event.startDate).toDateString() : 'Date TBD'}</p>
                </div>
                <div id="dynamicFormFields">${fieldsHTML}</div>
                <button class="modal-submit-btn" id="submitRegBtn">🎟️ Confirm Registration</button>
            </div>
        `;
        modal.style.display = 'flex';

        modal.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', e => {
                formData[e.target.dataset.field] = e.target.value;
            });
        });

        document.getElementById('closeRegModal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) modal.style.display = 'none';
        });

        document.getElementById('submitRegBtn').addEventListener('click', async () => {
            const inputs = modal.querySelectorAll('input[required]');
            let valid = true;
            inputs.forEach(inp => {
                if (!inp.value.trim()) { inp.style.borderColor = '#ef4444'; valid = false; }
                else inp.style.borderColor = '';
            });
            if (!valid) { showToast('Please fill all required fields', 'error'); return; }

            const btn = document.getElementById('submitRegBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Registering...';

            try {
                const res = await fetch(`http://localhost:3000/api/events/register/${event._id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ formData })
                });

                const data = await res.json();

                if (res.ok) {
                    modal.style.display = 'none';
                    showToast('🎉 Registered successfully!', 'success');
                    fetchEvents();
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                    btn.disabled = false;
                    btn.textContent = '🎟️ Confirm Registration';
                }
            } catch(err) {
                console.error("Registration error:", err);
                showToast('Network error. Please try again.', 'error');
                btn.disabled = false;
                btn.textContent = '🎟️ Confirm Registration';
            }
        });
    }

    // ─── REGISTRATIONS VIEWER MODAL (faculty/admin) ──────
    function openRegistrationsModal(event) {
        let modal = document.getElementById("registrationsViewModal");
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'registrationsViewModal';
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        const regs = event.registrations || [];

        let tableHTML = '';
        if (regs.length === 0) {
            tableHTML = `<div style="text-align:center;padding:32px;color:#94a3b8;font-size:15px;">📭 No students have registered yet.</div>`;
        } else {
            const rows = regs.map((r, i) => {
                const u = r.user || {};
                const name  = sanitize(u.name  || '—');
                const email = sanitize(u.email || '—');
                const sid   = sanitize(u.studentId  || '—');
                const dept  = sanitize(u.department || '—');
                const year  = sanitize(u.year  || '—');
                const phone = sanitize(u.phone || '—');

                // Extra form data
                let extraCols = '';
                if (r.formData && typeof r.formData === 'object') {
                    Object.entries(r.formData).forEach(([key, val]) => {
                        if (!['name','email','studentId','department','year','phone'].includes(key)) {
                            extraCols += `<td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${sanitize(String(val))}</td>`;
                        }
                    });
                }

                return `<tr>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#e2e8f0;font-weight:600;font-size:13px;">${i+1}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#e2e8f0;font-size:13px;">${name}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${email}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${sid}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${dept}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${year}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#cbd5e1;font-size:13px;">${phone}</td>
                    ${extraCols}
                </tr>`;
            }).join('');

            tableHTML = `
                <div style="overflow-x:auto;margin-top:8px;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr style="background:rgba(59,130,246,.12);">
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">#</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">NAME</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">EMAIL</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">STUDENT ID</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">DEPARTMENT</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">YEAR</th>
                                <th style="padding:10px 14px;text-align:left;color:#60a5fa;font-size:12px;letter-spacing:.05em;font-weight:700;">PHONE</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width:780px;width:95%;">
                <div class="modal-header">
                    <h2>👥 Registered Students</h2>
                    <button class="modal-close" id="closeRegsModal">&times;</button>
                </div>
                <div class="modal-event-info" style="margin-bottom:16px;">
                    <h4>${sanitize(event.title)}</h4>
                    <p>📅 ${event.startDate ? new Date(event.startDate).toDateString() : 'Date TBD'} &nbsp;|&nbsp; 🎓 <strong>${regs.length}</strong> student${regs.length !== 1 ? 's' : ''} registered</p>
                </div>
                ${tableHTML}
            </div>
        `;
        modal.style.display = 'flex';

        document.getElementById('closeRegsModal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    function showDetailsModal(event) {
        let modal = document.getElementById('detailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'detailsModal';
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }
        const start = event.startDate ? new Date(event.startDate).toDateString() : 'TBD';
        const end   = event.endDate   ? new Date(event.endDate).toDateString()   : '';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📋 Event Details</h2>
                    <button class="modal-close" id="closeDetailsModal">&times;</button>
                </div>
                ${event.image ? `<img src="http://localhost:3000/uploads/${sanitize(event.image)}" style="width:100%;border-radius:12px;margin-bottom:18px;max-height:220px;object-fit:cover;">` : ''}
                <div class="modal-event-info" style="margin-bottom:16px;">
                    <h4>${sanitize(event.title)}</h4>
                    <p>📅 ${start}${end ? ' — ' + end : ''} &nbsp;|&nbsp; 🏷️ ${sanitize(event.category) || 'General'}</p>
                </div>
                <p style="color:#374151;line-height:1.7;font-size:14.5px;">${sanitize(event.description) || 'No description.'}</p>
                ${event.requiresRegistration ? `<p style="margin-top:16px;font-size:13px;background:#fef3c7;padding:10px 14px;border-radius:8px;color:#92400e;font-weight:600;">⚠️ Registration required for this event</p>` : ''}
            </div>
        `;
        modal.style.display = 'flex';
        document.getElementById('closeDetailsModal').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    }

    if (searchInput) searchInput.addEventListener('input', filterAndDisplay);

    catItems.forEach(item => {
        item.addEventListener('click', function () {
            catItems.forEach(li => li.classList.remove('active'));
            this.classList.add('active');
            activeCategory = this.innerText.trim().toLowerCase();
            filterAndDisplay();
        });
    });

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => window.location.href = 'add-event.html');
    }

    fetchEvents();
});
