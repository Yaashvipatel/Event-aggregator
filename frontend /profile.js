var currentRole = 'student';
var isEditing   = false;
var currentUser = null;

function showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show ' + (type || 'success');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.className = 'toast'; }, 3500);
}

function setText(id, value)      { var el=document.getElementById(id); if(el) el.textContent=value||''; }
function setVal(id, value)       { var el=document.getElementById(id); if(el) el.value=value||''; }
function setSelect(id, value)    { var el=document.getElementById(id); if(el&&value) el.value=value; }
function setChecked(id, value)   { var el=document.getElementById(id); if(el) el.checked=(value!==false); }
function getVal(id)              { var el=document.getElementById(id); return el?el.value.trim():''; }
function getChecked(id)          { var el=document.getElementById(id); return el?el.checked:false; }
function sanitize(str)           { var d=document.createElement('div'); d.appendChild(document.createTextNode(str||'')); return d.innerHTML; }

async function loadProfile() {
    var token = localStorage.getItem('token');
    if (!token) { window.location.href = 'select-role.html'; return; }

    try {
        var res = await fetch('http://localhost:3000/api/users/me', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'select-role.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        var data = await res.json();
        var user = data.user || data;
        currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        applyRoleLayout(user.role || 'student');
        fillProfile(user);
        if (user.role === 'admin') { loadStats(); loadUsers(''); }

    } catch (err) {
        console.error('Profile load error:', err);
        try {
            var cached = JSON.parse(localStorage.getItem('user'));
            if (cached) {
                currentUser = cached;
                applyRoleLayout(cached.role || 'student');
                fillProfile(cached);
                showToast('Showing cached profile (offline)', 'warning');
                return;
            }
        } catch(e) {}
        showToast('Error loading profile. Check connection.', 'error');
    }
}

function applyRoleLayout(role) {
    currentRole = role;
    document.body.classList.remove('role-student','role-faculty','role-admin');
    document.body.classList.add('role-' + role);

    // Load admin users tab on show
    if (role === 'admin') {
        var usersTabBtn = document.querySelector('[onclick*="adm-users"]');
        if (usersTabBtn) {
            usersTabBtn.addEventListener('click', function() {
                loadUsers('');
            }, { once: true });
        }
    }
}

function fillProfile(user) {
    var role = user.role || 'student';

    // ── Header (shared) ──
    var initial  = user.name ? user.name.charAt(0).toUpperCase() : '?';
    var avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
        if (user.avatar) {
            avatarEl.style.backgroundImage   = 'url(' + user.avatar + ')';
            avatarEl.style.backgroundSize    = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.textContent = '';
        } else {
            avatarEl.textContent = initial;
            avatarEl.style.backgroundImage = '';
        }
    }

    setText('displayName',  user.name);
    setText('displayEmail', user.email);
    var idVal = user.studentId || user.facultyId || user.adminId || '';
    setText('displayId', idVal ? 'ID: ' + idVal : '');

    var roleBadge = document.querySelector('.role-badge');
    if (roleBadge) {
        roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleBadge.className = 'role-badge ' + role + '-badge';
    }

 
    var avatarInput = document.getElementById('avatarInput');
    if (avatarInput) avatarInput.onchange = handleAvatarUpload;


    if (role === 'student') {
        setVal('name', user.name);
        setVal('email', user.email);
        setVal('phone', user.phone);
        setVal('bio', user.bio);
        setVal('studentId', user.studentId);
        setSelect('department', user.department);
        setSelect('year', user.year);
        setSelect('semester', user.semester);
        setVal('section', user.section);
        if (user.interests)   renderTags('interestTags', user.interests,   'interest');
        if (user.clubsJoined) renderTags('clubTags',     user.clubsJoined, 'club');
        fillNotifPrefs('', user.notifPrefs);
    }

    if (role === 'faculty') {
        setVal('fac-name',  user.name);
        setVal('fac-email', user.email);
        setVal('fac-phone', user.phone);
        setVal('fac-bio',   user.bio);
        setVal('facultyId', user.facultyId);
        setSelect('designation',       user.designation);
        setSelect('facultyDepartment', user.facultyDepartment);
        setVal('officeLocation', user.officeLocation);
        if (user.subjectsHandled) renderTags('subjectTags', user.subjectsHandled, 'subject');
        renderClubsManaged(user.clubsManaged || [], false);
        fillNotifPrefs('fac-', user.notifPrefs);
    }

  
    if (role === 'admin') {
        setVal('adm-name',  user.name);
        setVal('adm-email', user.email);
        setVal('adm-phone', user.phone);
        setVal('adm-bio',   user.bio);
        setVal('adminId',         user.adminId);
        setVal('adminDepartment', user.adminDepartment);
        fillNotifPrefs('adm-', user.notifPrefs);
    }
}

function fillNotifPrefs(prefix, prefs) {
    if (!prefs) return;
    setChecked(prefix + 'notifAssignments', prefs.assignments);
    setChecked(prefix + 'notifExams',       prefs.exams);
    setChecked(prefix + 'notifNotices',     prefs.notices);
    setChecked(prefix + 'notifClubs',       prefs.clubs);
    setChecked(prefix + 'notifWorkshops',   prefs.workshops);
}

function switchTab(event, tabId) {
    var clicked = event.target;
    var section = clicked.closest('.role-section') || clicked.closest('.c1 > main');
    var allBtns = section ? section.querySelectorAll('.tab-btn') : document.querySelectorAll('.tab-btn');
    var allTabs = section ? section.querySelectorAll('.tab-content') : document.querySelectorAll('.tab-content');
    allBtns.forEach(function(b){ b.classList.remove('active'); });
    allTabs.forEach(function(c){ c.classList.remove('active'); });
    clicked.classList.add('active');
    var tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');

    if (tabId === 'adm-users') loadUsers('');
    if (tabId === 'adm-stats') loadStats();
}

function enableEdit() {
    isEditing = true;
    var selectors = 'input:not([type="email"]):not([type="password"]):not([type="file"]):not([type="checkbox"]), select, textarea';
    document.querySelectorAll(selectors).forEach(function(el) {
        if (el.id !== 'email' && el.id !== 'fac-email' && el.id !== 'adm-email') el.disabled = false;
    });
    showHiddenActions(true);
    document.querySelectorAll('.tag-add-row').forEach(function(r){ r.classList.remove('hidden'); });
    var cmEdit = document.getElementById('clubsManagedEdit');
    var cmView = document.getElementById('clubsManagedView');
    if (cmEdit) cmEdit.classList.remove('hidden');
    if (cmView) cmView.style.display = 'none';
    showToast('Edit mode enabled — make your changes!', 'info');
}

function cancelEdit() {
    isEditing = false;
    fillProfile(currentUser);
    document.querySelectorAll(
        'input:not([type="email"]):not([type="file"]):not([type="checkbox"]), select, textarea'
    ).forEach(function(el){ el.disabled = true; });
    showHiddenActions(false);
    document.querySelectorAll('.tag-add-row').forEach(function(r){ r.classList.add('hidden'); });
    var cmEdit = document.getElementById('clubsManagedEdit');
    var cmView = document.getElementById('clubsManagedView');
    if (cmEdit) cmEdit.classList.add('hidden');
    if (cmView) { cmView.style.display = ''; renderClubsManaged(currentUser.clubsManaged||[], false); }
}

function showHiddenActions(show) {
    var ids = ['personalActions','academicActions','clubActions',
               'facPersonalActions','facProfessionalActions','facClubActions',
               'admPersonalActions'];
    ids.forEach(function(id){
        var el = document.getElementById(id);
        if (el) { if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); }
    });
}

async function saveProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    var token = localStorage.getItem('token');
    var updates = {};
    var role = currentRole;

    if (role === 'student') {
        updates = {
            name: getVal('name'), phone: getVal('phone'), bio: getVal('bio'),
            studentId: getVal('studentId'),
            department: getVal('department'), year: getVal('year'),
            semester: getVal('semester'), section: getVal('section'),
            interests:   currentUser ? (currentUser.interests || []) : [],
            clubsJoined: currentUser ? (currentUser.clubsJoined || []) : []
        };
    } else if (role === 'faculty') {
        updates = {
            name: getVal('fac-name'), phone: getVal('fac-phone'), bio: getVal('fac-bio'),
            facultyId: getVal('facultyId'),
            designation: getVal('designation'), facultyDepartment: getVal('facultyDepartment'),
            officeLocation: getVal('officeLocation'),
            subjectsHandled: currentUser ? (currentUser.subjectsHandled || []) : [],
            clubsManaged:    currentUser ? (currentUser.clubsManaged || []) : []
        };
    } else if (role === 'admin') {
        updates = {
            name: getVal('adm-name'), phone: getVal('adm-phone'), bio: getVal('adm-bio'),
            adminId: getVal('adminId'), adminDepartment: getVal('adminDepartment')
        };
    }

    try {
        var res = await fetch('http://localhost:3000/api/users/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(updates)
        });
        var data = await res.json();
        if (res.ok) {
            if (data.user) { currentUser = data.user; localStorage.setItem('user', JSON.stringify(data.user)); }
            isEditing = false;
            cancelEdit();
            showToast('✅ Profile saved successfully!', 'success');
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (err) {
        if (currentUser) {
            Object.assign(currentUser, updates);
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
        isEditing = false;
        cancelEdit();
        showToast('Saved locally (offline mode)', 'warning');
    }
}

async function saveNotifPrefs() {
    var token  = localStorage.getItem('token');
    var prefix = currentRole === 'student' ? '' : (currentRole === 'faculty' ? 'fac-' : 'adm-');
    var prefs  = {
        notifPrefs: {
            assignments: getChecked(prefix + 'notifAssignments'),
            exams:       getChecked(prefix + 'notifExams'),
            notices:     getChecked(prefix + 'notifNotices'),
            clubs:       getChecked(prefix + 'notifClubs'),
            workshops:   getChecked(prefix + 'notifWorkshops')
        }
    };
    try {
        var res  = await fetch('http://localhost:3000/api/users/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(prefs)
        });
        var data = await res.json();
        if (res.ok) {
            if (data.user) currentUser = data.user;
            showToast('✅ Notification preferences saved!', 'success');
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (err) {
        if (currentUser) { currentUser.notifPrefs = prefs.notifPrefs; localStorage.setItem('user', JSON.stringify(currentUser)); }
        showToast('Saved locally (offline mode)', 'warning');
    }
}

function renderTags(containerId, items, type) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = '';
    if (!items || items.length === 0) {
        box.innerHTML = '<span style="color:#94a3b8;font-size:13px;">None added yet.</span>';
        return;
    }
    items.forEach(function(item, i) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = sanitize(item) +
            '<button class="tag-remove" type="button" onclick="removeTag(\'' + type + '\',' + i + ')">×</button>';
        box.appendChild(tag);
    });
}

function removeTag(type, index) {
    if (!isEditing || !currentUser) return;
    if (type === 'interest')  { currentUser.interests.splice(index, 1);      renderTags('interestTags', currentUser.interests, 'interest'); }
    if (type === 'club')      { currentUser.clubsJoined.splice(index, 1);    renderTags('clubTags', currentUser.clubsJoined, 'club'); }
    if (type === 'subject')   { currentUser.subjectsHandled.splice(index,1); renderTags('subjectTags', currentUser.subjectsHandled, 'subject'); }
}

function addInterest() {
    var val = getVal('newInterest');
    if (!val || !currentUser) return;
    if (!currentUser.interests) currentUser.interests = [];
    currentUser.interests.push(val);
    renderTags('interestTags', currentUser.interests, 'interest');
    document.getElementById('newInterest').value = '';
}

function addClub() {
    var val = getVal('newClub');
    if (!val || !currentUser) return;
    if (!currentUser.clubsJoined) currentUser.clubsJoined = [];
    currentUser.clubsJoined.push(val);
    renderTags('clubTags', currentUser.clubsJoined, 'club');
    document.getElementById('newClub').value = '';
}

function addSubject() {
    var val = getVal('newSubject');
    if (!val || !currentUser) return;
    if (!currentUser.subjectsHandled) currentUser.subjectsHandled = [];
    currentUser.subjectsHandled.push(val);
    renderTags('subjectTags', currentUser.subjectsHandled, 'subject');
    document.getElementById('newSubject').value = '';
}

function renderClubsManaged(clubs, editable) {
    var viewDiv = document.getElementById('clubsManagedView');
    var editBody = document.getElementById('clubsManagedBody');

    if (!clubs || clubs.length === 0) {
        if (viewDiv) viewDiv.innerHTML = '<p style="color:#94a3b8;font-size:13px;">No clubs managed yet.</p>';
        if (editBody) editBody.innerHTML = '<tr><td colspan="3" style="color:#94a3b8;text-align:center;padding:12px;">No clubs added.</td></tr>';
        return;
    }

    if (viewDiv) {
        viewDiv.innerHTML = '<table class="clubs-managed-table"><thead><tr><th>Club Name</th><th>Role</th></tr></thead><tbody>' +
            clubs.map(function(c){ return '<tr><td>' + sanitize(c.clubName||'') + '</td><td>' + sanitize(c.role||'') + '</td></tr>'; }).join('') +
            '</tbody></table>';
    }

    if (editBody) {
        editBody.innerHTML = clubs.map(function(c, i){
            return '<tr><td>' + sanitize(c.clubName||'') + '</td><td>' + sanitize(c.role||'') + '</td>' +
                '<td><button class="btn secondary small" type="button" onclick="removeManagedClub(' + i + ')">Remove</button></td></tr>';
        }).join('');
    }
}

function addManagedClub() {
    var name = getVal('newManagedClub');
    var role = getVal('newManagedRole');
    if (!name || !currentUser) return;
    if (!currentUser.clubsManaged) currentUser.clubsManaged = [];
    currentUser.clubsManaged.push({ clubName: name, role: role });
    renderClubsManaged(currentUser.clubsManaged, true);
    document.getElementById('newManagedClub').value = '';
}

function removeManagedClub(index) {
    if (!currentUser || !currentUser.clubsManaged) return;
    currentUser.clubsManaged.splice(index, 1);
    renderClubsManaged(currentUser.clubsManaged, true);
}

function handleAvatarUpload(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.style.backgroundImage    = 'url(' + e.target.result + ')';
            avatar.style.backgroundSize     = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.textContent = '';
        }
        if (currentUser) {
            currentUser.avatar = e.target.result;
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
        showToast('Profile photo updated!', 'success');
    };
    reader.readAsDataURL(file);
}

async function loadStats() {
    var token = localStorage.getItem('token');
    try {
        var res  = await fetch('http://localhost:3000/api/users/stats', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (!res.ok) return;
        var m = { statStudents: data.students, statFaculty: data.faculty, statAdmins: data.admins, statTotal: data.total };
        Object.keys(m).forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=m[id]||0; });
    } catch (err) { console.error('loadStats error:', err); }
}

async function loadUsers(roleFilter) {
    var token = localStorage.getItem('token');
    var tbody = document.getElementById('usersBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">Loading...</td></tr>';
    try {
        var url  = 'http://localhost:3000/api/users/all' + (roleFilter ? '?role=' + roleFilter : '');
        var res  = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (!res.ok) throw new Error(data.message);
        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No users found</td></tr>';
            return;
        }
        tbody.innerHTML = data.users.map(function(u){
            var idVal = u.studentId || u.facultyId || u.adminId || '—';
            return '<tr>' +
                '<td>' + sanitize(u.name) + '<br><small style="color:#94a3b8">' + sanitize(u.email) + '</small></td>' +
                '<td>' + sanitize(idVal) + '</td>' +
                '<td><span class="role-badge ' + u.role + '-badge">' + u.role + '</span></td>' +
                '<td><span style="color:#10b981">✔ Active</span></td>' +
                '<td><button class="btn secondary small" onclick="openRoleModal(\'' + u._id + '\',\'' + u.role + '\')">Change Role</button></td>' +
            '</tr>';
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:20px;">Error: ' + err.message + '</td></tr>';
    }
}

function filterUsers(btn, role) {
    document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    loadUsers(role);
}

function openRoleModal(userId, userRole) {
    var modal = document.getElementById('roleModal');
    if (!modal) return;
    document.getElementById('modalUserId').value = userId;
    var sel = document.getElementById('modalRole');
    if (sel) sel.value = userRole;
    modal.style.display = 'flex';
}
function closeModal() {
    var modal = document.getElementById('roleModal');
    if (modal) modal.style.display = 'none';
}
async function confirmRoleChange() {
    var userId = document.getElementById('modalUserId').value;
    var role   = document.getElementById('modalRole').value;
    var token  = localStorage.getItem('token');
    try {
        var res  = await fetch('http://localhost:3000/api/users/' + userId + '/role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ role: role })
        });
        var data = await res.json();
        if (res.ok) { showToast('Role updated!', 'success'); closeModal(); loadUsers(''); }
        else showToast(data.message || 'Update failed', 'error');
    } catch (err) { showToast('Cannot connect to server', 'error'); }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'select-role.html';
}

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
});